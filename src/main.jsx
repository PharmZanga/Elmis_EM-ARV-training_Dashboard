import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { dashboardData } from "./dashboardData.js";
import "./styles.css";

const { participants, reportingRows, timelinessRows } = dashboardData;

function App() {
  const periods = useMemo(() => sortPeriods(unique(reportingRows.map((row) => row.period))), []);
  const programs = useMemo(() => unique(reportingRows.map((row) => row.program)).sort(), []);
  const provinces = useMemo(() => unique(reportingRows.map((row) => row.province)).sort(), []);
  const defaultPeriod = periods.includes("February 2026") ? "February 2026" : periods.at(-1) || "February 2026";

  const [activePage, setActivePage] = useState("kpis");
  const [selectedPeriod, setSelectedPeriod] = useState(defaultPeriod);
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("All");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  const districts = useMemo(() => {
    return unique(
      reportingRows
        .filter((row) => selectedProvince === "All" || row.province === selectedProvince)
        .map((row) => row.district)
    ).sort();
  }, [selectedProvince]);

  const filteredReporting = useMemo(() => {
    return reportingRows.filter((row) => matchesFilters(row, selectedPeriod, selectedProgram, selectedProvince, selectedDistrict));
  }, [selectedPeriod, selectedProgram, selectedProvince, selectedDistrict]);

  const filteredTimeliness = useMemo(() => {
    return timelinessRows.filter((row) => matchesFilters(row, selectedPeriod, selectedProgram, selectedProvince, selectedDistrict));
  }, [selectedPeriod, selectedProgram, selectedProvince, selectedDistrict]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((person) => {
      return (
        (selectedProvince === "All" || person.province === selectedProvince) &&
        (selectedDistrict === "All" || person.district === selectedDistrict)
      );
    });
  }, [selectedProvince, selectedDistrict]);

  const totals = useMemo(() => getTotals(filteredReporting, filteredTimeliness, filteredParticipants), [filteredReporting, filteredTimeliness, filteredParticipants]);
  const statusRows = useMemo(() => facilityRows(filteredReporting, filteredTimeliness), [filteredReporting, filteredTimeliness]);
  const districtBars = useMemo(() => districtPerformance(filteredReporting), [filteredReporting]);
  const submissionTrend = useMemo(() => reportSubmissionTrend(filteredReporting), [filteredReporting]);

  return (
    <main>
      <header className="masthead">
        <div className="brand-row">
          <div className="brand-side">
            <div className="crest"><img src="./zambia-coat-of-arms.svg" alt="Zambia Coat of Arms" /></div>
            <div>
              <span className="eyebrow">Ministry of Health Zambia</span>
              <h1>eLMIS EM and ARV Training Dashboard</h1>
            </div>
          </div>
          <nav className="tabs" aria-label="Dashboard pages">
            <button className={activePage === "kpis" ? "active" : ""} onClick={() => setActivePage("kpis")}>Facility KPIs</button>
            <button className={activePage === "training" ? "active" : ""} onClick={() => setActivePage("training")}>Training Linkage</button>
          </nav>
        </div>
      </header>

      <section className="page-shell">
        <aside className="filters">
          <FilterGroup title="Period" items={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />
          <FilterGroup title="Program" items={["All", ...programs]} selected={selectedProgram} onSelect={setSelectedProgram} />
          <FilterGroup title="Province" items={["All", ...provinces]} selected={selectedProvince} onSelect={setSelectedProvince} />
          <FilterGroup title="District" items={["All", ...districts]} selected={selectedDistrict} onSelect={setSelectedDistrict} />
        </aside>

        <section className="content">
          <div className="context-strip">
            <span>{selectedPeriod}</span>
            <span>{selectedProgram}</span>
            <span>{selectedProvince === "All" ? "National" : selectedProvince}</span>
            <span>{selectedDistrict === "All" ? "All Districts" : selectedDistrict}</span>
          </div>
          {activePage === "kpis" ? (
            <KpiPage totals={totals} statusRows={statusRows} districtBars={districtBars} submissionTrend={submissionTrend} />
          ) : (
            <TrainingPage totals={totals} participants={filteredParticipants} facilityKpis={statusRows} />
          )}
        </section>
      </section>
    </main>
  );
}

function KpiPage({ totals, statusRows, districtBars, submissionTrend }) {
  return (
    <>
      <KpiGrid items={[
        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],
        ["Reports Received", totals.reporting],
        ["Expected Reports", totals.expected],
        ["Timeliness", `${totals.timeliness.toFixed(1)}%`],
        ["Districts", totals.districts],
      ]} />
      <section className="grid three">
        <Panel title="Reporting Rate by Facility"><DataTable rows={statusRows} columns={["district", "facility", "program", "reportingRate"]} total={`${totals.reportingRate.toFixed(1)}%`} /></Panel>
        <Panel title="Reporting Timeliness"><DataTable rows={statusRows} columns={["district", "program", "timeliness", "status"]} total={`${totals.timeliness.toFixed(1)}%`} /></Panel>
        <Panel title="Reporting Status"><DataTable rows={statusRows} columns={["province", "district", "facility", "status"]} /></Panel>
        <Panel title="Reporting vs Non-Reporting"><Pie reporting={totals.reporting} nonReporting={totals.nonReporting} /></Panel>
        <Panel title="Report Submission Distribution"><LineChart values={submissionTrend} /></Panel>
        <Panel title="Reporting Rate by District"><BarChart values={districtBars.slice(0, 10)} max={100} suffix="%" /></Panel>
      </section>
    </>
  );
}

function TrainingPage({ totals, participants, facilityKpis }) {
  const experts = participants.filter((person) => person.role === "Expert");
  const superusers = participants.filter((person) => person.role === "Superuser");
  const users = participants.filter((person) => person.role === "User");
  const professionCounts = countBy(participants, "profession");
  const facilityTraining = linkTrainingToFacilities(facilityKpis, participants);

  return (
    <>
      <KpiGrid items={[
        ["Issues Resolved", totals.issuesResolved],
        ["Superusers Trained", totals.superusers],
        ["Experts Trained", totals.experts],
        ["Users Trained", totals.users],
        ["Training Districts", totals.trainingDistricts],
      ]} />
      <section className="grid training-grid">
        <div className="stack">
          <Panel title="List of Experts"><PeopleTable rows={experts} /></Panel>
          <Panel title="List of Superusers"><PeopleTable rows={superusers} /></Panel>
          <Panel title="List of Users"><PeopleTable rows={users} /></Panel>
        </div>
        <div className="stack">
          <Panel title="Participant Professions by Province"><StackedBar counts={professionCounts} /></Panel>
          <Panel title="Ratio of Professions"><Donut counts={professionCounts} /></Panel>
          <Panel title="Training Connected to Facility KPIs"><DataTable rows={facilityTraining} columns={["district", "facility", "trained", "reportingRate", "timeliness"]} /></Panel>
        </div>
      </section>
    </>
  );
}

function KpiGrid({ items }) {
  return <section className="kpi-grid">{items.map(([label, value]) => <article className="kpi" key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>;
}

function Panel({ title, children }) {
  return <article className="panel"><h2>{title}</h2>{children}</article>;
}

function FilterGroup({ title, items, selected, onSelect }) {
  return (
    <section className="filter-card">
      <h3>{title}</h3>
      <div>{items.map((item) => <button key={item} onClick={() => onSelect(item)} className={selected === item ? "checked" : ""}><span />{item}</button>)}</div>
    </section>
  );
}

function DataTable({ rows, columns, total }) {
  const visibleRows = rows.slice(0, 250);
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{labelize(column)}</th>)}</tr></thead>
        <tbody>{visibleRows.map((row, index) => <tr key={`${row.facility || row.firstName}-${index}`}>{columns.map((column) => <td key={column}>{formatCell(row[column], column)}</td>)}</tr>)}</tbody>
        {total && <tfoot><tr><td colSpan={columns.length - 1}>Total</td><td>{total}</td></tr></tfoot>}
      </table>
      {rows.length > visibleRows.length && <p className="table-note">Showing first {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} records</p>}
    </div>
  );
}

function PeopleTable({ rows }) {
  return <DataTable rows={rows} columns={["district", "facility", "firstName", "lastName", "phone"]} />;
}

function Pie({ reporting, nonReporting }) {
  const total = reporting + nonReporting;
  const reportingPercent = total ? (reporting / total) * 100 : 0;
  return (
    <div className="pie-card">
      <div className="solid-pie" style={{ "--reporting": `${reportingPercent}%` }} />
      <div className="legend">
        <b>Reporting Status</b>
        <span><i style={{ background: "#147a46" }} />REPORTING {reporting.toLocaleString()}</span>
        <span><i style={{ background: "#b42318" }} />NON_REPORTING {nonReporting.toLocaleString()}</span>
      </div>
    </div>
  );
}

function LineChart({ values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  const points = values.map((item, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${96 - (item.value / max) * 88}`).join(" ");
  return (
    <div className="line-wrap">
      <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} />
      </svg>
      <div className="chart-axis">{values.slice(0, 6).map((item) => <span key={item.label}>{item.label}</span>)}</div>
    </div>
  );
}

function BarChart({ values, max, suffix = "" }) {
  return <div className="bar-chart">{values.map((item) => <div className="bar-item" key={item.label}><span style={{ height: `${Math.max((item.value / max) * 100, 2)}%` }}><b>{item.value.toFixed(0)}{suffix}</b></span><small>{item.label}</small></div>)}</div>;
}

function StackedBar({ counts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  return <div className="stacked"><div className="stacked-bar">{entries.map(([name, value], index) => <span key={name} style={{ height: `${(value / total) * 100}%`, background: colors[index % colors.length] }}>{value}</span>)}</div><div className="legend">{entries.map(([name, value], index) => <span key={name}><i style={{ background: colors[index % colors.length] }} />{name} <b>{value}</b></span>)}</div></div>;
}

function Donut({ counts }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  let offset = 0;
  const segments = entries.map(([, value], index) => {
    const slice = (value / total) * 100;
    const segment = `${colors[index % colors.length]} ${offset}% ${offset + slice}%`;
    offset += slice;
    return segment;
  }).join(", ");
  return <div className="donut-row"><div className="donut" style={{ background: `conic-gradient(${segments})` }} /><div className="legend">{entries.map(([name, value], index) => <span key={name}><i style={{ background: colors[index % colors.length] }} />{name} <b>{value}</b></span>)}</div></div>;
}

function matchesFilters(row, period, program, province, district) {
  return (
    row.period === period &&
    (program === "All" || row.program === program) &&
    (province === "All" || row.province === province) &&
    (district === "All" || row.district === district)
  );
}

function facilityRows(reportRows, timelyRows) {
  const timelyByDistrict = new Map(timelyRows.map((row) => [`${row.district}|${row.program}`, row.timeliness]));
  return reportRows.map((row) => ({
    ...row,
    sourceStatus: row.status,
    status: isReporting(row) ? "REPORTING" : "NON_REPORTING",
    reportingRate: isReporting(row) ? 100 : 0,
    timeliness: timelyByDistrict.get(`${row.district}|${row.program}`) ?? "",
  }));
}

function districtPerformance(rows) {
  return Object.entries(groupBy(rows, "district")).map(([district, items]) => {
    const reporting = items.filter((item) => isReporting(item)).length;
    return { label: district, value: (reporting / items.length) * 100 };
  }).sort((a, b) => b.value - a.value);
}

function reportSubmissionTrend(rows) {
  const counts = {};
  rows.filter((row) => isReporting(row) && row.dateReceived && row.dateReceived !== "-").forEach((row) => {
    counts[row.dateReceived] = (counts[row.dateReceived] || 0) + 1;
  });
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([label, value]) => ({ label: label.slice(5), value }));
}

function linkTrainingToFacilities(facilityKpis, traineeRows) {
  const byDistrict = countBy(traineeRows, "district");
  const byFacility = countBy(traineeRows, "facility");
  return facilityKpis.slice(0, 500).map((facility) => ({
    district: facility.district,
    facility: facility.facility,
    trained: (byFacility[facility.facility] || 0) + (byDistrict[facility.district] || 0),
    reportingRate: facility.reportingRate,
    timeliness: facility.timeliness,
  })).sort((a, b) => b.trained - a.trained);
}

function getTotals(reportRows, timelyRows, traineeRows) {
  const expected = reportRows.length;
  const reporting = reportRows.filter((row) => isReporting(row)).length;
  const timelyExpected = timelyRows.reduce((sum, row) => sum + row.expected, 0);
  const timelyOnTime = timelyRows.reduce((sum, row) => sum + row.reportedOnTime, 0);
  return {
    reportingRate: expected ? (reporting / expected) * 100 : 0,
    timeliness: timelyExpected ? (timelyOnTime / timelyExpected) * 100 : 0,
    reporting,
    nonReporting: expected - reporting,
    expected,
    superusers: traineeRows.filter((person) => person.role === "Superuser").length,
    experts: traineeRows.filter((person) => person.role === "Expert").length,
    users: traineeRows.filter((person) => person.role === "User").length,
    districts: unique(reportRows.map((row) => row.district)).length,
    trainingDistricts: unique(traineeRows.map((row) => row.district)).length,
    issuesResolved: traineeRows.reduce((sum, row) => sum + Number(row.issuesResolved || 0), 0),
  };
}

function isReporting(row) {
  return String(row.status || "").trim().toUpperCase() !== "NON_REPORTING";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function groupBy(rows, key) {
  return rows.reduce((groups, row) => {
    const value = row[key] || "Unknown";
    groups[value] = groups[value] || [];
    groups[value].push(row);
    return groups;
  }, {});
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] || "Not Specified";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sortPeriods(values) {
  return values.sort((a, b) => new Date(`1 ${a}`) - new Date(`1 ${b}`));
}

function labelize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatCell(value, column) {
  if (["reportingRate", "timeliness"].includes(column) && typeof value === "number") return `${value.toFixed(1)}%`;
  if (typeof value === "number") return value.toLocaleString();
  return value || "";
}

const colors = ["#147a46", "#195e8f", "#a96e00", "#7a3fb1", "#b42318", "#00857a", "#637381", "#d65f2a"];

createRoot(document.getElementById("root")).render(<App />);
