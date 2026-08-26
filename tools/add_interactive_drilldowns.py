from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
main = root / 'src' / 'main.jsx'
styles_path = root / 'src' / 'styles.css'
text = main.read_text(encoding='utf-8')
styles = styles_path.read_text(encoding='utf-8')

# Page ticker above filters on every tab.
marker = '        <section className="content">\n'
if '<PageTicker activePage={activePage}' not in text:
    text = text.replace(marker, marker + '''          <PageTicker activePage={activePage} totals={totals} participants={filteredParticipants} followUps={followUps} period={selectedPeriod} province={selectedProvince} />\n''', 1)
text = text.replace('      <ProvinceTicker values={provinceTicker} />\n', '', 2)

# Interactive executive KPI cards.
exec_old = '''      <KpiGrid items={[\n        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],\n        ["Timeliness", `${totals.timeliness.toFixed(1)}%`],\n        ["Trained eLMIS Personnel", participants.length],\n        ["Non-Reporting Facilities", totals.nonReportingFacilities],\n        ["Late Follow-ups", followUps.lateDistricts.length],\n      ]} />'''
exec_new = '''      <KpiGrid items={[\n        { label: "Reporting Rate", value: `${totals.reportingRate.toFixed(1)}%`, title: "Reporting Rate Details", rows: statusRows, columns: ["province", "district", "facility", "program", "status", "reportingRate"] },\n        { label: "Timeliness", value: `${totals.timeliness.toFixed(1)}%`, title: "Reporting Timeliness Details", rows: statusRows, columns: ["province", "district", "facility", "program", "timeliness", "status"] },\n        { label: "Trained eLMIS Personnel", value: participants.length, title: "Trained eLMIS Personnel", rows: participants, columns: ["province", "district", "facility", "firstName", "lastName", "profession", "role"] },\n        { label: "Non-Reporting Facilities", value: totals.nonReportingFacilities, title: "Non-Reporting Facilities", rows: statusRows.filter((row) => row.status === "NON_REPORTING"), columns: ["province", "district", "facility", "program", "status"] },\n        { label: "Late Follow-ups", value: followUps.lateDistricts.length, title: "Late Reporting Follow-ups", rows: followUps.lateDistricts, columns: ["province", "district", "program", "reportedLate", "timeliness", "task"] },\n      ]} />'''
if exec_old in text:
    text = text.replace(exec_old, exec_new, 1)

# Generic expandable panel.
panel_old = 'function Panel({ title, children, className = "" }) {\n  return <article className={`panel ${className}`.trim()}><h2>{title}</h2>{children}</article>;\n}'
panel_new = '''function Panel({ title, children, className = "", detailRows, detailColumns }) {\n  const expandable = Array.isArray(detailRows) && Array.isArray(detailColumns);\n  return <article className={`panel ${className}`.trim()}>\n    <div className="panel-heading"><h2>{title}</h2>{expandable && <button type="button" className="panel-expand" onClick={() => openDetailWindow(title, detailRows, detailColumns)}>Expand ↗</button>}</div>\n    {children}\n  </article>;\n}'''
if panel_old in text:
    text = text.replace(panel_old, panel_new, 1)

# Make all eLMIS Reports panels expandable.
repls = {
'<Panel title="Reporting Rate by Facility"><DataTable': '<Panel title="Reporting Rate by Facility" detailRows={statusRows} detailColumns={["province", "district", "facility", "program", "reportingRate", "status"]}><DataTable',
'<Panel title="Reporting Timeliness"><DataTable': '<Panel title="Reporting Timeliness" detailRows={statusRows} detailColumns={["province", "district", "facility", "program", "timeliness", "status"]}><DataTable',
'<Panel title="Reporting Status"><DataTable': '<Panel title="Reporting Status" detailRows={statusRows} detailColumns={["province", "district", "facility", "status"]}><DataTable',
'<Panel title="Facility Reporting vs Non-Reporting"><Pie': '<Panel title="Facility Reporting vs Non-Reporting" detailRows={statusRows} detailColumns={["province", "district", "facility", "status"]}><Pie',
'<Panel title="Report Submission Distribution"><LineChart': '<Panel title="Report Submission Distribution" detailRows={submissionTrend} detailColumns={["label", "value"]}><LineChart',
'<Panel title="Reporting Rate by District"><BarChart': '<Panel title="Reporting Rate by District" detailRows={districtRows} detailColumns={["district", "reportingRate"]}><BarChart',
'<Panel title="Zambia Provincial Performance" className="map-panel"><ProvincePerformanceMap': '<Panel title="Zambia Provincial Performance" className="map-panel" detailRows={provinceCards} detailColumns={["province", "reportingRate", "reporting", "expected", "training"]}><ProvincePerformanceMap',
'<Panel title="Monthly EM and ARV Reporting Trends"><MonthlyTrendChart': '<Panel title="Monthly EM and ARV Reporting Trends" detailRows={monthlyTrends} detailColumns={["label", "Essential Medicine", "Antiretroviral Drugs"]}><MonthlyTrendChart',
}
for old, new in repls.items():
    text = text.replace(old, new)

# Page-specific ticker component.
if 'function PageTicker({' not in text:
    pt = '''function PageTicker({ activePage, totals, participants, followUps, period, province }) {\n  const scope = province === "All" ? "National" : province;\n  const messages = {\n    executive: `${period} | ${scope} reporting ${totals.reportingRate.toFixed(1)}% | Timeliness ${totals.timeliness.toFixed(1)}% | ${totals.nonReportingFacilities ?? totals.nonReporting} non-reporting facilities | ${participants.length} trained eLMIS personnel`,\n    reports: `${period} | ${scope} reporting ${totals.reportingRate.toFixed(1)}% | ${totals.facilitiesReported ?? totals.reporting} facilities reported | ${totals.nonReportingFacilities ?? totals.nonReporting} non-reporting facilities | ${totals.districts} districts`,\n    training: `${participants.length} trained eLMIS personnel | ${totals.experts} experts | ${totals.superusers} superusers | ${totals.users} users`,\n    tasks: `${totals.nonReportingFacilities ?? totals.nonReporting} facilities require reporting follow-up | ${followUps.lateDistricts.length} late-reporting follow-ups`,\n    trainings: `${participants.length} trained eLMIS personnel | ${totals.trainingDistricts} training districts | ${totals.experts} experts | ${totals.superusers} superusers`,\n    helpdesk: `eLMIS Help Desk | Provincial support contacts across all 10 provinces | Escalate unresolved issues through the national support pathway`,\n    updates: `Latest eLMIS updates | System support, integration, training and implementation milestones | NSCCU Control Tower`,\n  };\n  const tickerText = messages[activePage] || messages.executive;\n  return <div className="ticker page-ticker"><div className="ticker-track"><span>{tickerText}</span><span>{tickerText}</span></div></div>;\n}\n\n'''
    text = text.replace('function ProvinceTicker({ values }) {', pt + 'function ProvinceTicker({ values }) {', 1)

# Back + PDF + CSV on detail pages.
text = text.replace('<button type="button" onClick={() => window.print()}>Print</button>', '<button type="button" onClick={() => window.print()}>Export PDF</button>')

main.write_text(text, encoding='utf-8')

css = '''\n/* Interactive drilldowns */\n.page-ticker{margin:0 0 12px;box-shadow:0 8px 18px rgba(5,52,41,.10)}\n.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line)}\n.panel-heading h2{flex:1 1 auto;border-bottom:0}\n.panel-expand{flex:0 0 auto;margin-right:12px;border:1px solid #b9d6c7;border-radius:7px;padding:7px 10px;background:#f2faf5;color:var(--green);font-size:.76rem;font-weight:900;cursor:pointer}\n.panel-expand:hover,.panel-expand:focus-visible{background:var(--green);color:#fff}\n.kpi.clickable::after{content:"View details ↗";margin-top:8px;color:var(--green);font-size:.72rem;font-weight:850}\n@media(max-width:720px){.panel-heading{align-items:flex-start}.panel-expand{margin-top:9px;white-space:nowrap}}\n'''
if '/* Interactive drilldowns */' not in styles:
    styles += css
styles_path.write_text(styles, encoding='utf-8')
print('Updated interactive KPI drilldowns, page tickers, expandable report panels, and PDF/CSV detail actions.')
