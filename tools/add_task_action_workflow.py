from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT / "src" / "main.jsx"
STYLES = ROOT / "src" / "styles.css"

text = MAIN.read_text(encoding="utf-8")
styles = STYLES.read_text(encoding="utf-8")

pattern = re.compile(r"function TaskPage\([\s\S]*?\nfunction TrainingsPage\(", re.M)
match = pattern.search(text)
if not match:
    raise SystemExit("Could not locate TaskPage in src/main.jsx")

replacement = r'''function TaskPage({ totals, statusRows, followUps, provinceTicker, priorityRows, insights }) {
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

function TrainingsPage('''

text = text[:match.start()] + replacement + text[match.end():]
MAIN.write_text(text, encoding="utf-8")

css = r'''

/* Interactive task action workflow */
.task-action-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.task-action-stack {
  display: grid;
  gap: 18px;
}

.action-tracker-panel {
  min-height: 0;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line);
}

.panel-title-row h2 {
  border-bottom: 0;
  flex: 1 1 auto;
}

.expand-panel-btn {
  margin-right: 12px;
  border: 1px solid #9bcdb1;
  border-radius: 7px;
  padding: 7px 10px;
  background: #f4fbf7;
  color: var(--green);
  font-weight: 850;
  cursor: pointer;
}

.action-tracker-table-wrap {
  max-height: 330px;
  overflow: auto;
  padding: 0 10px 10px;
}

.action-tracker-table th,
.action-tracker-table td {
  min-width: 110px;
}

.action-tracker-table th:first-child,
.action-tracker-table td:first-child {
  min-width: 145px;
}

.action-status-cell select {
  min-width: 132px;
  border: 1px solid #c8d8d1;
  border-radius: 7px;
  padding: 8px 30px 8px 9px;
  background: #ffffff;
  color: var(--text);
  font-weight: 750;
}

.comment-count-btn {
  min-width: 108px;
  border: 1px solid #76c49b;
  border-radius: 7px;
  padding: 8px 10px;
  background: #f4fbf7;
  color: #08783f;
  font-weight: 900;
  cursor: pointer;
}

.comment-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(3, 35, 27, 0.62);
}

.comment-modal {
  width: min(520px, 100%);
  display: grid;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.26);
}

.comment-modal-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.comment-modal-header h3 {
  margin: 2px 0 0;
  color: var(--header);
  font-size: 1.25rem;
}

.comment-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: #edf2ef;
  color: var(--header);
  font-size: 1.4rem;
  cursor: pointer;
}

.comment-modal label {
  display: grid;
  gap: 6px;
  color: var(--header);
  font-size: 0.86rem;
  font-weight: 850;
}

.comment-modal label b {
  color: var(--red);
}

.comment-modal input,
.comment-modal textarea {
  width: 100%;
  border: 1px solid #c9d8d2;
  border-radius: 8px;
  padding: 10px 11px;
  font: inherit;
  color: var(--text);
  background: #fbfdfc;
}

.comment-modal textarea {
  resize: vertical;
}

.comment-error {
  margin: 0;
  color: var(--red);
  font-size: 0.82rem;
  font-weight: 800;
}

.comment-modal-actions,
.action-expanded-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.comment-modal-actions button,
.action-expanded-actions button {
  border: 0;
  border-radius: 7px;
  padding: 9px 13px;
  background: var(--green);
  color: #ffffff;
  font-weight: 850;
  cursor: pointer;
}

.comment-modal-actions .secondary,
.action-expanded-actions button:first-child {
  background: #edf2ef;
  color: var(--header);
}

.action-expanded-page {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--bg);
}

.action-expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 24px;
  background: #053429;
  color: #ffffff;
  box-shadow: 0 8px 24px rgba(7, 31, 26, 0.18);
}

.action-expanded-header h2 {
  margin: 0;
  color: #ffffff;
}

.action-expanded-header p {
  margin: 5px 0 0;
  color: #ccebdc;
}

.action-expanded-body {
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.action-expanded-body .action-tracker-table-wrap {
  max-height: none;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #ffffff;
}

.empty-action-state {
  padding: 28px 16px;
  color: var(--muted);
  text-align: center;
}

@media (max-width: 1120px) {
  .task-action-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .action-expanded-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-expanded-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
'''

if "/* Interactive task action workflow */" not in styles:
    styles += css
    STYLES.write_text(styles, encoding="utf-8")

print(f"Updated {MAIN}")
print(f"Updated {STYLES}")
print("Task follow-ups now support expand, status updates, mandatory named/phone comments, CSV/PDF export, and local persistence.")
