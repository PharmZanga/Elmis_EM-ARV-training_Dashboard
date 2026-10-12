export const percent = (value) => Number.isFinite(value) ? `${value.toFixed(1)}%` : "N/A";
export const count = (value) => Number.isFinite(value) ? value.toLocaleString() : "N/A";

export function reportingMetrics(rows, timelyRows = [], partial = rows.some((r) => r.nonReportingOnly)) {
  if (partial) {
    const expected = timelyRows.length ? timelyRows.reduce((sum, r) => sum + r.expected, 0) : null;
    const reporting = timelyRows.length ? timelyRows.reduce((sum, r) => sum + r.reportedOnTime + r.reportedLate, 0) : null;
    return { expected, reporting, reportingRate: expected ? reporting / expected * 100 : null };
  }
  const reporting = rows.filter((r) => r.status !== "NON_REPORTING").length;
  return { expected: rows.length, reporting, reportingRate: rows.length ? reporting / rows.length * 100 : null };
}

export function groupedReportingMetrics(rows, timelyRows, field, partial) {
  const groups = new Set([...rows, ...timelyRows].map((r) => r[field]).filter(Boolean));
  return [...groups].map((name) => ({
    [field]: name,
    ...reportingMetrics(rows.filter((r) => r[field] === name), timelyRows.filter((r) => r[field] === name), partial),
  }));
}
