import React, { useMemo, useState } from "react";
import { ExternalLink, ListTodo } from "lucide-react";
import { programDefinitions, timelyGroups, missingCount, missingByType } from "./managementMetrics.js";

const modes = [{ key: "facilities", label: "Unique facilities" }, { key: "pairs", label: "Facility-program pairs" }, { key: "reports", label: "Missed monthly reports" }];
const timelyColumns = ["province", "district", "programs", "expected", "reportedOnTime", "reportedLate", "other", "timeliness"];
const repeatColumns = ["province", "district", "facility", "facilityType", "program", "monthsMissed", "missedMonths", "currentStatus"];
const rate = value => Number.isFinite(value) ? `${value.toFixed(1)}%` : "N/A";

export default function ManagementInsights({ timelyRows, history, selectedProgram, period, Panel, onFollowUp }) {
  const [mode, setMode] = useState("facilities");
  const [minimum, setMinimum] = useState(2);
  const programs = programDefinitions.filter(item => selectedProgram === "All" || item.key === selectedProgram).map(item => ({ ...item, ...timelyGroups(timelyRows.filter(row => row.program === item.key), "program")[0] }));
  const provinces = useMemo(() => timelyGroups(timelyRows, "province"), [timelyRows]);
  const districts = useMemo(() => timelyGroups(timelyRows, "district"), [timelyRows]);
  const repeats = history.pairs.filter(row => row.monthsMissed >= minimum);
  const types = missingByType(history.missing, mode);
  const maxType = Math.max(...types.map(row => row.count), 1);
  const firstPeriod = history.periods[0];
  return <section className="management-insights" aria-label="Management insights">
    <div className="management-grid">
      <Panel title="Program timeliness comparison" detailRows={programs.filter(row => row.expected)} detailColumns={["label", "expected", "reportedOnTime", "reportedLate", "other", "timeliness"]}>
        <div className="program-comparison">{programs.map(row => <div className="program-comparison-row" key={row.key}><div><strong>{row.label}</strong><span>{row.expected ? `${row.reportedOnTime.toLocaleString()} on time / ${row.expected.toLocaleString()} expected` : "Timeliness not supplied"}</span></div><b>{rate(row.timeliness)}</b>{row.expected > 0 && <StatusBar row={row} />}</div>)}</div>
        <StatusLegend />
      </Panel>
      <Panel title="Provincial timeliness · lowest first" detailRows={provinces} detailColumns={timelyColumns.filter(key => key !== "district")}>
        <RankedTimeliness rows={provinces} field="province" />
      </Panel>
      <Panel title="Lowest-performing districts" detailRows={districts} detailColumns={timelyColumns}>
        {!districts.length ? <p className="empty-state">No district timeliness supplied for this selection.</p> : <div className="district-priority-list">{districts.slice(0, 10).map(row => <div key={`${row.province}|${row.district}`}><div><strong>{row.district}</strong><small>{row.province} · {row.programs} · {row.reportedLate} late</small></div><b>{rate(row.timeliness)}</b><button type="button" className="icon-button" aria-label={`Follow up ${row.district}`} title={`Follow up ${row.district}`} onClick={() => onFollowUp(row)}><ListTodo size={16} /></button><StatusBar row={row} /></div>)}</div>}
      </Panel>
      <Panel title="Non-reporting by facility type" detailRows={types} detailColumns={["facilityType", "count"]}>
        <div className="counting-modes" role="group" aria-label="Non-reporting counting mode">{modes.map(item => <button type="button" key={item.key} aria-pressed={mode === item.key} onClick={() => setMode(item.key)}>{item.label}</button>)}</div>
        <p className="analysis-context">{firstPeriod ? `${firstPeriod} – ${history.periods.at(-1)}` : "No full monthly rosters in this year"}</p>
        <div className="count-summary"><strong>{missingCount(history.missing, mode).toLocaleString()}</strong><span>{modes.find(item => item.key === mode).label}</span></div>
        <div className="facility-type-bars">{types.map(row => <div key={row.facilityType}><span>{row.facilityType}</span><div><i style={{width: `${row.count / maxType * 100}%`}} /></div><b>{row.count.toLocaleString()}</b></div>)}</div>
        {!types.length && <p className="empty-state">No named non-reporting records in this window.</p>}
      </Panel>
    </div>
    <Panel title="Repeat non-reporters" detailRows={repeats} detailColumns={repeatColumns}>
      <div className="repeat-toolbar"><span className="analysis-context">{firstPeriod ? `${firstPeriod} – ${history.periods.at(-1)} · ${history.periods.length} supplied months · ${repeats.length.toLocaleString()} facility-program pairs` : "No full monthly rosters in this year"}</span><label>Months missed<select aria-label="Months missed" value={minimum} onChange={event => setMinimum(Number(event.target.value))}>{[2, 3, 6, 7].map(value => <option key={value} value={value}>{value}+</option>)}</select></label></div>
      <div className="table-wrap repeat-table"><table><thead><tr><th>Facility / Program</th><th>Province / District</th><th>Missed</th><th>Months</th><th>{period.split(" ")[0]} status</th><th>Follow-up</th></tr></thead><tbody>{repeats.slice(0, 10).map(row => <tr key={`${row.facilityCode || row.facility}|${row.program}`}><td>{row.facility}<small>{programDefinitions.find(p => p.key === row.program)?.label || row.program}</small></td><td>{row.province}<small>{row.district}</small></td><td>{row.monthsMissed}</td><td>{row.missedMonths}</td><td><span className={row.currentStatus === "Outstanding" ? "repeat-outstanding" : ""}>{row.currentStatus}</span></td><td><button className="icon-button" type="button" title={`Follow up ${row.facility}`} aria-label={`Follow up ${row.facility} ${row.program}`} onClick={() => onFollowUp(row)}><ExternalLink size={15} /></button></td></tr>)}</tbody></table></div>
      {!repeats.length && <p className="empty-state">No facility-program pairs meet this threshold in the supplied months.</p>}
      {repeats.length > 10 && <p className="table-note">Showing 10 of {repeats.length.toLocaleString()} pairs</p>}
    </Panel>
  </section>;
}

function StatusBar({ row }) {
  return <div className="timely-status-bar" role="img" aria-label={`${row.reportedOnTime} on time, ${row.reportedLate} late, ${row.other} other or unclassified, ${row.expected} expected`}><i className="status-ontime" style={{width: `${row.reportedOnTime / row.expected * 100}%`}} /><i className="status-late" style={{width: `${row.reportedLate / row.expected * 100}%`}} /><i className="status-other" style={{width: `${row.other / row.expected * 100}%`}} /></div>;
}

function StatusLegend() {
  return <div className="timely-status-legend"><span><i className="status-ontime" />On time</span><span><i className="status-late" />Late</span><span><i className="status-other" />Other / unclassified</span></div>;
}

function RankedTimeliness({ rows, field }) {
  return <>{!rows.length ? <p className="empty-state">No timeliness supplied for this selection.</p> : <div className="province-timely-ranks">{rows.map(row => <div key={row[field]}><span>{row[field]}</span><StatusBar row={row} /><b>{rate(row.timeliness)}</b></div>)}</div>}<StatusLegend /></>;
}
