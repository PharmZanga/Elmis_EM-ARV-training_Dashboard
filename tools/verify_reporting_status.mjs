import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dashboardData as data } from "../src/dashboardData.js";
import { reportingMetrics, groupedReportingMetrics, percent } from "../src/reportingMetrics.js";

const audit = JSON.parse(readFileSync(new URL("../reconciliation/reporting-status-january-september-2026.json", import.meta.url)));
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September"];
const sourceControls = [
  ["Antiretroviral Drugs", 1953, [49, 59, 46, 47, 48, 34, 39, 49, 201]],
  ["Essential Medicine", 3381, [70, 85, 57, 55, 58, 44, 54, 63, 383]],
  ["Laboratory Commodities", 639, [34, 39, 35, 34, 37, 35, 38, 41, 85]],
];
for (const [program, expected, missing] of sourceControls) {
  months.forEach((month, index) => {
    const key = `${month} 2026|${program}`;
    const rows = data.reportingRows.filter((r) => r.period === `${month} 2026` && r.program === program);
    assert.equal(rows.length, expected, key);
    assert.equal(rows.filter((r) => r.status === "NON_REPORTING").length, missing[index], key);
    assert.equal(new Set(rows.map((r) => r.facilityCode)).size, expected, `Unique facility codes: ${key}`);
    assert.ok(rows.every((r) => !r.nonReportingOnly && !r.statusBasis), `Full source roster: ${key}`);
    assert.deepEqual(Object.fromEntries(Object.entries(audit.sheets[key].statuses).sort()), Object.fromEntries([...new Set(rows.map((r) => r.status))].sort().map((status) => [status, rows.filter((r) => r.status === status).length])));
    assert.ok(rows.every((r) => r.status === "NON_REPORTING" ? r.dateReceived === "-" : /^2026-\d{2}-\d{2}$/.test(r.dateReceived)));
    const metrics = reportingMetrics(rows);
    assert.equal(metrics.reporting, expected - missing[index]);
    assert.equal(metrics.reportingRate, (expected - missing[index]) / expected * 100);
  });
}
assert.equal(audit.records, 53757);
assert.equal(data.reportingUpdate.partialReportingPeriods.length, 0);
assert.ok(!data.reportingRows.some((r) => r.program === "HIV Test Kits"));
const september = data.reportingRows.filter((r) => r.period === "September 2026");
assert.equal(percent(reportingMetrics(september).reportingRate), "88.8%");
assert.equal(reportingMetrics(september).reporting, 5304);
assert.equal(groupedReportingMetrics(september, [], "province", false).length, 10);
assert.equal(groupedReportingMetrics(september, [], "district", false).length, 116);
const labTimely = data.timelinessRows.filter((r) => r.program === "Laboratory Commodities" && r.period === "September 2026");
assert.equal(labTimely.length, 109);
assert.ok(labTimely.every((r) => r.period === "September 2026"));
assert.equal(labTimely.reduce((sum, r) => sum + r.expected, 0), 627);
assert.equal(labTimely.reduce((sum, r) => sum + r.reportedOnTime, 0), 533);
assert.equal(labTimely.reduce((sum, r) => sum + r.reportedLate, 0), 0);
for (const [month, expectedRows] of [["May", 340], ["June", 341], ["July", 341], ["August", 344]]) {
  const imported = data.timelinessRows.filter((r) => r.period === `${month} 2026`);
  assert.equal(imported.length, expectedRows);
  assert.equal(new Set(imported.map(r => r.program)).size, 3);
}
assert.equal(percent(null), "N/A");
assert.equal(percent(0), "0.0%");
assert.equal(reportingMetrics([]).reportingRate, null);
const previousText = execFileSync("git", ["show", "5f998e0:src/dashboardData.js"], { encoding: "utf8", maxBuffer: 80_000_000 });
const previous = JSON.parse(previousText.split("export const dashboardData = ")[1].trim().replace(/;$/, ""));
assert.deepEqual(data.participants, previous.participants, "Training records preserved");
assert.deepEqual(data.facilityMetadata, previous.facilityMetadata, "Facility metadata preserved");
assert.deepEqual(data.reportingRows.filter((r) => !r.period.endsWith("2026")), previous.reportingRows.filter((r) => !r.period.endsWith("2026")), "2025 reporting preserved");
const retainedTimeliness = r => r.program !== "Laboratory Commodities" && !months.slice(0, 8).some(month => r.period === `${month} 2026`);
assert.deepEqual(data.timelinessRows.filter(retainedTimeliness), previous.timelinessRows.filter(retainedTimeliness), "September and earlier-year EM/ARV timeliness preserved");
console.log("Verified 53,757 EM/ARV/LAB status records, 27 monthly source controls, September Laboratory timeliness, EM PDF coverage and preserved training/history.");
