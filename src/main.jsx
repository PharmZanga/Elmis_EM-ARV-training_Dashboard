import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { dashboardData } from "./dashboardData.js";
import "./styles.css";

const { participants, reportingRows, timelinessRows, facilityMetadata = [] } = dashboardData;
const menuItems = [
  ["executive", "1", "Executive"],
  ["reports", "2", "eLMIS Reports"],
  ["training", "3", "Training Linkages"],
  ["tasks", "4", "Task Follow-ups"],
  ["trainings", "5", "Trainings"],
  ["helpdesk", "6", "Help Desk"],
  ["updates", "7", "Latest Updates"],
];

const helpDeskContacts = [
  { province: "Central", firstName: "Bertha", lastName: "Khondowe", phone: "0974323833" },
  { province: "Copperbelt", firstName: "Nyasulu", lastName: "Aaron", phone: "0978402727" },
  { province: "Eastern", firstName: "Wemba William", lastName: "Phiri", phone: "0977393174" },
  { province: "Luapula", firstName: "Raphael", lastName: "Mandevu", phone: "0978587579" },
  { province: "Lusaka", firstName: "Siphiwe", lastName: "Makowane", phone: "0979444769" },
  { province: "Muchinga", firstName: "Simon", lastName: "Tembo", phone: "0967787563" },
  { province: "North-Western", firstName: "Allan", lastName: "Silwamba", phone: "0971022280" },
  { province: "Northern", firstName: "Lawrence", lastName: "Mvula", phone: "0977624216" },
  { province: "Southern", firstName: "Luckson", lastName: "Tembo", phone: "0968630995" },
  { province: "Western", firstName: "William", lastName: "Kapambwe", phone: "0973426211" },
];

const trainingHighlights = [
  ["kafue-experts-group.jpg", "Kafue Experts Training", "National eLMIS experts group photo"],
  ["expert-room-wide.jpg", "Hands-on Expert Session", "Participants working through system exercises"],
  ["expert-classroom.jpg", "Classroom Engagement", "Expert trainees reviewing reporting workflows"],
  ["elmis-presentation.jpg", "eLMIS Orientation", "Core benefits and reporting expectations"],
  ["supply-chain-slide.jpg", "Supply Chain Linkages", "National supply chain information flow discussion"],
  ["support-training-panel.jpg", "Support Training Panel", "Facilitators supporting implementation planning"],
  ["field-support-session.jpg", "Facility Mentorship", "On-site support with facility teams"],
  ["facility-mentorship.jpg", "Commodity Room Support", "Practical follow-up at facility level"],
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activePage]);

  const districts = useMemo(() => {
    const districtSource = facilityMetadata.length ? facilityMetadata : reportingRows;
    return unique(
      districtSource
        .filter((row) => selectedProvince === "All" || row.province === selectedProvince)
        .map((row) => row.district)
        .filter(Boolean)
    ).sort();
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict !== "All" && !districts.includes(selectedDistrict)) {
      setSelectedDistrict("All");
    }
  }, [districts, selectedDistrict]);

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

  const facilitySemantics = useMemo(() => getFacilityReportingSemantics(filteredReporting), [filteredReporting]);
  const totals = useMemo(() => ({
    ...getTotals(filteredReporting, filteredTimeliness, filteredParticipants),
    ...facilitySemantics,
  }), [filteredReporting, filteredTimeliness, filteredParticipants, facilitySemantics]);
  const statusRows = useMemo(() => facilityRows(filteredReporting, filteredTimeliness), [filteredReporting, filteredTimeliness]);
  const districtBars = useMemo(() => districtPerformance(filteredReporting), [filteredReporting]);
  const submissionTrend = useMemo(() => reportSubmissionTrend(filteredReporting), [filteredReporting]);
  const provinceTicker = useMemo(() => provincePerformance(filteredReporting), [filteredReporting]);
  const followUps = useMemo(() => taskFollowUps(statusRows, filteredTimeliness), [statusRows, filteredTimeliness]);
  const provinceCards = useMemo(() => provinceTrainingPerformance(provinceTicker, filteredParticipants), [provinceTicker, filteredParticipants]);
  const monthlyTrends = useMemo(() => monthlyProgramTrends(reportingRows, selectedProvince, selectedDistrict), [selectedProvince, selectedDistrict]);
  const insights = useMemo(() => buildInsights(provinceTicker, statusRows, filteredParticipants), [provinceTicker, statusRows, filteredParticipants]);
  const priorityRows = useMemo(() => priorityActions(followUps, provinceTicker, filteredParticipants), [followUps, provinceTicker, filteredParticipants]);

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
          <PageTicker activePage={activePage} totals={totals} participants={filteredParticipants} followUps={followUps} period={selectedPeriod} province={selectedProvince} />
          {!["helpdesk", "updates"].includes(activePage) && <>
            <div className="page-filters" aria-label="Dashboard filters">
              <FilterGroup title="Period" items={periods} selected={selectedPeriod} onSelect={setSelectedPeriod} />
              <FilterGroup title="Program" items={["All", ...programs]} selected={selectedProgram} onSelect={setSelectedProgram} />
              <FilterGroup
                title="Province"
                items={["All", ...provinces]}
                selected={selectedProvince}
                onSelect={(province) => {
                  setSelectedProvince(province);
                  setSelectedDistrict("All");
                }}
              />
              <FilterGroup title="District" items={["All", ...districts]} selected={selectedDistrict} onSelect={setSelectedDistrict} />
            </div>
            <div className="context-strip">
              <span>{selectedPeriod}</span>
              <span>{selectedProgram}</span>
              <span>{selectedProvince === "All" ? "National" : selectedProvince}</span>
              <span>{selectedDistrict === "All" ? "All Districts" : selectedDistrict}</span>
            </div>
          </>}
          {activePage === "executive" && <ExecutivePage totals={totals} statusRows={statusRows} participants={filteredParticipants} districtBars={districtBars} provinceTicker={provinceTicker} followUps={followUps} provinceCards={provinceCards} monthlyTrends={monthlyTrends} insights={insights} priorityRows={priorityRows} />}
          {activePage === "reports" && <KpiPage totals={totals} statusRows={statusRows} districtBars={districtBars} submissionTrend={submissionTrend} provinceTicker={provinceTicker} provinceCards={provinceCards} monthlyTrends={monthlyTrends} insights={insights} />}
          {activePage === "training" && <TrainingPage totals={totals} participants={filteredParticipants} facilityKpis={statusRows} />}
          {activePage === "tasks" && <TaskPage totals={totals} statusRows={statusRows} followUps={followUps} provinceTicker={provinceTicker} priorityRows={priorityRows} insights={insights} />}
          {activePage === "trainings" && <TrainingsPage totals={totals} participants={filteredParticipants} provinceCards={provinceCards} />}
          {activePage === "helpdesk" && <HelpDeskPage />}
          {activePage === "updates" && <LatestUpdatesPage />}
        </section>
      </section>
    </main>
  );
}

function reportWasSubmitted(row) {
  const status = String(row.status || "").trim().toUpperCase().replace(/[-\s]+/g, "_");
  const received = String(row.dateReceived || "").trim();
  const emptyReceived = new Set(["", "-", "--", "N/A", "NA", "NIL", "NONE", "NULL"]);

  // Explicit non-reporting status must always win, even when the source sheet
  // contains a placeholder or legacy value in Date Report Received.
  if (
    status.includes("NON_REPORT") ||
    status.includes("NOT_REPORT") ||
    status.includes("DID_NOT_REPORT") ||
    status === "NO" ||
    status === "MISSING"
  ) return false;

  if (!emptyReceived.has(received.toUpperCase())) return true;
  if (!status) return false;

  return (
    status === "REPORTING" ||
    status === "REPORTED" ||
    status.includes("SUBMIT") ||
    status.includes("RECEIV")
  );
}

function getFacilityReportingSemantics(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const facilityKey = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!facilityKey) return;

    const programKey = String(row.program || "Unspecified").trim() || "Unspecified";
    const facility = facilities.get(facilityKey) || new Map();
    const program = facility.get(programKey) || { submitted: false };

    // A programme is counted as submitted if any row for that facility-programme
    // has a received date or a submitted/reported status.
    if (reportWasSubmitted(row)) program.submitted = true;

    facility.set(programKey, program);
    facilities.set(facilityKey, facility);
  });

  const facilitiesExpected = facilities.size;
  let facilitiesReported = 0;

  facilities.forEach((programs) => {
    const expectedPrograms = programs.size;
    const submittedPrograms = [...programs.values()].filter((item) => item.submitted).length;
    if (expectedPrograms > 0 && submittedPrograms === expectedPrograms) facilitiesReported += 1;
  });

  return {
    facilitiesExpected,
    facilitiesReported,
    nonReportingFacilities: Math.max(facilitiesExpected - facilitiesReported, 0),
  };
}

function uniqueFacilityStatusRows(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const facilityKey = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!facilityKey) return;

    const programKey = String(row.program || "Unspecified").trim() || "Unspecified";
    const facility = facilities.get(facilityKey) || {
      representative: { ...row },
      programs: new Map(),
    };
    const program = facility.programs.get(programKey) || { submitted: false };
    if (reportWasSubmitted(row)) program.submitted = true;
    facility.programs.set(programKey, program);
    facilities.set(facilityKey, facility);
  });

  return [...facilities.values()].map(({ representative, programs }) => {
    const expectedPrograms = programs.size;
    const submittedPrograms = [...programs.values()].filter((item) => item.submitted).length;
    const complete = expectedPrograms > 0 && submittedPrograms === expectedPrograms;

    return {
      ...representative,
      status: complete ? "REPORTING" : "NON_REPORTING",
      expectedPrograms,
      submittedPrograms,
    };
  });
}

function ExecutivePage({ totals, statusRows, participants, districtBars, provinceTicker, followUps, provinceCards, monthlyTrends, insights, priorityRows }) {
  const [executiveTab, setExecutiveTab] = useState("overview");
  const professionCounts = countBy(participants, "profession");
  const trainingByRole = [
    { label: "Experts", value: totals.experts },
    { label: "Superusers", value: totals.superusers },
    { label: "Users", value: totals.users },
  ];

  return (
    <>
      <KpiGrid items={[
        { label: "Reporting Rate", value: `${totals.reportingRate.toFixed(1)}%`, title: "Reporting Rate Details", rows: statusRows, columns: ["province", "district", "facility", "program", "status", "reportingRate"] },
        { label: "Timeliness", value: `${totals.timeliness.toFixed(1)}%`, title: "Reporting Timeliness Details", rows: statusRows, columns: ["province", "district", "facility", "program", "timeliness", "status"] },
        { label: "Trained eLMIS Personnel", value: participants.length, title: "Trained eLMIS Personnel", rows: participants, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "role"] },
        { label: "Non-Reporting Facilities", value: totals.nonReportingFacilities, title: "Non-Reporting Facilities", rows: statusRows.filter((row) => row.status === "NON_REPORTING"), columns: ["province", "district", "facility", "program", "status"] },
        { label: "Late Follow-ups", value: followUps.lateDistricts.length, title: "Late Reporting Follow-ups", rows: followUps.lateDistricts, columns: ["province", "district", "program", "reportedLate", "timeliness", "task"] },
      ]} />
      <InsightStrip insights={insights} />

      <div className="executive-tabs" role="tablist" aria-label="Executive dashboard views">
        <button
          type="button"
          role="tab"
          aria-selected={executiveTab === "overview"}
          className={executiveTab === "overview" ? "active" : ""}
          onClick={() => setExecutiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={executiveTab === "trends"}
          className={executiveTab === "trends" ? "active" : ""}
          onClick={() => setExecutiveTab("trends")}
        >
          Reporting Trends
        </button>
      </div>

      {executiveTab === "overview" && (
        <section className="grid executive-grid executive-tab-panel">
          <Panel title="Executive Summary" className="summary-landscape compact-summary">
            <div className="summary-copy">
              <p>The eLMIS EM and ARV Training Dashboard provides a national view of reporting performance, timeliness, reporting gaps and workforce capacity across Zambia's health supply chain. It helps managers identify facilities and districts requiring follow-up and supports evidence-based action.</p>
              <p>By bringing reporting and training indicators into one platform, the dashboard strengthens accountability, data visibility and targeted support for reliable logistics information and continuous availability of essential medicines and antiretroviral commodities.</p>
            </div>
          </Panel>
          <Panel title="Zambia Provincial Performance" className="map-panel" detailRows={provinceCards} detailColumns={["province", "reportingRate", "reporting", "expected", "training"]}><ProvincePerformanceMap values={provinceCards} /></Panel>
          <Panel title="Priority Actions" className="priority-panel"><PriorityActionList rows={priorityRows} /></Panel>
          <Panel title="Top Reporting Districts"><BarChart values={districtBars.slice(0, 8)} max={100} suffix="%" /></Panel>
          <Panel title="Training Role Mix"><BarChart values={trainingByRole} max={Math.max(...trainingByRole.map((item) => item.value), 1)} /></Panel>
        </section>
      )}

      {executiveTab === "trends" && (
        <section className="grid executive-grid executive-tab-panel executive-trends-grid">
          <Panel title="Monthly EM and ARV Reporting Trends" className="executive-wide-panel"><MonthlyTrendChart values={monthlyTrends} /></Panel>
          <Panel title="Facility Reporting Status"><Pie reporting={totals.facilitiesReported} nonReporting={totals.nonReportingFacilities} /></Panel>
          <Panel title="Profession Mix"><Donut counts={professionCounts} /></Panel>
        </section>
      )}
    </>
  );
}

function KpiPage({ totals, statusRows, districtBars, submissionTrend, provinceTicker, provinceCards, monthlyTrends, insights }) {
  const facilityStatusRows = uniqueFacilityStatusRows(statusRows);
  const reportedRows = facilityStatusRows.filter((row) => row.status === "REPORTING");
  const nonReportingRows = facilityStatusRows.filter((row) => row.status === "NON_REPORTING");
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
      value: totals.facilitiesReported,
      title: "Unique Facilities Reported Full Details",
      rows: reportedRows,
      columns: ["province", "district", "facility", "program", "status", "dateReceived"],
    },
    {
      label: "Non-Reporting Facilities",
      value: totals.nonReportingFacilities,
      title: "Unique Non-Reporting Facility Details",
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
      <InsightStrip insights={insights} />
      <section className="grid three">
        <Panel title="Reporting Rate by Facility" detailRows={statusRows} detailColumns={["province", "district", "facility", "program", "reportingRate", "status"]}><DataTable rows={statusRows} columns={["district", "facility", "program", "reportingRate"]} total={`${totals.reportingRate.toFixed(1)}%`} /></Panel>
        <Panel title="Reporting Timeliness" detailRows={statusRows} detailColumns={["province", "district", "facility", "program", "timeliness", "status"]}><DataTable rows={statusRows} columns={["district", "program", "timeliness", "status"]} total={`${totals.timeliness.toFixed(1)}%`} /></Panel>
        <Panel title="Reporting Status" detailRows={statusRows} detailColumns={["province", "district", "facility", "status"]}><DataTable rows={statusRows} columns={["province", "district", "facility", "status"]} /></Panel>
        <Panel title="Facility Reporting vs Non-Reporting" detailRows={statusRows} detailColumns={["province", "district", "facility", "status"]}><Pie reporting={totals.facilitiesReported} nonReporting={totals.nonReportingFacilities} /></Panel>
        <Panel title="Report Submission Distribution" detailRows={submissionTrend} detailColumns={["label", "value"]}><LineChart values={submissionTrend} /></Panel>
        <Panel title="Reporting Rate by District" detailRows={districtRows} detailColumns={["district", "reportingRate"]}><BarChart values={districtBars.slice(0, 10)} max={100} suffix="%" /></Panel>
      </section>
      <section className="map-trend-row">
        <Panel title="Zambia Provincial Performance" className="map-panel" detailRows={provinceCards} detailColumns={["province", "reportingRate", "reporting", "expected", "training"]}><ProvincePerformanceMap values={provinceCards} /></Panel>
        <Panel title="Monthly EM and ARV Reporting Trends" detailRows={monthlyTrends} detailColumns={["label", "Essential Medicine", "Antiretroviral Drugs"]}><MonthlyTrendChart values={monthlyTrends} /></Panel>
      </section>
    </>
  );
}

function TaskPage({ totals, statusRows, followUps, provinceTicker, priorityRows, insights }) {
  return (
    <>
      <KpiGrid items={[
        ["Open Follow-ups", followUps.nonReporting.length + followUps.lateDistricts.length],
        ["Non-Reporting Facilities", followUps.nonReporting.length],
        ["Late Districts", followUps.lateDistricts.length],
        ["Late Reports", followUps.lateReports],
        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],
      ]} />
      <InsightStrip insights={insights} />
      <ProvinceTicker values={provinceTicker} />

      <section className="task-action-layout">
        <ActionTrackerPanel
          title="Priority Actions"
          rows={priorityRows}
          columns={["issue", "provinceDistrict", "actionRequired", "responsible", "dueDate"]}
          getId={(row, index) => `priority-${row.issue || index}-${row.provinceDistrict || ""}`}
        />
        <div className="task-action-stack">
          <ActionTrackerPanel
            title="Facilities That Have Not Reported This Month"
            rows={followUps.nonReporting}
            columns={["province", "district", "facility", "program", "task"]}
            getId={(row, index) => `nonreport-${row.facilityCode || row.facility || index}-${row.program || ""}`}
          />
          <ActionTrackerPanel
            title="Late Reporting Follow-ups"
            rows={followUps.lateDistricts}
            columns={["province", "district", "program", "expected", "reportedLate", "task"]}
            getId={(row, index) => `late-${row.province || ""}-${row.district || index}-${row.program || ""}`}
          />
        </div>
      </section>
    </>
  );
}

function ActionTrackerPanel({ title, rows, columns, getId }) {
  const [expanded, setExpanded] = useState(false);
  const [updates, setUpdates] = useState(() => loadTaskUpdates());

  const saveUpdate = (id, next) => {
    const merged = { ...updates, [id]: { ...(updates[id] || {}), ...next } };
    setUpdates(merged);
    localStorage.setItem("elmis-task-updates", JSON.stringify(merged));
  };

  const content = (
    <div className="action-tracker-table-wrap">
      <table className="action-tracker-table">
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{labelize(column)}</th>)}
            <th>Action Status</th>
            <th>Comment Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const id = getId(row, index);
            const update = updates[id] || {};
            const comments = update.comments || [];
            return (
              <tr key={id}>
                {columns.map((column) => <td key={column}>{formatCell(row[column], column)}</td>)}
                <td className="action-status-cell">
                  <select
                    value={update.status || row.status || "Open"}
                    onChange={(event) => saveUpdate(id, { status: event.target.value })}
                    aria-label={`Action status for ${row.facility || row.district || row.issue || "task"}`}
                  >
                    <option>Open</option>
                    <option>In progress</option>
                    <option>Completed</option>
                  </select>
                </td>
                <td className="comment-status-cell">
                  <CommentButton
                    count={comments.length}
                    onSave={(comment) => saveUpdate(id, { comments: [...comments, comment] })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <div className="empty-action-state">No follow-up actions for the selected filters.</div>}
    </div>
  );

  if (expanded) {
    return (
      <div className="action-expanded-page">
        <div className="action-expanded-header">
          <div>
            <span className="eyebrow">Control Tower Action Tracker</span>
            <h2>{title}</h2>
            <p>{rows.length.toLocaleString()} actionable record{rows.length === 1 ? "" : "s"}</p>
          </div>
          <div className="action-expanded-actions">
            <button type="button" onClick={() => setExpanded(false)}>← Back</button>
            <button type="button" onClick={() => downloadCsv(title, rows)}>Export CSV</button>
            <button type="button" onClick={() => window.print()}>Export PDF</button>
          </div>
        </div>
        <div className="action-expanded-body">{content}</div>
      </div>
    );
  }

  return (
    <article className="panel action-tracker-panel">
      <div className="panel-title-row">
        <h2>{title}</h2>
        <button type="button" className="expand-panel-btn" onClick={() => setExpanded(true)}>Expand ↗</button>
      </div>
      {content}
    </article>
  );
}

function CommentButton({ count, onSave }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim() || !phone.trim() || !comment.trim()) {
      setError("Name, phone number and comment are required.");
      return;
    }
    onSave({
      name: name.trim(),
      phone: phone.trim(),
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    });
    setName("");
    setPhone("");
    setComment("");
    setError("");
    setOpen(false);
  };

  return (
    <div className="comment-control">
      <button type="button" className="comment-count-btn" onClick={() => setOpen(true)}>
        {count} comment{count === 1 ? "" : "s"}
      </button>
      {open && (
        <div className="comment-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="comment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="comment-modal-header">
              <div>
                <span className="eyebrow">Follow-up Comment</span>
                <h3>Add action note</h3>
              </div>
              <button type="button" className="comment-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <label>
              Name <b>*</b>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
            </label>
            <label>
              Phone number <b>*</b>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 0971234567" inputMode="tel" />
            </label>
            <label>
              Comment <b>*</b>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Enter follow-up note, outcome or next action" rows="4" />
            </label>
            {error && <p className="comment-error">{error}</p>}
            <div className="comment-modal-actions">
              <button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" onClick={submit}>Save comment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function loadTaskUpdates() {
  try {
    return JSON.parse(localStorage.getItem("elmis-task-updates") || "{}");
  } catch {
    return {};
  }
}


function HelpDeskPage() {
  const supportSteps = [
    {
      number: "1",
      title: "Report",
      text: "The facility shares the affected workflow, exact error, date and time, and a screenshot where possible."
    },
    {
      number: "2",
      title: "Triage",
      text: "The district superuser checks common account, workflow, reporting, data-quality, and connectivity issues."
    },
    {
      number: "3",
      title: "Coordinate",
      text: "The provincial focal person guides troubleshooting, provides remote support, and records the outcome."
    },
    {
      number: "4",
      title: "Escalate",
      text: "Unresolved, security-related, or system-wide incidents are escalated to the national eLMIS help desk with the evidence and actions already tried."
    }
  ];

  return (
    <section className="hd-page">

      <section className="hd-hero">
        <div className="hd-hero-copy">
          <span className="hd-eyebrow">National Support Network</span>
          <h2>eLMIS Provincial Help Desk</h2>
          <p>
            Provincial help desk focal persons work with district superusers to provide
            fast, local first-tier support to facilities. They diagnose routine eLMIS
            problems, coach users, track each case, and escalate issues that require
            national technical support.
          </p>
        </div>

        <div className="hd-hero-stat">
          <strong>10</strong>
          <b>provinces covered</b>
          <span>Tier 1 local response</span>
        </div>
      </section>

      <section className="hd-section">
        <div className="hd-section-heading">
          <span>Support Pathway</span>
          <h2>How a support request is handled</h2>
        </div>

        <div className="hd-step-grid">
          {supportSteps.map((step) => (
            <article className="hd-step-card" key={step.number}>
              <div className="hd-step-number">{step.number}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="hd-section hd-directory">
        <div className="hd-section-heading">
          <span>Provincial Contacts</span>
          <h2>Find your help desk focal person</h2>
          <p>
            Start with your district superuser. The provincial contact coordinates
            follow-up and escalation when additional help is needed.
          </p>
        </div>

        <div className="hd-contact-grid">
          {helpDeskContacts.map((contact) => {
            const initials =
              `${contact.firstName?.charAt(0) || ""}${contact.lastName?.charAt(0) || ""}`.toUpperCase();

            return (
              <article className="hd-contact-card" key={contact.province}>
                <div className="hd-contact-top">
                  <div className="hd-avatar">{initials}</div>
                  <span className="hd-province">{contact.province}</span>
                </div>

                <h3>{contact.firstName} {contact.lastName}</h3>
                <p>Provincial Help Desk Focal Person</p>

                <a
                  className="hd-phone"
                  href={`tel:+260${String(contact.phone).replace(/^0/, "")}`}
                >
                  {contact.phone}
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="hd-bottom-grid">
        <article className="hd-guidance-card">
          <h3>Before contacting support</h3>
          <ul>
            <li>State your province, district, facility, name, and callback number.</li>
            <li>Describe the affected eLMIS module or task and the exact error message.</li>
            <li>Include the date and time, a screenshot, and the steps already attempted.</li>
            <li>Never share passwords, PINs, or one-time security codes.</li>
          </ul>
        </article>

        <article className="hd-guidance-card">
          <h3>First tier, then escalation</h3>
          <p>
            District superusers handle common operational problems close to the facility.
            Provincial personnel coordinate complex cases, reinforce skills through remote
            guidance or on-the-job support, and send unresolved cases to the national team
            with complete troubleshooting notes.
          </p>

          <div className="hd-escalation-flow">
            <span>Acknowledge</span>
            <b>→</b>
            <span>Diagnose</span>
            <b>→</b>
            <span>Resolve or escalate</span>
            <b>→</b>
            <span>Confirm closure</span>
          </div>
        </article>
      </section>

      <p className="hd-footer-note">
        Support approach informed by Zambia's eLMIS superuser model and established eLMIS help-desk practices.
      </p>

    </section>
  );
}

function LatestUpdatesPage() {
  return (
    <section className="updates-page">

      <section className="updates-hero">
        <div>
          <span className="updates-kicker">eLMIS Newsroom</span>
          <h2>Latest Updates</h2>
          <p>
            System releases, digital-health integration milestones, and provincial
            support initiatives strengthening Zambia's logistics information and
            help-desk network.
          </p>
        </div>

        <div className="updates-hero-meta">
          <span>System update</span>
          <span>Digital integration</span>
          <span>Provincial support</span>
        </div>
      </section>

      <article className="release-story">
        <div className="release-version">
          <span>Facility Edition</span>
          <strong>v4.4.5</strong>
          <small>Now live</small>
        </div>

        <div className="release-copy">
          <span className="story-label">Release Notice</span>
          <h2>eLMIS Facility Edition v4.4.5 is now live</h2>

          <p>
            Kindly note that eLMIS Facility Edition (FE) v4.4.5 has been released.
            One of the key issues resolved is the R&R validation error that caused
            some products to be incorrectly highlighted in red during report submission.
          </p>

          <div className="release-callout">
            <b>What changed</b>
            <span>
              The corrected validation behaviour should help users review and submit
              R&R reports with clearer product-level feedback.
            </span>
          </div>
        </div>
      </article>

      <section className="updates-story-grid">

        <article className="integration-story">
          <div className="integration-mark">
            <span>eLMIS</span>
            <i>↔</i>
            <span>SmartCare</span>
          </div>

          <div className="story-body">
            <span className="story-label">Digital Health Integration</span>
            <h2>Connecting eLMIS and SmartCare</h2>

            <p>
              The integration of eLMIS and SmartCare supports a more connected
              digital-health environment by improving the flow of service and
              logistics information between systems.
            </p>

            <p>
              The goal is to reduce duplicate data entry, strengthen data consistency,
              and make timely commodity information more useful for reporting,
              planning and supply-chain decision-making.
            </p>
          </div>
        </article>

        <article className="support-impact">
          <div className="story-body">
            <span className="story-label">Provincial Help Desks</span>
            <h2>Equipment strengthens first-tier support</h2>

            <p>
              The Chief Pharmacist – Logistics, Mr. Luke Alutuli, has officially
              handed over laptops and Bluetooth headsets to Northern Province and
              Western Province eLMIS experts as part of the Ministry's continued
              work to strengthen provincial eLMIS Help Desks.
            </p>

            <p>
              The equipment will improve communication during troubleshooting and
              remote guidance, helping provincial teams provide faster, better-
              coordinated technical assistance.
            </p>

            <div className="impact-points">
              <span><b>Faster response</b> for facility support requests</span>
              <span><b>Remote guidance</b> for district teams and users</span>
              <span><b>Better coordination</b> across the national supply chain</span>
            </div>
          </div>
        </article>

      </section>


      <section className="updates-gallery">
        <div className="section-heading">
          <span>In Pictures</span>
          <h2>Provincial help-desk equipment handover</h2>
          <p>
            The initiative supports the Ministry's target for every province to establish
            a first-tier help desk for timely troubleshooting, improved reporting, and
            stronger digital logistics management.
          </p>
        </div>

        <div className="handover-photo-grid">
          <figure className="handover-photo featured">
            <img
              src="./latest-updates/help-desk-handover-western.jpeg"
              alt="Chief Pharmacist Logistics presenting help-desk equipment to a provincial eLMIS expert"
            />
            <figcaption>
              The Chief Pharmacist – Logistics presents help-desk equipment to a provincial eLMIS expert.
            </figcaption>
          </figure>

          <figure className="handover-photo">
            <img
              src="./latest-updates/help-desk-recipients.jpeg"
              alt="Provincial recipients with help-desk support equipment"
            />
            <figcaption>
              Provincial recipients with the laptop and Bluetooth headset support package.
            </figcaption>
          </figure>

          <figure className="handover-photo">
            <img
              src="./latest-updates/help-desk-handover-northern.jpeg"
              alt="Official handover of provincial eLMIS support equipment"
            />
            <figcaption>
              Official handover of a laptop and Bluetooth headset for provincial eLMIS support.
            </figcaption>
          </figure>

          <figure className="handover-photo">
            <img
              src="./latest-updates/help-desk-handover-headset.jpeg"
              alt="Bluetooth headset and laptop supplied to strengthen eLMIS troubleshooting"
            />
            <figcaption>
              Bluetooth headset and laptop supplied to strengthen real-time troubleshooting.
            </figcaption>
          </figure>

          <figure className="handover-photo">
            <img
              src="./latest-updates/help-desk-handover-laptop.jpeg"
              alt="Equipment handover supporting the provincial first-tier help-desk model"
            />
            <figcaption>
              Equipment handover supporting the provincial first-tier help-desk model.
            </figcaption>
          </figure>
        </div>
      </section>


    </section>
  );
}

function TrainingsPage({ totals, participants, provinceCards }) {
  const trainingByProvince = provinceCards
    .filter((item) => item.training > 0)
    .sort((a, b) => b.training - a.training)
    .slice(0, 10)
    .map((item) => ({ label: item.province, value: item.training }));
  const targetGap = provinceCards.filter((item) => item.training < 5).length;

  return (
    <>
      <KpiGrid items={[
        ["Total Trained", participants.length],
        ["Experts Trained", totals.experts],
        ["Superusers Trained", totals.superusers],
        ["Users Trained", totals.users],
        ["Training Districts", totals.trainingDistricts],
      ]} />
      <section className="training-hero panel">
        <div>
          <span className="eyebrow">Photo Highlights</span>
          <h2>Kafue Experts Training</h2>
          <p>Hands-on eLMIS capacity building sessions connecting trained users to facility reporting performance, late reporting follow-up, and supply chain visibility.</p>
        </div>
        <div className="training-hero-stat">
          <strong>{targetGap}</strong>
          <span>provinces need additional training coverage</span>
        </div>
      </section>
      <section className="photo-grid">
        {trainingHighlights.map(([file, title, caption]) => (
          <figure key={file} className="photo-card">
            <img src={`./training-highlights/${file}`} alt={title} />
            <figcaption>
              <b>{title}</b>
              <span>{caption}</span>
            </figcaption>
          </figure>
        ))}
      </section>
      <section className="grid three">
        <Panel title="Training by Province"><BarChart values={trainingByProvince} max={Math.max(...trainingByProvince.map((item) => item.value), 1)} /></Panel>
        <Panel title="Province Reporting and Training"><ProvincePerformanceCards values={provinceCards} /></Panel>
        <Panel title="Training Insight Labels">
          <div className="insight-list">
            <p>Training coverage has improved but remains below target in selected provinces.</p>
            <p>Expert and superuser sessions should be prioritized where reporting or timeliness remains below the national average.</p>
            <p>Facility mentorship photos document the support model used to close reporting gaps after classroom training.</p>
          </div>
        </Panel>
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
  const professionRows = Object.entries(professionCounts).map(([profession, count]) => ({ profession, count }));

  return (
    <>
      <KpiGrid items={[
        { label: "Issues Resolved", value: totals.issuesResolved, title: "Resolved Training and Support Issues", rows: facilityTraining.filter((row) => Number(row.reportingRate) >= 100), columns: ["district", "facility", "trained", "reportingRate", "timeliness"] },
        { label: "Superusers Trained", value: totals.superusers, title: "Superusers Trained", rows: superusers, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
        { label: "Experts Trained", value: totals.experts, title: "Experts Trained", rows: experts, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
        { label: "Users Trained", value: totals.users, title: "Users Trained", rows: users, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
        { label: "Training Districts", value: totals.trainingDistricts, title: "Training District Coverage", rows: unique(participants.map((p) => `${p.province}|${p.district}`)).map((key) => { const [province, district] = key.split("|"); return { province, district, trained: participants.filter((p) => p.province === province && p.district === district).length }; }), columns: ["province", "district", "trained"] },
      ]} />
      <section className="grid training-grid">
        <div className="stack">
          <Panel title="List of Experts" detailRows={experts} detailColumns={["province", "district", "facility", "firstName", "lastName", "profession", "phone"]}><PeopleTable rows={experts} /></Panel>
          <Panel title="List of Superusers" detailRows={superusers} detailColumns={["province", "district", "facility", "firstName", "lastName", "profession", "phone"]}><PeopleTable rows={superusers} /></Panel>
          <Panel title="List of Users" detailRows={users} detailColumns={["province", "district", "facility", "firstName", "lastName", "profession", "phone"]}><PeopleTable rows={users} /></Panel>
        </div>
        <div className="stack">
          <Panel title="Participant Professions by Province" detailRows={professionRows} detailColumns={["profession", "count"]}><StackedBar counts={professionCounts} /></Panel>
          <Panel title="Ratio of Professions" detailRows={professionRows} detailColumns={["profession", "count"]}><Donut counts={professionCounts} /></Panel>
          <Panel title="Training Connected to Facility KPIs" detailRows={facilityTraining} detailColumns={["province", "district", "facility", "trained", "reportingRate", "timeliness"]}><DataTable rows={facilityTraining} columns={["district", "facility", "trained", "reportingRate", "timeliness"]} /></Panel>
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
            className={`kpi ${card.tone ? `kpi-${card.tone}` : ""} ${clickable ? "clickable" : ""}`.trim()}
            key={card.label}
            onClick={clickable ? () => openDetailWindow(card.title || card.label, card.rows, card.columns) : undefined}
          >
            <div className="kpi-label-row">
              {card.icon && <i className="kpi-icon" aria-hidden="true">{card.icon}</i>}
              <span>{card.label}</span>
            </div>
            <strong>{card.value}</strong>
          </button>
        );
      })}
    </section>
  );
}

function Panel({ title, children, className = "", detailRows, detailColumns }) {
  const expandable = Array.isArray(detailRows) && Array.isArray(detailColumns);
  return <article className={`panel ${className}`.trim()}>
    <div className="panel-heading"><h2>{title}</h2>{expandable && <button type="button" className="panel-expand" onClick={() => openDetailWindow(title, detailRows, detailColumns)}>Expand ↗</button>}</div>
    {children}
  </article>;
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

function PageTicker({ activePage, totals, participants, followUps, period, province }) {
  const scope = province === "All" ? "National" : province;
  const messages = {
    executive: `${period} | ${scope} reporting ${totals.reportingRate.toFixed(1)}% | Timeliness ${totals.timeliness.toFixed(1)}% | ${totals.nonReportingFacilities ?? totals.nonReporting} non-reporting facilities | ${participants.length} trained eLMIS personnel`,
    reports: `${period} | ${scope} reporting ${totals.reportingRate.toFixed(1)}% | ${totals.facilitiesReported ?? totals.reporting} facilities reported | ${totals.nonReportingFacilities ?? totals.nonReporting} non-reporting facilities | ${totals.districts} districts`,
    training: `${participants.length} trained eLMIS personnel | ${totals.experts} experts | ${totals.superusers} superusers | ${totals.users} users`,
    tasks: `${totals.nonReportingFacilities ?? totals.nonReporting} facilities require reporting follow-up | ${followUps.lateDistricts.length} late-reporting follow-ups`,
    trainings: `${participants.length} trained eLMIS personnel | ${totals.trainingDistricts} training districts | ${totals.experts} experts | ${totals.superusers} superusers`,
    helpdesk: `eLMIS Help Desk | Provincial support contacts across all 10 provinces | Escalate unresolved issues through the national support pathway`,
    updates: `Latest eLMIS updates | System support, integration, training and implementation milestones | NSCCU Control Tower`,
  };
  const tickerText = messages[activePage] || messages.executive;
  return <div className="ticker page-ticker"><div className="ticker-track"><span>{tickerText}</span><span>{tickerText}</span></div></div>;
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

function InsightStrip({ insights }) {
  if (!insights.length) return null;
  return (
    <section className="insight-strip" aria-label="Dashboard insights">
      {insights.map((insight) => (
        <article key={insight.text} className={`insight ${insight.tone}`}>
          <div className="insight-heading">
            <i aria-hidden="true">{insightIcon(insight.label)}</i>
            <b>{insight.label}</b>
          </div>
          <span>{insight.text}</span>
        </article>
      ))}
    </section>
  );
}

function insightIcon(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("reporting")) return "△";
  if (key.includes("arv")) return "◇";
  if (key.includes("training")) return "◎";
  return "•";
}

function PriorityActionList({ rows }) {
  if (!rows.length) return <div className="empty-state">No priority actions for the current selection.</div>;

  return (
    <div className="priority-action-list">
      {rows.map((row, index) => {
        const status = String(row.status || "Open");
        const statusClass = status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const severity = /facility has not reported|low reporting/i.test(row.issue || "") ? "critical" : /late/i.test(row.issue || "") ? "warning" : "info";
        return (
          <article key={`${row.issue}-${index}`} className={`priority-action priority-${severity}`}>
            <div className="priority-copy">
              <strong>{row.issue}</strong>
              <span>{row.provinceDistrict}</span>
              <small>{row.actionRequired}</small>
              <em>{row.responsible}{row.dueDate ? ` · due ${row.dueDate}` : ""}</em>
            </div>
            <span className={`status-badge status-${statusClass}`}>{status}</span>
          </article>
        );
      })}
    </div>
  );
}

function ProvincePerformanceCards({ values }) {
  const sorted = [...values].sort((a, b) => a.reportingRate - b.reportingRate);
  return (
    <div className="province-card-grid">
      {sorted.map((item) => (
        <article className="province-card" key={item.province}>
          <div>
            <b>{item.province}</b>
            <span>{item.training.toLocaleString()} trained</span>
          </div>
          <strong>{item.reportingRate.toFixed(1)}%</strong>
          <small>{item.reporting.toLocaleString()} of {item.expected.toLocaleString()} reports received</small>
          <div className="mini-meter"><i style={{ width: `${Math.min(item.reportingRate, 100)}%` }} /></div>
        </article>
      ))}
    </div>
  );
}

function ProvincePerformanceMap({ values }) {
  const mapRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    loadGoogleGeoChart()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const google = window.google;
        const data = google.visualization.arrayToDataTable([
          ["Province", "Reporting Rate"],
          ...values.map((item) => [googleProvinceName(item.province), Number(item.reportingRate.toFixed(1))]),
        ]);
        const chart = new google.visualization.GeoChart(mapRef.current);
        chart.draw(data, {
          region: "ZM",
          resolution: "provinces",
          displayMode: "regions",
          backgroundColor: "transparent",
          datalessRegionColor: "#e6ece9",
          defaultColor: "#e6ece9",
          colorAxis: {
            minValue: 80,
            maxValue: 100,
            colors: ["#b42318", "#a96e00", "#147a46"],
          },
          legend: "none",
          tooltip: {
            textStyle: { color: "#14231e", fontSize: 13 },
          },
        });
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [values]);

  return (
    <div className="zambia-map-wrap">
      <div ref={mapRef} className="google-zambia-map" aria-label="Google map of Zambia provincial reporting performance" />
      {mapStatus === "loading" && <div className="map-message">Loading Google map...</div>}
      {mapStatus === "error" && <div className="map-message">Google map could not load. Check internet access and refresh the page.</div>}
      <ProvinceMapLabels values={values} />
      <div className="map-legend">
        <span><i className="good" />95%+</span>
        <span><i className="watch" />90-94%</span>
        <span><i className="risk" />Below 90%</span>
      </div>
    </div>
  );
}

function ProvinceMapLabels({ values }) {
  return (
    <div className="map-label-grid">
      {values.map((item) => (
        <span key={item.province}>
          <b>{item.province}</b>
          <em>{item.reportingRate.toFixed(1)}%</em>
        </span>
      ))}
    </div>
  );
}

function loadGoogleGeoChart() {
  if (window.google?.visualization?.GeoChart) return Promise.resolve();
  if (window.googleGeoChartPromise) return window.googleGeoChartPromise;
  window.googleGeoChartPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.gstatic.com/charts/loader.js"]');
    const loadCharts = () => {
      if (!window.google?.charts) {
        reject(new Error("Google Charts loader unavailable"));
        return;
      }
      window.google.charts.load("current", { packages: ["geochart"] });
      window.google.charts.setOnLoadCallback(resolve);
    };
    if (existing) {
      existing.addEventListener("load", loadCharts, { once: true });
      existing.addEventListener("error", reject, { once: true });
      loadCharts();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.gstatic.com/charts/loader.js";
    script.async = true;
    script.onload = loadCharts;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.googleGeoChartPromise;
}

function googleProvinceName(province) {
  const names = {
    "North Western": "North-Western",
  };
  return names[province] || province;
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
          <button type="button" className="detail-back" onClick={() => { window.location.hash = ""; }}>← Back to Dashboard</button>
          <button type="button" onClick={() => window.print()}>Export PDF</button>
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

function MonthlyTrendChart({ values }) {
  const series = [
    { key: "Essential Medicine", label: "EM", color: "#147a46" },
    { key: "Antiretroviral Drugs", label: "ARV", color: "#195e8f" },
  ];
  const toPoints = (key) => values.map((item, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 94 - ((item[key] || 0) / 100) * 84;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="trend-wrap">
      <div className="trend-legend">
        {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}
      </div>
      <svg className="trend-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        {series.map((item) => <polyline key={item.key} points={toPoints(item.key)} style={{ stroke: item.color }} />)}
      </svg>
      <div className="chart-axis">{values.map((item) => <span key={item.label}>{item.label}</span>)}</div>
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

function provinceTrainingPerformance(provinceStats, traineeRows) {
  const trainingByProvince = countBy(traineeRows, "province");
  return provinceStats.map((item) => ({
    ...item,
    training: trainingByProvince[item.province] || 0,
  }));
}

function monthlyProgramTrends(rows, province, district) {
  const programs = ["Essential Medicine", "Antiretroviral Drugs"];
  const scopedRows = rows.filter((row) => (
    (province === "All" || row.province === province) &&
    (district === "All" || row.district === district) &&
    programs.includes(row.program)
  ));
  return sortPeriods(unique(scopedRows.map((row) => row.period))).map((period) => {
    const record = { label: period.replace(" 2026", "").replace(" 2025", "") };
    programs.forEach((program) => {
      const items = scopedRows.filter((row) => row.period === period && row.program === program);
      const reporting = items.filter((row) => isReporting(row)).length;
      record[program] = items.length ? (reporting / items.length) * 100 : 0;
    });
    return record;
  });
}

function buildInsights(provinceStats, statusRows, traineeRows) {
  if (!provinceStats.length) return [];
  const lowest = [...provinceStats].sort((a, b) => a.reportingRate - b.reportingRate)[0];
  const arvProvince = provincePerformance(statusRows.filter((row) => row.program === "Antiretroviral Drugs")).sort((a, b) => a.reportingRate - b.reportingRate)[0] || lowest;
  const trainingByProvince = countBy(traineeRows, "province");
  const lowestTraining = [...provinceStats].sort((a, b) => (trainingByProvince[a.province] || 0) - (trainingByProvince[b.province] || 0))[0];
  return [
    {
      label: "Reporting gap",
      tone: lowest.reportingRate < 95 ? "risk" : "good",
      text: `${lowest.province} requires follow-up due to ${lowest.reportingRate.toFixed(1)}% reporting.`,
    },
    {
      label: "ARV focus",
      tone: arvProvince.reportingRate < 95 ? "warning" : "good",
      text: `${arvProvince.province} requires follow-up due to low ARV reporting.`,
    },
    {
      label: "Training coverage",
      tone: "info",
      text: `Training coverage has improved but remains below target in ${lowestTraining.province}.`,
    },
  ];
}

function priorityActions(followUps, provinceStats, traineeRows) {
  const dueSoon = addDays(new Date(), 7);
  const dueLater = addDays(new Date(), 14);
  const lowestProvince = [...provinceStats].sort((a, b) => a.reportingRate - b.reportingRate)[0];
  const trainingByProvince = countBy(traineeRows, "province");
  const lowestTraining = [...provinceStats].sort((a, b) => (trainingByProvince[a.province] || 0) - (trainingByProvince[b.province] || 0))[0];
  const firstNonReporting = followUps.nonReporting[0];
  const firstLate = followUps.lateDistricts[0];
  return [
    firstNonReporting && {
      issue: "Facility has not reported",
      provinceDistrict: `${firstNonReporting.province} / ${firstNonReporting.district}`,
      actionRequired: "Call facility focal person and confirm submission barrier",
      responsible: "District eLMIS focal point",
      dueDate: dueSoon,
      status: "Open",
    },
    firstLate && {
      issue: "Late reporting",
      provinceDistrict: `${firstLate.province} / ${firstLate.district}`,
      actionRequired: "Review late submissions and reinforce reporting deadline",
      responsible: "Provincial pharmacist",
      dueDate: dueSoon,
      status: "In progress",
    },
    lowestProvince && {
      issue: "Low reporting performance",
      provinceDistrict: lowestProvince.province,
      actionRequired: "Run targeted control tower review with district teams",
      responsible: "NSCCU Control Tower",
      dueDate: dueLater,
      status: lowestProvince.reportingRate >= 95 ? "Monitoring" : "Open",
    },
    lowestTraining && {
      issue: "Training coverage gap",
      provinceDistrict: lowestTraining.province,
      actionRequired: "Schedule refresher training and superuser mentorship",
      responsible: "Training coordinator",
      dueDate: dueLater,
      status: "Planned",
    },
  ].filter(Boolean);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
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
  window.location.hash = `detail=${encodeURIComponent(key)}`;
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
