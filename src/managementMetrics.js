export const programDefinitions = [
  { key: "Essential Medicine", label: "EM" },
  { key: "Antiretroviral Drugs", label: "ARV" },
  { key: "Laboratory Commodities", label: "LAB" },
];

export function periodNumber(period) {
  const date = new Date(`1 ${period}`);
  return Number.isNaN(date.valueOf()) ? null : date.getFullYear() * 12 + date.getMonth();
}

export function facilityIdentity(row) {
  return row.facilityCode || JSON.stringify([row.province, row.district, row.facility]);
}

export function timelyGroups(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    const key = field === "district" ? JSON.stringify([row.province, row.district]) : row[field];
    const result = groups.get(key) || { [field]: row[field], province: row.province, expected: 0, reportedOnTime: 0, reportedLate: 0, programs: new Set() };
    result.expected += row.expected;
    result.reportedOnTime += row.reportedOnTime;
    result.reportedLate += row.reportedLate;
    result.programs.add(row.program);
    groups.set(key, result);
  }
  return [...groups.values()].filter(row => row.expected > 0).map(row => ({ ...row,
    programs: [...row.programs].map(key => programDefinitions.find(p => p.key === key)?.label || key).join(" / "),
    timeliness: row.reportedOnTime / row.expected * 100,
    other: row.expected - row.reportedOnTime - row.reportedLate,
  })).sort((a, b) => a.timeliness - b.timeliness || b.expected - a.expected || String(a[field]).localeCompare(String(b[field])));
}

export function missingHistory(rows, { period, program = "All", province = "All", district = "All", fullPeriods = [] }) {
  const end = periodNumber(period);
  const start = end === null ? null : Math.floor(end / 12) * 12;
  const periods = [...new Set(fullPeriods)].filter(p => periodNumber(p) >= start && periodNumber(p) <= end).sort((a, b) => periodNumber(a) - periodNumber(b));
  const covered = new Set(periods);
  const scope = rows.filter(row => covered.has(row.period) && !row.nonReportingOnly &&
    (program === "All" || row.program === program) && (province === "All" || row.province === province) && (district === "All" || row.district === district));
  const uniqueRows = new Map(scope.map(row => [JSON.stringify([facilityIdentity(row), row.program, row.period]), row]));
  const missing = [...uniqueRows.values()].filter(row => row.status === "NON_REPORTING");
  const pairs = new Map();
  for (const row of missing) {
    const key = JSON.stringify([facilityIdentity(row), row.program]);
    const item = pairs.get(key) || { ...row, missedPeriods: [] };
    item.missedPeriods.push(row.period);
    pairs.set(key, item);
  }
  const results = [...pairs.values()].map(row => {
    const missedPeriods = row.missedPeriods.sort((a, b) => periodNumber(a) - periodNumber(b));
    const current = uniqueRows.get(JSON.stringify([facilityIdentity(row), row.program, period]));
    return { ...row, period, missedPeriods, monthsMissed: missedPeriods.length,
      missedMonths: missedPeriods.map(p => p.split(" ")[0].slice(0, 3)).join(", "),
      currentStatus: !current ? "No current roster" : current.status === "NON_REPORTING" ? "Outstanding" : "Submitted",
      task: `Review repeated reporting gaps: ${missedPeriods.join(", ")}`,
    };
  }).sort((a, b) => b.monthsMissed - a.monthsMissed || a.facility.localeCompare(b.facility) || a.program.localeCompare(b.program));
  return { periods, missing, pairs: results };
}

export function missingCount(rows, mode) {
  return new Set(rows.map(row => JSON.stringify(mode === "facilities" ? [facilityIdentity(row)] : mode === "pairs" ? [facilityIdentity(row), row.program] : [facilityIdentity(row), row.program, row.period]))).size;
}

export function missingByType(rows, mode) {
  const groups = new Map();
  for (const row of rows) {
    const type = row.facilityType || "Unspecified";
    groups.set(type, [...(groups.get(type) || []), row]);
  }
  return [...groups].map(([facilityType, items]) => ({ facilityType, count: missingCount(items, mode) })).sort((a, b) => b.count - a.count || a.facilityType.localeCompare(b.facilityType));
}
