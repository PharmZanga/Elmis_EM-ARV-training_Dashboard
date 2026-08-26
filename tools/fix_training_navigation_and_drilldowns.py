from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src" / "main.jsx"
STYLES = ROOT / "src" / "styles.css"
text = MAIN.read_text(encoding="utf-8")
styles = STYLES.read_text(encoding="utf-8")

# -----------------------------------------------------------------------------
# 1. Restore Help Desk and Latest Updates with safe, self-contained components.
# -----------------------------------------------------------------------------
help_pattern = re.compile(r"function HelpDeskPage\([\s\S]*?\nfunction LatestUpdatesPage\(", re.M)
help_match = help_pattern.search(text)
if help_match:
    safe_help = r'''function HelpDeskPage() {
  return (
    <section className="support-page-safe">
      <section className="panel support-hero-safe">
        <div>
          <span className="eyebrow">eLMIS Support Network</span>
          <h2>National Help Desk</h2>
          <p>Provincial focal points provide first-line eLMIS support, escalation and follow-up for unresolved reporting, access and system issues.</p>
        </div>
        <div className="support-hero-stat"><strong>{helpDeskContacts.length}</strong><span>provincial support contacts</span></div>
      </section>
      <section className="support-contact-grid-safe">
        {helpDeskContacts.map((contact) => (
          <article className="support-contact-card-safe" key={contact.province}>
            <span>{contact.province}</span>
            <h3>{contact.firstName} {contact.lastName}</h3>
            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
            <small>Provincial eLMIS focal point</small>
          </article>
        ))}
      </section>
      <section className="grid three">
        <Panel title="Support Pathway"><div className="insight-list"><p>1. Facility raises the issue with the district or provincial eLMIS focal point.</p><p>2. The focal point resolves first-line issues and records unresolved cases.</p><p>3. Complex issues are escalated to the national eLMIS support team.</p></div></Panel>
        <Panel title="What to Include"><div className="insight-list"><p>Facility name and code, district, programme, screenshot/error message and contact details.</p><p>For reporting issues, include the reporting period and affected report.</p></div></Panel>
        <Panel title="Escalation Principle"><div className="insight-list"><p>Prioritise issues affecting reporting, ordering, dispensing, stock visibility or multiple facilities.</p><p>Close the loop by confirming resolution with the reporting facility.</p></div></Panel>
      </section>
    </section>
  );
}

function LatestUpdatesPage('''
    text = text[:help_match.start()] + safe_help + text[help_match.end():]

updates_pattern = re.compile(r"function LatestUpdatesPage\([\s\S]*?\nfunction ", re.M)
updates_match = updates_pattern.search(text)
if updates_match:
    next_function = updates_match.group(0).splitlines()[-1]
    safe_updates = r'''function LatestUpdatesPage() {
  const updates = [
    { date: "26 Aug 2026", title: "Facility metadata reconciliation", body: "Dashboard facility hierarchy aligned to the operational eLMIS master and geographic hierarchy." },
    { date: "26 Aug 2026", title: "Interactive reporting drilldowns", body: "Reporting, training and follow-up views now support detailed drilldowns with export actions." },
    { date: "21 Aug 2026", title: "eLMIS partner coordination", body: "SmartCare–eLMIS integration and partner support updates reviewed through the LMIS CCB coordination mechanism." },
  ];
  return (
    <section className="updates-safe-page">
      <section className="panel updates-safe-hero">
        <span className="eyebrow">System & Implementation Updates</span>
        <h2>Latest eLMIS Updates</h2>
        <p>Key dashboard, support, integration and implementation developments for the national eLMIS programme.</p>
      </section>
      <section className="updates-safe-grid">
        {updates.map((item) => <article className="panel update-safe-card" key={item.title}><span>{item.date}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}
      </section>
    </section>
  );
}

'''
    # Preserve the next function declaration after the replacement.
    text = text[:updates_match.start()] + safe_updates + next_function + text[updates_match.end():]

# -----------------------------------------------------------------------------
# 2. Training Linkages: all KPI cards and analytical panels drill down.
# -----------------------------------------------------------------------------
train_pattern = re.compile(r"function TrainingPage\([\s\S]*?\nfunction KpiGrid\(", re.M)
train_match = train_pattern.search(text)
if train_match:
    new_training = r'''function TrainingPage({ totals, participants, facilityKpis }) {
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

function KpiGrid('''
    text = text[:train_match.start()] + new_training + text[train_match.end():]

# -----------------------------------------------------------------------------
# 3. Trainings page: sticky KPI row + full province report + clickable cards.
# -----------------------------------------------------------------------------
trainings_pattern = re.compile(r"function TrainingsPage\([\s\S]*?\nfunction HelpDeskPage\(", re.M)
trainings_match = trainings_pattern.search(text)
if trainings_match:
    new_trainings = r'''function TrainingsPage({ totals, participants, provinceCards }) {
  const trainingByProvince = countBy(participants, "province");
  const trainingProvinceRows = Object.entries(trainingByProvince).map(([province, trained]) => ({ province, trained }));
  const experts = participants.filter((person) => person.role === "Expert");
  const superusers = participants.filter((person) => person.role === "Superuser");
  const users = participants.filter((person) => person.role === "User");
  const districtRows = unique(participants.map((p) => `${p.province}|${p.district}`)).map((key) => {
    const [province, district] = key.split("|");
    return { province, district, trained: participants.filter((p) => p.province === province && p.district === district).length };
  });
  const provinceReportRows = provinceCards.map((row) => ({
    province: row.province,
    trained: row.training,
    reportingRate: Number(row.reportingRate || 0).toFixed(1) + "%",
    reportsReceived: row.reporting,
    reportsExpected: row.expected,
  }));

  return (
    <>
      <div className="training-sticky-kpis">
        <KpiGrid items={[
          { label: "Total Trained", value: participants.length, title: "All Trained eLMIS Personnel", rows: participants, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "role", "phone"] },
          { label: "Experts Trained", value: totals.experts, title: "Experts Trained", rows: experts, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
          { label: "Superusers Trained", value: totals.superusers, title: "Superusers Trained", rows: superusers, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
          { label: "Users Trained", value: totals.users, title: "Users Trained", rows: users, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "phone"] },
          { label: "Training Districts", value: totals.trainingDistricts, title: "Training District Coverage", rows: districtRows, columns: ["province", "district", "trained"] },
        ]} />
      </div>

      <section className="training-hero panel">
        <div><span className="eyebrow">Training Coverage</span><h2>eLMIS Capacity Building</h2><p>Training coverage linked to reporting performance, facility support and the national eLMIS implementation network.</p></div>
        <div className="training-hero-stat"><strong>{participants.length}</strong><span>trained personnel in selected scope</span></div>
      </section>

      <section className="grid three">
        <Panel title="Training by Province" detailRows={trainingProvinceRows} detailColumns={["province", "trained"]}><BarChart values={Object.entries(trainingByProvince).map(([label, value]) => ({ label, value }))} max={Math.max(...Object.values(trainingByProvince), 1)} /></Panel>
        <Panel title="Province Reporting and Training" detailRows={provinceReportRows} detailColumns={["province", "trained", "reportingRate", "reportsReceived", "reportsExpected"]}><InteractiveProvincePerformanceCards values={provinceCards} /></Panel>
        <Panel title="Training Insight Labels"><div className="insight-list"><p>Use province and district filters to review coverage gaps.</p><p>Prioritise expert and superuser support where reporting or timeliness is below target.</p><p>Click any KPI or province card to open a full report with export actions.</p></div></Panel>
      </section>
    </>
  );
}

function InteractiveProvincePerformanceCards({ values }) {
  return (
    <div className="province-card-grid">
      {[...values].sort((a, b) => a.reportingRate - b.reportingRate).map((item) => {
        const rows = [{
          province: item.province,
          trained: item.training,
          reportingRate: `${Number(item.reportingRate || 0).toFixed(1)}%`,
          reportsReceived: item.reporting,
          reportsExpected: item.expected,
          reportingGap: Math.max(Number(item.expected || 0) - Number(item.reporting || 0), 0),
        }];
        return (
          <button type="button" className="province-card province-card-button" key={item.province} onClick={() => openDetailWindow(`${item.province} Training and Reporting Report`, rows, ["province", "trained", "reportingRate", "reportsReceived", "reportsExpected", "reportingGap"])}>
            <div><b>{item.province}</b><span>{item.training.toLocaleString()} trained</span></div>
            <strong>{item.reportingRate.toFixed(1)}%</strong>
            <small>{item.reporting.toLocaleString()} of {item.expected.toLocaleString()} reports received</small>
            <div className="mini-meter"><i style={{ width: `${Math.min(item.reportingRate, 100)}%` }} /></div>
            <em>View full report ↗</em>
          </button>
        );
      })}
    </div>
  );
}

function HelpDeskPage('''
    text = text[:trainings_match.start()] + new_trainings + text[trainings_match.end():]

MAIN.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# 4. Styling for restored pages and drilldowns.
# -----------------------------------------------------------------------------
extra_css = r'''

/* Training drilldowns and support-page recovery */
.training-sticky-kpis {
  position: sticky;
  top: 118px;
  z-index: 8;
  padding-top: 2px;
  background: linear-gradient(var(--bg) 80%, rgba(245,247,246,0));
}

.training-sticky-kpis .kpi-grid { margin-bottom: 14px; }

.province-card-button {
  width: 100%;
  border: 1px solid #dbe7e2;
  text-align: left;
  font: inherit;
  cursor: pointer;
}

.province-card-button:hover,
.province-card-button:focus-visible {
  border-color: #83c59f;
  box-shadow: 0 12px 26px rgba(20,122,70,.13);
  transform: translateY(-1px);
}

.province-card-button em {
  color: var(--green);
  font-size: .72rem;
  font-style: normal;
  font-weight: 900;
}

.support-page-safe,
.updates-safe-page { display: grid; gap: 18px; }

.support-hero-safe,
.updates-safe-hero {
  min-height: auto;
  padding: 28px;
  border: 0;
  background: linear-gradient(120deg, #053429, #0c6a4c);
  color: #fff;
}

.support-hero-safe {
  display: grid;
  grid-template-columns: minmax(0,1fr) 190px;
  gap: 22px;
  align-items: center;
}

.support-hero-safe h2,
.updates-safe-hero h2 { margin: 0 0 10px; color: #fff; }
.support-hero-safe p,
.updates-safe-hero p { margin: 0; color: #dff3e8; line-height: 1.55; }
.support-hero-stat { display:grid; place-items:center; gap:5px; padding:18px; border:1px solid rgba(255,255,255,.22); border-radius:12px; background:rgba(255,255,255,.10); text-align:center; }
.support-hero-stat strong { font-size:2.5rem; }
.support-hero-stat span { color:#dff3e8; font-size:.8rem; font-weight:800; }

.support-contact-grid-safe { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; }
.support-contact-card-safe { display:grid; gap:6px; padding:16px; border:1px solid var(--line); border-radius:12px; background:#fff; box-shadow:0 8px 20px rgba(19,35,30,.05); }
.support-contact-card-safe > span { color:var(--green); font-size:.75rem; font-weight:900; text-transform:uppercase; }
.support-contact-card-safe h3 { margin:0; color:var(--header); }
.support-contact-card-safe a { color:var(--green); font-weight:900; text-decoration:none; }
.support-contact-card-safe small { color:var(--muted); }

.updates-safe-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; }
.update-safe-card { min-height:180px; padding:20px; }
.update-safe-card > span { color:var(--green); font-size:.78rem; font-weight:900; }
.update-safe-card h3 { margin:10px 0 8px; color:var(--header); }
.update-safe-card p { margin:0; color:var(--muted); line-height:1.5; }

@media(max-width:1120px){
  .training-sticky-kpis { position: static; }
  .support-hero-safe { grid-template-columns:1fr; }
}
'''
if "/* Training drilldowns and support-page recovery */" not in styles:
    styles += extra_css
STYLES.write_text(styles, encoding="utf-8")

print(f"Updated {MAIN}")
print(f"Updated {STYLES}")
print("Restored Help Desk/Latest Updates, added Training Linkages drilldowns, sticky Trainings KPI row, clickable province reports, and export-ready detail views.")
