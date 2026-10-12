import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dashboardData as data } from "../src/dashboardData.js";
import { reportingMetrics, groupedReportingMetrics, percent } from "../src/reportingMetrics.js";

if (data.reportingUpdate?.reportingStatusSource) {
  await import("./verify_reporting_status.mjs");
} else {
const audit = JSON.parse(readFileSync(new URL("../reconciliation/reporting-january-september-2026.json", import.meta.url)));
for (const [key, expected] of Object.entries(audit.nonReportingCounts)) {
  const [period, program] = key.split("|");
  const rows = data.reportingRows.filter((r) => r.period === period && r.program === program);
  assert.equal(rows.filter((r) => r.status === "NON_REPORTING").length, expected, key);
  assert.equal(new Set(rows.map((r) => r.facilityCode)).size, rows.length, `No duplicate facilities: ${key}`);
  assert.ok(rows.filter((r) => r.status === "NON_REPORTING").every((r) => r.dateReceived === "-"));
}
const september = data.timelinessRows.filter((r) => r.period === "September 2026");
assert.equal(september.length, 231);
for (const [program, totals] of Object.entries(audit.septemberTotals)) {
  const rows = september.filter((r) => r.program === program);
  assert.equal(rows.reduce((n, r) => n + r.expected, 0), totals.expected);
  assert.equal(rows.reduce((n, r) => n + r.reportedOnTime, 0), totals.onTime);
  assert.equal(rows.reduce((n, r) => n + r.reportedLate, 0), totals.late);
}
const partial = data.reportingRows.filter((r) => r.period === "September 2026");
const metrics = reportingMetrics(partial, september, true);
assert.equal(metrics.expected, 5329);
assert.equal(metrics.reporting, 4572);
assert.equal(percent(metrics.reportingRate), "85.8%");
assert.equal(groupedReportingMetrics(partial, september, "province", true).length, 10);
assert.equal(new Set([...partial, ...september].map((r) => `${r.province}|${r.district}`)).size, 116);
assert.equal(september.filter((r) => r.reportedLate > 0).length, 3);
for (const month of ["May", "June", "July", "August"]) {
  const rows = data.reportingRows.filter((r) => r.period === `${month} 2026`);
  assert.ok(rows.length > 0 && rows.every((r) => r.nonReportingOnly));
  assert.equal(reportingMetrics(rows, [], true).reportingRate, null);
  assert.equal(data.timelinessRows.filter((r) => r.period === `${month} 2026`).length, 0);
}
assert.equal(percent(null), "N/A");
assert.equal(percent(0), "0.0%");
const baseRef = process.argv[2] || "ff84c03";
const previousText = execFileSync("git", ["show", `${baseRef}:src/dashboardData.js`], { encoding: "utf8", maxBuffer: 50_000_000 });
const previous = JSON.parse(previousText.split("export const dashboardData = ")[1].trim().replace(/;$/, ""));
assert.deepEqual(data.participants, previous.participants, "Training records preserved");
assert.deepEqual(data.facilityMetadata, previous.facilityMetadata, "Facility metadata preserved");
assert.deepEqual(data.reportingRows.filter((r) => !r.period.endsWith("2026")), previous.reportingRows.filter((r) => !r.period.endsWith("2026")), "Historical reporting preserved");
assert.deepEqual(data.timelinessRows.filter((r) => r.period !== "September 2026"), previous.timelinessRows, "Earlier timeliness preserved");
console.log("Verified 1,596 named EM/ARV non-reporting records across January-September, 231 September district rows, source totals, missing-month handling, and unchanged training/history.");
}
