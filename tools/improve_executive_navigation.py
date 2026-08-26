from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src" / "main.jsx"
STYLES = ROOT / "src" / "styles.css"

text = MAIN.read_text(encoding="utf-8")
styles = STYLES.read_text(encoding="utf-8")

# 1) Replace the entire ExecutivePage with a compact tabbed version.
pattern = re.compile(r"function ExecutivePage\([\s\S]*?\nfunction KpiPage\(", re.M)
match = pattern.search(text)
if not match:
    raise SystemExit("Could not locate ExecutivePage in src/main.jsx")

new_exec = r'''function ExecutivePage({ totals, statusRows, participants, districtBars, provinceTicker, followUps, provinceCards, monthlyTrends, insights, priorityRows }) {
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
        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],
        ["Timeliness", `${totals.timeliness.toFixed(1)}%`],
        ["Trained eLMIS Personnel", participants.length],
        ["Non-Reporting Facilities", totals.nonReportingFacilities],
        ["Late Follow-ups", followUps.lateDistricts.length],
      ]} />
      <InsightStrip insights={insights} />
      <ProvinceTicker values={provinceTicker} />

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
          <Panel title="Zambia Provincial Performance" className="map-panel"><ProvincePerformanceMap values={provinceCards} /></Panel>
          <Panel title="Priority Actions"><DataTable rows={priorityRows} columns={["issue", "provinceDistrict", "actionRequired", "responsible", "dueDate", "status"]} /></Panel>
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

function KpiPage('''

text = text[:match.start()] + new_exec + text[match.end():]

# 2) Add a Back button to KPI detail pages.
old_actions = '''        <div className="detail-actions">
          <button type="button" onClick={() => window.print()}>Print</button>
          <button type="button" onClick={() => downloadCsv(payload.title, rows)}>Export CSV</button>
        </div>'''
new_actions = '''        <div className="detail-actions">
          <button type="button" className="detail-back" onClick={() => { window.location.hash = ""; }}>← Back to Dashboard</button>
          <button type="button" onClick={() => window.print()}>Print</button>
          <button type="button" onClick={() => downloadCsv(payload.title, rows)}>Export CSV</button>
        </div>'''
if old_actions not in text:
    raise SystemExit("Could not locate detail action buttons in src/main.jsx")
text = text.replace(old_actions, new_actions, 1)

MAIN.write_text(text, encoding="utf-8")

# 3) Make KPI cards genuinely responsive and add executive-tab styling.
styles = styles.replace(
'''  grid-template-columns: repeat(5, minmax(138px, 1fr));''',
'''  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));''',
1,
)

styles = styles.replace(
'''  font-size: clamp(1.65rem, 3vw, 2.35rem);
  line-height: 1;''',
'''  font-size: clamp(1.65rem, 3vw, 2.35rem);
  line-height: 1;
  overflow-wrap: anywhere;''',
1,
)

extra_css = r'''

/* Executive page tabs */
.executive-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0 0 16px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(19, 35, 30, 0.05);
}

.executive-tabs button {
  border: 0;
  border-radius: 7px;
  padding: 9px 14px;
  background: transparent;
  color: var(--muted);
  font-weight: 850;
  cursor: pointer;
}

.executive-tabs button:hover,
.executive-tabs button:focus-visible {
  background: #edf7f1;
  color: var(--header);
}

.executive-tabs button.active {
  background: var(--green);
  color: #ffffff;
}

.executive-tab-panel {
  align-items: start;
}

.executive-wide-panel {
  grid-column: 1 / -1;
}

.compact-summary .summary-copy {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.detail-actions .detail-back {
  background: #ffffff;
  color: var(--header);
}

.detail-actions .detail-back:hover,
.detail-actions .detail-back:focus-visible {
  background: #dff3e8;
}

@media (max-width: 1120px) {
  .kpi-grid {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  }

  .compact-summary .summary-copy {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .executive-tabs {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .executive-tabs button {
    width: 100%;
  }

  .detail-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .detail-actions button {
    flex: 1 1 145px;
  }
}
'''

if "/* Executive page tabs */" not in styles:
    styles += extra_css

STYLES.write_text(styles, encoding="utf-8")

print(f"Updated {MAIN}")
print(f"Updated {STYLES}")
print("Added KPI detail Back button, responsive KPI cards, executive tabs, concise summary, and renamed Participants to Trained eLMIS Personnel.")
