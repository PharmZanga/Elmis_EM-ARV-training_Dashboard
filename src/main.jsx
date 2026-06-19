import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const periods = ["January 2025", "February 2025", "March 2025", "April 2025", "May 2025", "June 2025", "February 2026"];
const programs = ["Essential Medicine", "Antiretroviral Drugs"];

const facilities = [
  { district: "Chililabombwe", province: "Copperbelt", facility: "Chililabombwe DHO", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 100, status: "REPORTING", received: 48, expected: 48, trained: 6, issuesResolved: 0 },
  { district: "Chililabombwe", province: "Copperbelt", facility: "Chililabombwe District Hospital", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 96, status: "REPORTING", received: 31, expected: 31, trained: 8, issuesResolved: 0 },
  { district: "Chililabombwe", province: "Copperbelt", facility: "Chimfunshi Rural Health Center", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 98, status: "REPORTING", received: 24, expected: 24, trained: 4, issuesResolved: 0 },
  { district: "Chingola", province: "Copperbelt", facility: "Chingola DHO", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 100, status: "REPORTING", received: 42, expected: 42, trained: 5, issuesResolved: 0 },
  { district: "Kalulushi", province: "Copperbelt", facility: "Kalulushi District Hospital", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 100, status: "REPORTING", received: 34, expected: 34, trained: 4, issuesResolved: 0 },
  { district: "Kitwe", province: "Copperbelt", facility: "Kitwe DHO", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 100, status: "REPORTING", received: 55, expected: 55, trained: 12, issuesResolved: 0 },
  { district: "Kitwe", province: "Copperbelt", facility: "Buchi Main Clinic", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 95, status: "REPORTING", received: 27, expected: 27, trained: 5, issuesResolved: 0 },
  { district: "Luanshya", province: "Copperbelt", facility: "MoH Luanshya", period: "February 2026", program: "Antiretroviral Drugs", reportingRate: 100, timeliness: 97, status: "REPORTING", received: 28, expected: 28, trained: 4, issuesResolved: 0 },
  { district: "Lufwanyama", province: "Copperbelt", facility: "Lufwanyama DHO", period: "February 2026", program: "Antiretroviral Drugs", reportingRate: 100, timeliness: 98, status: "REPORTING", received: 23, expected: 23, trained: 3, issuesResolved: 0 },
  { district: "Masaiti", province: "Copperbelt", facility: "Masaiti DHO", period: "February 2026", program: "Essential Medicine", reportingRate: 100, timeliness: 99, status: "REPORTING", received: 43, expected: 43, trained: 8, issuesResolved: 0 }
];

const trainees = [
  { role: "Expert", district: "Chililabombwe", facility: "MoH Luanshya", firstName: "Deborah", phone: "964441246", profession: "Biomedical Scientist" },
  { role: "Expert", district: "Kitwe", facility: "Kitwe DHO", firstName: "Norah", phone: "972924626", profession: "Pharmacist" },
  { role: "Expert", district: "Ndola", facility: "Ndola DHO", firstName: "Lorent", phone: "974172062", profession: "Medical Laboratory" },
  { role: "Expert", district: "Ndola", facility: "DHO", firstName: "Dina", phone: "770131052", profession: "ICT" },
  { role: "Superuser", district: "Ndola", facility: "ADCH", firstName: "KAFULA", phone: "974984487", profession: "Pharmacy Technologist" },
  { role: "Superuser", district: "Ndola", facility: "ADCH", firstName: "Pretty", phone: "967130886", profession: "Pharmacist" },
  { role: "Superuser", district: "Kitwe", facility: "Buchi Main Clinic", firstName: "Benson", phone: "962972197", profession: "Clinical Officer" },
  { role: "Superuser", district: "Kitwe", facility: "BULANGILILO UHC", firstName: "CHITA MUSA", phone: "968632362", profession: "Biomedical Scientist" },
  { role: "User", district: "Mpongwe", facility: "Chisapa HP", firstName: "EVELYN", phone: "762557818", profession: "Nurse" },
  { role: "User", district: "Kitwe", facility: "ITIMPI clinic", firstName: "Susan makate", phone: "967356882", profession: "Medical Laboratory" },
  { role: "User", district: "Ndola", facility: "Kabushi Clinic", firstName: "Ennety", phone: "973076692", profession: "Pharmacy Technologist" },
  { role: "User", district: "Ndola", facility: "Kaloko Clinic", firstName: "Memory", phone: "961132039", profession: "Pharmacist" },
  ...Array.from({ length: 47 }, (_, index) => {
    const base = facilities[index % facilities.length];
    const professions = ["Pharmacist", "Pharmacy Technologist", "Medical Laboratory", "Biomedical Scientist", "ICT", "BMS", "Clinical Officer", "Nurse"];
    return {
      role: "Superuser",
      district: base.district,
      facility: base.facility,
      firstName: `Participant ${index + 1}`,
      phone: `97${(2000000 + index * 1379).toString().slice(0, 7)}`,
      profession: professions[index % professions.length]
    };
  })
];

function App() {
  const [activePage, setActivePage] = useState("kpis");
  const [selectedPeriod, setSelectedPeriod] = useState("February 2026");
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [selectedProvince, setSelectedProvince] = useState("Copperbelt");
  const [selectedDistrict, setSelectedDistrict] = useState("All");

  const provinces = [...new Set(facilities.map((facility) => facility.province))];
  const districts = [...new Set(facilities.filter((facility) => selectedProvince === "All" || facility.province === selectedProvince).map((facility) => facility.district))];

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      return (
        facility.period === selectedPeriod &&
        (selectedProgram === "All" || facility.program === selectedProgram) &&
        (selectedProvince === "All" || facility.province === selectedProvince) &&
        (selectedDistrict === "All" || facility.district === selectedDistrict)
      );
    });
  }, [selectedPeriod, selectedProgram, selectedProvince, selectedDistrict]);

  const filteredTrainees = useMemo(() => {
    const facilityNames = new Set(filteredFacilities.map((facility) => facility.facility));
    return trainees.filter((trainee) => selectedDistrict === "All" || trainee.district === selectedDistrict || facilityNames.has(trainee.facility));
  }, [filteredFacilities, selectedDistrict]);

  const totals = getTotals(filteredFacilities, filteredTrainees);

  return (
    <main>
      <div className="shell">
        <header className="dashboard-header">
          <img src="./zambia-coat-of-arms.svg" alt="Zambia Coat of Arms" />
          <h1>MoH eLMIS EM and ARV Training Dashboard</h1>
        </header>

        <nav className="tabs" aria-label="Dashboard pages">
          <button className={activePage === "kpis" ? "active" : ""} onClick={() => setActivePage("kpis")}>Facility KPIs</button>
          <button className={activePage === "training" ? "active" : ""} onClick={() => setActivePage("training")}>Training Linkage</button>
        </nav>

        <section className="layout">
          <div className="content">
            {activePage === "kpis" ? (
              <KpiPage totals={totals} facilities={filteredFacilities} />
            ) : (
              <TrainingPage totals={totals} facilities={filteredFacilities} trainees={filteredTrainees} />
            )}
          </div>
          <aside className="filters">
            <FilterGroup title="Period" items={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />
            <FilterGroup title="Program" items={["All", ...programs]} selected={selectedProgram} onSelect={setSelectedProgram} />
            <FilterGroup title="Province" items={["All", ...provinces, "Central", "Eastern", "Luapula", "Lusaka", "Muchinga"]} selected={selectedProvince} onSelect={setSelectedProvince} />
            <FilterGroup title="District" items={["All", ...districts]} selected={selectedDistrict} onSelect={setSelectedDistrict} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function KpiPage({ totals, facilities }) {
  return (
    <>
      <KpiGrid items={[
        ["Reporting Rate", `${totals.reportingRate.toFixed(2)}%`],
        ["Superusers Trained", totals.superusers],
        ["Experts Trained", totals.experts],
        ["Users Trained", totals.users],
        ["Districts Trained", totals.districts]
      ]} />
      <div className="province-bar">Copperbelt&nbsp;&nbsp; {totals.reportingRate.toFixed(2)}%</div>
      <section className="grid three">
        <Panel title="Reporting Rate"><DataTable rows={facilities} columns={["district", "period", "facility", "reportingRate"]} total={`${totals.reportingRate.toFixed(2)}%`} /></Panel>
        <Panel title="Reporting Timeliness"><DataTable rows={facilities} columns={["district", "period", "program", "timeliness"]} total={`${totals.timeliness.toFixed(2)}%`} /></Panel>
        <Panel title="Reporting Status"><DataTable rows={facilities} columns={["district", "period", "facility", "status"]} /></Panel>
        <Panel title="Reporting vs Non-Reporting"><Pie value={totals.reporting} total={totals.expected} label={`${totals.reporting} (${Math.round(totals.reportingRate)}%)`} /></Panel>
        <Panel title="Report Submission Distribution"><LineChart values={[1, 2, 3, 5, 13, 58, 4, 38, 8, 1]} /></Panel>
        <Panel title="Reporting Trend by Month"><BarChart values={[{ label: "Feb 2026", value: totals.reporting }]} max={400} /></Panel>
      </section>
    </>
  );
}

function TrainingPage({ totals, facilities, trainees }) {
  const experts = trainees.filter((person) => person.role === "Expert");
  const superusers = trainees.filter((person) => person.role === "Superuser");
  const users = trainees.filter((person) => person.role === "User");
  const professionCounts = countBy(trainees, "profession");
  const facilityTraining = facilities.map((facility) => ({
    facility: facility.facility,
    district: facility.district,
    trained: trainees.filter((person) => person.facility === facility.facility || person.district === facility.district).length,
    reportingRate: `${facility.reportingRate.toFixed(2)}%`,
    timeliness: `${facility.timeliness.toFixed(2)}%`
  }));

  return (
    <>
      <KpiGrid items={[
        ["Issues Resolved", totals.issuesResolved],
        ["Superusers Trained", totals.superusers],
        ["Experts Trained", totals.experts],
        ["Users Trained", totals.users],
        ["Districts Trained", totals.districts]
      ]} />
      <section className="grid training-grid">
        <div className="stack">
          <Panel title="List of Experts"><PeopleTable rows={experts} /></Panel>
          <Panel title="List of Superusers"><PeopleTable rows={superusers.slice(0, 8)} /></Panel>
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
  return <section className="kpi-grid">{items.map(([label, value]) => <article className="kpi" key={label}><strong>{value}</strong><span>{label}</span></article>)}</section>;
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
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((column) => <th key={column}>{labelize(column)}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={`${row.facility || row.firstName}-${index}`}>{columns.map((column) => <td key={column}>{formatCell(row[column], column)}</td>)}</tr>)}</tbody>
        {total && <tfoot><tr><td colSpan={columns.length - 1}>Total</td><td>{total}</td></tr></tfoot>}
      </table>
    </div>
  );
}

function PeopleTable({ rows }) {
  return <DataTable rows={rows} columns={["district", "facility", "firstName", "phone"]} />;
}

function Pie({ value, total, label }) {
  const percent = total ? value / total : 0;
  return <div className="pie-card"><div className="solid-pie" style={{ "--percent": `${percent * 100}%` }} /><div><b>Reporting Status</b><p><span className="dot green" />REPORTING</p><strong>{label}</strong></div></div>;
}

function LineChart({ values }) {
  const max = Math.max(...values);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${100 - (value / max) * 92}`).join(" ");
  return <svg className="chart" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points} /><g>{values.map((value, index) => <text key={index} x={(index / (values.length - 1)) * 100} y={98 - (value / max) * 92}>{[1, 13, 58, 4, 38].includes(value) ? value : ""}</text>)}</g></svg>;
}

function BarChart({ values, max }) {
  return <div className="bar-chart">{values.map((item) => <div className="bar-item" key={item.label}><span style={{ height: `${(item.value / max) * 100}%` }}><b>{item.value}</b></span><small>{item.label}</small></div>)}</div>;
}

function StackedBar({ counts }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  return <div className="stacked"><div className="stacked-bar">{entries.map(([name, value], index) => <span key={name} style={{ height: `${(value / total) * 100}%`, background: colors[index % colors.length] }}>{value > 4 ? value : ""}</span>)}</div><div className="legend">{entries.map(([name], index) => <span key={name}><i style={{ background: colors[index % colors.length] }} />{name}</span>)}</div></div>;
}

function Donut({ counts }) {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let offset = 0;
  const segments = entries.map(([name, value], index) => {
    const slice = (value / total) * 100;
    const segment = `${colors[index % colors.length]} ${offset}% ${offset + slice}%`;
    offset += slice;
    return segment;
  }).join(", ");
  return <div className="donut-row"><div className="donut" style={{ background: `conic-gradient(${segments})` }} /><div className="legend">{entries.slice(0, 6).map(([name, value], index) => <span key={name}><i style={{ background: colors[index % colors.length] }} />{name} <b>{value}</b></span>)}</div></div>;
}

function getTotals(facilityRows, traineeRows) {
  const expected = facilityRows.reduce((sum, row) => sum + row.expected, 0);
  const reporting = facilityRows.reduce((sum, row) => sum + row.received, 0);
  return {
    reportingRate: expected ? (reporting / expected) * 100 : 0,
    timeliness: average(facilityRows.map((row) => row.timeliness)),
    reporting,
    expected,
    superusers: traineeRows.filter((person) => person.role === "Superuser").length,
    experts: traineeRows.filter((person) => person.role === "Expert").length,
    users: traineeRows.filter((person) => person.role === "User").length,
    districts: new Set(facilityRows.map((row) => row.district)).size,
    issuesResolved: facilityRows.reduce((sum, row) => sum + row.issuesResolved, 0)
  };
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => ({ ...counts, [row[key]]: (counts[row[key]] || 0) + 1 }), {});
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function labelize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatCell(value, column) {
  if (["reportingRate", "timeliness"].includes(column) && typeof value === "number") return `${value.toFixed(2)}%`;
  return value;
}

const colors = ["#7a007d", "#ec4eab", "#28a745", "#6850a3", "#d9b300", "#e86d33", "#1f8dec", "#1630a2"];

createRoot(document.getElementById("root")).render(<App />);
