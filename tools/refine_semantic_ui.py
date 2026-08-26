from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src" / "main.jsx"
STYLES = ROOT / "src" / "styles.css"

text = MAIN.read_text(encoding="utf-8")
styles = STYLES.read_text(encoding="utf-8")

# 1) Upgrade Executive KPI cards to semantic objects.
old_kpis = '''      <KpiGrid items={[
        ["Reporting Rate", `${totals.reportingRate.toFixed(1)}%`],
        ["Timeliness", `${totals.timeliness.toFixed(1)}%`],
        ["Trained eLMIS Personnel", participants.length],
        ["Non-Reporting Facilities", totals.nonReportingFacilities],
        ["Late Follow-ups", followUps.lateDistricts.length],
      ]} />'''
new_kpis = '''      <KpiGrid items={[
        { label: "Reporting Rate", value: `${totals.reportingRate.toFixed(1)}%`, tone: "healthy", icon: "✓" },
        { label: "Timeliness", value: `${totals.timeliness.toFixed(1)}%`, tone: totals.timeliness < 90 ? "warning" : "healthy", icon: "◷" },
        { label: "Trained eLMIS Personnel", value: participants.length, tone: "info", icon: "◆" },
        { label: "Non-Reporting Facilities", value: totals.nonReportingFacilities, tone: totals.nonReportingFacilities > 0 ? "critical" : "healthy", icon: "!" },
        { label: "Late Follow-ups", value: followUps.lateDistricts.length, tone: followUps.lateDistricts.length > 0 ? "warning" : "healthy", icon: "↻" },
      ]} />'''
if old_kpis in text:
    text = text.replace(old_kpis, new_kpis, 1)

# 2) Replace Executive Priority Actions table with a scannable action list.
text = text.replace(
    '<Panel title="Priority Actions"><DataTable rows={priorityRows} columns={["issue", "provinceDistrict", "actionRequired", "responsible", "dueDate", "status"]} /></Panel>',
    '<Panel title="Priority Actions" className="priority-panel"><PriorityActionList rows={priorityRows} /></Panel>',
    1,
)

# 3) Add semantic tone/icon classes to KPI cards.
old_class = 'className={`kpi ${clickable ? "clickable" : ""}`}'
new_class = 'className={`kpi ${card.tone ? `kpi-${card.tone}` : ""} ${clickable ? "clickable" : ""}`.trim()}'
if old_class in text:
    text = text.replace(old_class, new_class, 1)

old_inner = '''          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </button>'''
new_inner = '''          >
            <div className="kpi-label-row">
              {card.icon && <i className="kpi-icon" aria-hidden="true">{card.icon}</i>}
              <span>{card.label}</span>
            </div>
            <strong>{card.value}</strong>
          </button>'''
if old_inner in text:
    text = text.replace(old_inner, new_inner, 1)

# 4) Add icons to insight cards.
old_insight = '''        <article key={insight.text} className={`insight ${insight.tone}`}>
          <b>{insight.label}</b>
          <span>{insight.text}</span>
        </article>'''
new_insight = '''        <article key={insight.text} className={`insight ${insight.tone}`}>
          <div className="insight-heading">
            <i aria-hidden="true">{insightIcon(insight.label)}</i>
            <b>{insight.label}</b>
          </div>
          <span>{insight.text}</span>
        </article>'''
if old_insight in text:
    text = text.replace(old_insight, new_insight, 1)

# 5) Insert helpers/components before ProvincePerformanceCards.
anchor = 'function ProvincePerformanceCards({ values }) {'
if 'function PriorityActionList({ rows })' not in text and anchor in text:
    helper = r'''function insightIcon(label) {
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

'''
    text = text.replace(anchor, helper + anchor, 1)

MAIN.write_text(text, encoding="utf-8")

# 6) Add semantic visual system and full-height sidebar.
semantic_css = r'''

/* Semantic executive visual hierarchy */
.page-shell {
  align-items: stretch;
}

.sidebar {
  height: calc(100vh - 158px);
  min-height: 560px;
}

.side-menu {
  height: 100%;
  align-content: start;
  padding: 14px 10px;
  border-color: rgba(255,255,255,0.08);
  background: linear-gradient(180deg, #073b2f 0%, #052d25 100%);
  box-shadow: 0 14px 30px rgba(5, 52, 41, 0.18);
}

.side-menu button {
  color: #eaf6f0;
}

.side-menu b {
  background: rgba(255,255,255,0.10);
  color: #d9f2e5;
}

.side-menu button:hover {
  background: rgba(255,255,255,0.09);
}

.side-menu .active {
  background: #147a46;
  color: #ffffff;
}

.side-menu .active b {
  background: #ffffff;
  color: #0b5c3a;
}

.kpi-grid {
  align-items: stretch;
}

.kpi {
  position: relative;
  overflow: hidden;
  border-top: 0;
  border-left: 5px solid var(--green);
  background: linear-gradient(180deg, #ffffff 0%, #fbfdfc 100%);
  transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
}

.kpi::after {
  content: "";
  position: absolute;
  inset: auto -28px -42px auto;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(20, 122, 70, 0.045);
}

.kpi-label-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kpi-icon {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--green-soft);
  color: var(--green);
  font-style: normal;
  font-weight: 950;
}

.kpi strong {
  position: relative;
  z-index: 1;
}

.kpi-critical {
  border-left-color: var(--red);
  background: linear-gradient(180deg, #fffafa, #fff5f4);
}
.kpi-critical .kpi-icon { background: var(--red-soft); color: var(--red); }
.kpi-critical strong { color: #8f2018; }

.kpi-warning {
  border-left-color: var(--yellow);
  background: linear-gradient(180deg, #fffdf8, #fff9ea);
}
.kpi-warning .kpi-icon { background: var(--yellow-soft); color: var(--yellow); }
.kpi-warning strong { color: #895a00; }

.kpi-healthy {
  border-left-color: var(--green);
  background: linear-gradient(180deg, #fbfffd, #f2fbf6);
}
.kpi-healthy .kpi-icon { background: var(--green-soft); color: var(--green); }

.kpi-info {
  border-left-color: var(--blue);
  background: linear-gradient(180deg, #fbfdff, #f1f7fb);
}
.kpi-info .kpi-icon { background: var(--blue-soft); color: var(--blue); }
.kpi-info strong { color: #164e76; }

.insight {
  min-height: 104px;
}

.insight-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}

.insight-heading i {
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: rgba(25,94,143,.10);
  color: var(--blue);
  font-style: normal;
  font-weight: 950;
}

.insight.risk .insight-heading i { background: var(--red-soft); color: var(--red); }
.insight.warning .insight-heading i { background: var(--yellow-soft); color: var(--yellow); }
.insight.good .insight-heading i { background: var(--green-soft); color: var(--green); }

.priority-panel {
  min-height: auto;
}

.priority-action-list {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.priority-action {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 15px;
  border: 1px solid #e4ebe8;
  border-left: 4px solid var(--blue);
  border-radius: 10px;
  background: #fbfdfc;
}

.priority-critical { border-left-color: var(--red); background: #fff8f7; }
.priority-warning { border-left-color: var(--yellow); background: #fffaf0; }

.priority-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.priority-copy strong { color: var(--header); font-size: .92rem; }
.priority-copy span { color: #3e554d; font-size: .84rem; font-weight: 750; }
.priority-copy small { color: var(--muted); font-size: .8rem; line-height: 1.35; }
.priority-copy em { color: #78877f; font-size: .75rem; font-style: normal; }

.status-badge {
  padding: 7px 10px;
  border-radius: 999px;
  background: #edf1ef;
  color: #4d5d56;
  font-size: .74rem;
  font-weight: 900;
  white-space: nowrap;
}
.status-open { background: var(--red-soft); color: var(--red); }
.status-in-progress { background: var(--yellow-soft); color: #805500; }
.status-monitoring, .status-completed, .status-closed { background: var(--green-soft); color: var(--green); }
.status-planned { background: var(--blue-soft); color: var(--blue); }

.empty-state {
  padding: 24px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 1120px) {
  .sidebar {
    height: auto;
    min-height: 0;
  }

  .side-menu {
    height: auto;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  }
}

@media (max-width: 720px) {
  .side-menu {
    grid-template-columns: 1fr;
  }

  .priority-action {
    grid-template-columns: 1fr;
  }

  .status-badge {
    justify-self: start;
  }
}
'''

if "/* Semantic executive visual hierarchy */" not in styles:
    styles += semantic_css

STYLES.write_text(styles, encoding="utf-8")

print(f"Updated {MAIN}")
print(f"Updated {STYLES}")
print("Applied full-height dark-green sidebar, semantic KPI severity colors, insight icons, status badges, and priority-action hierarchy.")
