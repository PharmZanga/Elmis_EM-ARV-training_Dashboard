import assert from "node:assert/strict";
import { missingHistory, missingCount, missingByType, timelyGroups } from "../src/managementMetrics.js";
import { dashboardData } from "../src/dashboardData.js";

const base = { facilityCode: "A", facility: "Clinic A", facilityType: "Health Center", province: "Western", district: "Mongu", program: "Essential Medicine", status: "NON_REPORTING" };
const rows = [
  { ...base, period: "January 2026" }, { ...base, period: "January 2026" },
  { ...base, period: "February 2026" }, { ...base, period: "March 2026", status: "APPROVED" },
  { ...base, period: "January 2026", program: "Antiretroviral Drugs" },
  { ...base, period: "April 2026" }, { ...base, period: "January 2025" },
  { ...base, period: "January 2026", facilityCode: "B", facility: "Other clinic", province: "Central", district: "Kabwe" },
];
const options = { period: "March 2026", province: "Western", fullPeriods: ["January 2025", "January 2026", "February 2026", "March 2026", "April 2026"] };
const history = missingHistory(rows, options);
assert.deepEqual(history.periods, ["January 2026", "February 2026", "March 2026"]);
assert.equal(history.missing.length, 3, "Repeated rows and future months excluded");
assert.equal(missingCount(history.missing, "facilities"), 1);
assert.equal(missingCount(history.missing, "pairs"), 2);
assert.equal(missingCount(history.missing, "reports"), 3);
assert.equal(history.pairs[0].monthsMissed, 2);
assert.equal(history.pairs[0].missedMonths, "Jan, Feb");
assert.equal(history.pairs[0].currentStatus, "Submitted", "Historic gaps must not imply currently outstanding");
assert.equal(history.pairs[1].currentStatus, "No current roster");
assert.equal(missingByType(history.missing, "facilities")[0].count, 1);
assert.equal(missingHistory(rows, { ...options, program: "Antiretroviral Drugs" }).missing.length, 1);
assert.equal(missingHistory(rows, { ...options, period: "January 2025" }).missing.length, 1);
const timely = timelyGroups([
  { province: "Western", district: "One", program: "EM", expected: 1, reportedOnTime: 1, reportedLate: 0 },
  { province: "Western", district: "Two", program: "EM", expected: 9, reportedOnTime: 1, reportedLate: 2 },
  { province: "Central", district: "One", program: "EM", expected: 5, reportedOnTime: 5, reportedLate: 0 },
], "province");
assert.equal(timely[0].timeliness, 20, "Weighted national/province rates, not averages of percentages");
assert.equal(timely[0].other, 6, "Unclassified remainder retained without non-reporting claim");
assert.equal(timelyGroups([{ province: "A", district: "Same", expected: 1, reportedOnTime: 0, reportedLate: 0 }, { province: "B", district: "Same", expected: 1, reportedOnTime: 1, reportedLate: 0 }], "district").length, 2);
const real = missingHistory(dashboardData.reportingRows, { period: "September 2026", fullPeriods: dashboardData.reportingUpdate.fullReportingPeriods });
const rawMissing = dashboardData.reportingRows.filter(row => row.period.endsWith("2026") && row.status === "NON_REPORTING");
assert.equal(real.periods.length, 9);
assert.equal(missingCount(real.missing, "reports"), rawMissing.length);
assert.equal(missingCount(real.missing, "facilities"), new Set(rawMissing.map(row => row.facilityCode)).size);
assert.equal(missingCount(real.missing, "pairs"), new Set(rawMissing.map(row => `${row.facilityCode}|${row.program}`)).size);
for (const mode of ["facilities", "pairs", "reports"]) assert.equal(missingByType(real.missing, mode).reduce((sum, row) => sum + row.count, 0), missingCount(real.missing, mode), `Facility type reconciliation: ${mode}`);
const september = timelyGroups(dashboardData.timelinessRows.filter(row => row.period === "September 2026"), "program");
assert.equal(september.length, 3);
assert.equal(september.reduce((sum, row) => sum + row.expected, 0), 5956);
console.log(JSON.stringify({ verified: "Weighted timeliness, repeat windows, counting modes, type reconciliation and preserved status semantics", uniqueFacilities: missingCount(real.missing, "facilities"), facilityProgramPairs: real.pairs.length, missedMonthlyReports: real.missing.length, repeatPairs: real.pairs.filter(row => row.monthsMissed >= 2).length }));
