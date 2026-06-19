import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { dashboardData } from "./dashboardData.js";
import "./styles.css";

const { participants, reportingRows, timelinessRows } = dashboardData;
const menuItems = [
  ["executive", "1", "Executive"],
  ["reports", "2", "eLMIS Reports"],
  ["training", "3", "Training Linkages"],
  ["tasks", "4", "Task Follow-ups"],
];

function App() {
  const [detailPayload, setDetailPayload] = useState(() => readDetailPayload());
  useEffect(() => {
    const syncDetailPayload = () => setDetailPayload(readDetailPayload());
    window.addEventListener("hashchange", syncDetailPayload);
    return () => window.removeEventListener("hashchange", syncDetailPayload);
  }, []);

  if (detailPayload) return <DetailPage payload={detailPayload} />;
  return <DashboardApp />;
}

function DashboardApp() {
  const periods = useMemo(() => sortPeriods(unique(reportingRows.map((row) => row.period))), []);
  const programs = useMemo(() => unique(reportingRows.map((row) => row.program)).sort(), []);
  const provinces = useMemo(() => unique(reportingRows.map((row) => row.province)).sort(), []);
  const defaultPeriod = periods.includes("February 2026") ? "February 2026" : periods.at(-1) || "February 2026";

  const [activePage, setActivePage] = useState("executive");
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
  const provinceTicker = useMemo(() => provincePerformance(filteredReporting), [filteredReporting]);
  const followUps = useMemo(() => taskFollowUps(statusRows, filteredTimeliness), [statusRows, filteredTimeliness]);

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
          <div className="tower-brand">
            <img src="./nsccu-control-tower-logo.svg" alt="National Supply Chain Coordinating Unit Control Tower" />
            <div>
              <strong>National Supply Chain Coordinating Unit</strong>
              <span>Control Tower</span>
            </div>
          </div>
        </div>
      </header>

      <section className="page-shell">
        <aside className="sidebar">
          <nav className="side-menu" aria-label="Dashboard sections">
            {menuItems.map(([key, number, label]) => (
              <button key={key} className={activePage === key ? "active" : ""} onClick={() => setActivePage(key)}>
                <b>{number}</b>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="content">
          <div className="page-filters" aria-label="Dashboard filters">
            <FilterGroup title="Period" items={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />
            <FilterGroup title="Program" items={["All", ...programs]} selected={selectedProgram} onSelect={setSelectedProgram} />
            <FilterGroup title="Province" items={["All", ...provinces]} selected={selectedProvince} onSelect={setSelectedProvince} />
            <FilterGroup title="District" items={["All", ...districts]} selected={selectedDistrict} onSelect={setSelectedDistrict} />
          </div>
          <div className="context-strip">
            <span>{selectedPeriod}</span>
            <span>{selectedProgram}</span>
            <span>{selectedProvince === "All" ? "National" : selectedProvince}</span>
            <span>{selectedDistrict === "All" ? "All Districts" : selectedDistrict}</span>
          </div>
          {activePage === "executive" && <ExecutivePage totals={totals} statusRows={statusRows} participants={filteredParticipants} districtBars={districtBars} provinceTicker={provinceTicker} followUps={followUps} />}
          {activePage === "reports" && <KpiPage totals={totals} statusRows={statusRows} districtBars={districtBars} submissionTrend={submissionTrend} provinceTicker={provinceTicker} />}
          {activePage === "training" && <TrainingPage totals={totals} participants={filteredParticipants} facilityKpis={statusRows} />}
          {activePage === "tasks" && <TaskPage totals={totals} statusRows={statusRows} followUps={followUps} provinceTicker={provinceTicker} />}
        </section>
      </section>
    </main>
  );
}

function ExecutivePage({ totals, statusRows, participants, districtBars, provinceTicker, followUps }) {
  const professionCounts = countBy(participants, "profession");
  const trainingByRole = [
    { label: "Experts", value: totals.experts },
    { label: "Superusers", value: totals.superusers },
    { label: "Users", value: totals.users },
  ];
  return (
    <>
      <KpiGrid items={[
        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],
        ["Timeliness", `${totals.timeliness.toFixed(1)}%`],
        ["Participants", participants.length],
        ["Non-Reporting", totals.nonReporting],
        ["Late Follow-ups", followUps.lateDistricts.length],
      ]} />
      <ProvinceTicker values={provinceTicker} />
      <section className="grid executive-grid">
        <Panel title="Executive Summary">
          <div className="summary-copy">
            <p>The eLMIS Essential Medicines (EM), Antiretroviral (ARV) Reporting and Training Dashboard provides a comprehensive overview of reporting performance, user engagement, and capacity-building efforts across Zambia's health supply chain.</p>
            <p>The dashboard serves as a strategic tool for monitoring data submission rates, identifying reporting gaps, tracking system utilization, and assessing training coverage among health workers.</p>
            <p>By consolidating reporting and training indicators into a single platform, the dashboard enables national, provincial, district, and facility-level managers to monitor compliance with reporting requirements, evaluate data quality, and identify areas requiring targeted support.</p>
            <p>The dashboard further facilitates evidence-based decision-making by highlighting trends in reporting performance and user participation in eLMIS training programs.</p>
            <p>The platform supports ongoing efforts to strengthen the national supply chain by improving data visibility, promoting accountability, enhancing user competency, and ensuring timely availability of reliable logistics information for forecasting, quantification, procurement, and commodity management.</p>
            <p>Ultimately, the dashboard contributes to improved supply chain performance and the uninterrupted availability of essential medicines and antiretroviral commodities across the country.</p>
          </div>
        </Panel>
        <Panel title="Top Reporting Districts"><BarChart values={districtBars.slice(0, 8)} max={100} suffix="%" /></Panel>
        <Panel title="Training Role Mix"><BarChart values={trainingByRole} max={Math.max(...trainingByRole.map((item) => item.value), 1)} /></Panel>
        <Panel title="Profession Mix"><Donut counts={professionCounts} /></Panel>
        <Panel title="Priority Non-Reporting Facilities"><DataTable rows={followUps.nonReporting.slice(0, 80)} columns={["province", "district", "facility", "program", "task"]} /></Panel>
        <Panel title="Reporting Status Snapshot"><Pie reporting={totals.reporting} nonReporting={totals.nonReporting} /></Panel>
      </section>
    </>
  );
}

function KpiPage({ totals, statusRows, districtBars, submissionTrend, provinceTicker }) {
  const reportedRows = statusRows.filter((row) => row.status === "REPORTING");
  const nonReportingRows = statusRows.filter((row) => row.status === "NON_REPORTING");
  const districtRows = districtBars.map((row) => ({
    district: row.label,
    reportingRate: row.value,
  }));
  const reportCards = [
    {
      label: "Reporting Rate",
      value: `${totals.reportingRate.toFixed(1)}%`,
      title: "Reporting Rate Full Details",
      rows: statusRows,
      columns: ["province", "district", "facility", "program", "status", "reportingRate"],
    },
    {
      label: "Facilities Reported",
      value: totals.reporting,
      title: "Facilities Reported Full Details",
      rows: reportedRows,
      columns: ["province", "district", "facility", "program", "status", "dateReceived"],
    },
    {
      label: "Non Reporting",
      value: totals.nonReporting,
      title: "Non Reporting Facility Details",
      rows: nonReportingRows,
      columns: ["province", "district", "facility", "program", "status"],
    },
    {
      label: "Timeliness",
      value: `${totals.timeliness.toFixed(1)}%`,
      title: "Reporting Timeliness Full Details",
      rows: statusRows,
      columns: ["province", "district", "facility", "program", "timeliness", "status"],
    },
    {
      label: "Districts",
      value: totals.districts,
      title: "District Reporting Rate Details",
      rows: districtRows,
      columns: ["district", "reportingRate"],
    },
  ];

  return (
    <>
      <KpiGrid items={reportCards} />
      <ProvinceTicker values={provinceTicker} />
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

function TaskPage({ totals, statusRows, followUps, provinceTicker }) {
  const taskCards = [
    {
      label: "Open Follow-ups",
      value: followUps.nonReporting.length + followUps.lateDistricts.length,
      title: "All Open Follow-ups",
      rows: [...followUps.nonReporting, ...followUps.lateDistricts],
      columns: ["province", "district", "facility", "program", "reportedLate", "task"],
    },
    {
      label: "Facilities Not Reported",
      value: followUps.nonReporting.length,
      title: "Facilities That Have Not Reported This Month",
      rows: followUps.nonReporting,
      columns: ["province", "district", "facility", "program", "task"],
    },
    {
      label: "Late Districts",
      value: followUps.lateDistricts.length,
      title: "Late Reporting District Details",
      rows: followUps.lateDistricts,
      columns: ["province", "district", "program", "expected", "reportedLate", "task"],
    },
    {
      label: "Late Reports",
      value: followUps.lateReports,
      title: "Late Report Follow-up Details",
      rows: followUps.lateDistricts,
      columns: ["province", "district", "program", "expected", "reportedLate", "task"],
    },
    {
      label: "Reporting Rate",
      value: `${totals.reportingRate.toFixed(1)}%`,
      title: "Reporting Rate Follow-up Context",
      rows: statusRows,
      columns: ["province", "district", "facility", "program", "status", "reportingRate"],
    },
  ];

  return (
    <>
      <KpiGrid items={taskCards} />
      <ProvinceTicker values={provinceTicker} />
      <section className="grid task-grid">
        <Panel title="Facilities That Have Not Reported This Month"><DataTable rows={followUps.nonReporting} columns={["province", "district", "facility", "program", "task"]} /></Panel>
        <Panel title="Late Reporting Follow-ups"><DataTable rows={followUps.lateDistricts} columns={["province", "district", "program", "expected", "reportedLate", "task"]} /></Panel>
        <Panel title="Province Reporting Watch"><BarChart values={provinceTicker.slice(0, 10).map((item) => ({ label: item.province, value: item.reportingRate }))} max={100} suffix="%" /></Panel>
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
  return (
    <section className="kpi-grid">
      {items.map((item) => {
        const card = Array.isArray(item) ? { label: item[0], value: item[1] } : item;
        const clickable = card.rows && card.columns;
        return (
          <button
            type="button"
            className={`kpi ${clickable ? "clickable" : ""}`}
            key={card.label}
            onClick={clickable ? () => openDetailWindow(card.title || card.label, card.rows, card.columns) : undefined}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>
        );
      })}
    </section>
  );
}

function Panel({ title, children }) {
  return <article className="panel"><h2>{title}</h2>{children}</article>;
}

function FilterGroup({ title, items, selected, onSelect }) {
  return (
    <section className="filter-card">
      <label htmlFor={`filter-${title}`}>{title}</label>
      <select id={`filter-${title}`} value={selected} onChange={(event) => onSelect(event.target.value)}>
        {items.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </section>
  );
}

function ProvinceTicker({ values }) {
  const items = values.length ? values : [{ province: "No province data", reportingRate: 0, reporting: 0, expected: 0 }];
  const tickerText = items.map((item) => `${item.province}: ${item.reportingRate.toFixed(1)}% reporting (${item.reporting.toLocaleString()}/${item.expected.toLocaleString()})`).join("   |   ");
  return (
    <div className="ticker" aria-label="Province reporting ticker">
      <div className="ticker-track">
        <span>{tickerText}</span>
        <span>{tickerText}</span>
      </div>
    </div>
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

function DetailPage({ payload }) {
  const rows = payload.rows || [];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return (
    <main className="detail-page">
      <header className="detail-header">
        <div>
          <span className="eyebrow">eLMIS Detail View</span>
          <h1>{payload.title}</h1>
          <p>{rows.length.toLocaleString()} record{rows.length === 1 ? "" : "s"}</p>
        </div>
        <div className="detail-actions">
          <button type="button" onClick={() => window.print()}>Print</button>
          <button type="button" onClick={() => downloadCsv(payload.title, rows)}>Export CSV</button>
        </div>
      </header>
      <section className="detail-table-wrap">
        <table>
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>{headers.map((header) => <td key={header}>{row[header]}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
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

function provincePerformance(rows) {
  return Object.entries(groupBy(rows, "province")).map(([province, items]) => {
    const reporting = items.filter((item) => isReporting(item)).length;
    return {
      province,
      reporting,
      expected: items.length,
      reportingRate: items.length ? (reporting / items.length) * 100 : 0,
    };
  }).sort((a, b) => a.province.localeCompare(b.province));
}

function taskFollowUps(facilityKpis, timelyRows) {
  const nonReporting = facilityKpis
    .filter((row) => row.status === "NON_REPORTING")
    .map((row) => ({
      ...row,
      task: "Call facility focal person and confirm report submission barrier",
    }))
    .sort((a, b) => a.province.localeCompare(b.province) || a.district.localeCompare(b.district) || a.facility.localeCompare(b.facility));

  const lateDistricts = timelyRows
    .filter((row) => Number(row.reportedLate || 0) > 0)
    .map((row) => ({
      ...row,
      task: "Follow up late submissions and reinforce reporting deadline",
    }))
    .sort((a, b) => b.reportedLate - a.reportedLate);

  return {
    nonReporting,
    lateDistricts,
    lateReports: lateDistricts.reduce((sum, row) => sum + Number(row.reportedLate || 0), 0),
  };
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

function openDetailWindow(title, rows, columns) {
  const normalizedRows = rows.map((row) => {
    return columns.reduce((record, column) => {
      record[labelize(column)] = formatCell(row[column], column);
      return record;
    }, {});
  });
  const key = `detail-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, JSON.stringify({ title, rows: normalizedRows }));
  const url = `${window.location.origin}${window.location.pathname}#detail=${encodeURIComponent(key)}`;
  window.open(url, "_blank", "width=1200,height=800");
}

function readDetailPayload() {
  if (!window.location.hash.startsWith("#detail=")) return null;
  const key = decodeURIComponent(window.location.hash.replace("#detail=", ""));
  try {
    const payload = JSON.parse(localStorage.getItem(key) || "null");
    return payload && Array.isArray(payload.rows) ? payload : { title: "Details", rows: [] };
  } catch {
    return { title: "Details", rows: [] };
  }
}

function downloadCsv(title, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(title)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "details";
}

const colors = ["#147a46", "#195e8f", "#a96e00", "#7a3fb1", "#b42318", "#00857a", "#637381", "#d65f2a"];

createRoot(document.getElementById("root")).render(<App />);
