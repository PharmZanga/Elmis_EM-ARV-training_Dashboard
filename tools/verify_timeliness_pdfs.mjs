import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dashboardData as data } from "../src/dashboardData.js";

const months = ["January", "February", "March", "April", "May", "June", "July", "August"];
const onTime = [2980, 2892, 2951, 2858, 2772, 2815, 2850, 3022];
const late = [278, 332, 241, 340, 429, 409, 379, 250];
const audit = JSON.parse(readFileSync(new URL("../reconciliation/timeliness-em-january-august-2026.json", import.meta.url)));
const isImported = row => row.program === "Essential Medicine" && months.some(month => row.period === `${month} 2026`);
assert.equal(audit.records, 928);
assert.equal(audit.sources.length, 8);
months.forEach((month, index) => {
  const rows = data.timelinessRows.filter(row => row.program === "Essential Medicine" && row.period === `${month} 2026`);
  assert.equal(rows.length, 116, month);
  assert.equal(new Set(rows.map(row => row.district)).size, 116, month);
  assert.equal(new Set(rows.map(row => row.province)).size, 10, month);
  for (const [field, total] of [["expected", 3381], ["reportedOnTime", onTime[index]], ["reportedLate", late[index]]]) {
    assert.equal(rows.reduce((sum, row) => sum + row[field], 0), total, `${month}/${field}`);
    assert.equal(audit.sources[index][field], total);
  }
  assert.equal(audit.sources[index].period, `${month} 2026`);
  assert.ok(rows.every(row => row.sourceFile === audit.sources[index].file && row.sourcePage >= 1 && row.sourcePage <= 5));
  assert.ok(rows.every(row => row.reportedOnTime + row.reportedLate <= row.expected));
  assert.ok(rows.every(row => row.timeliness === Math.round(row.reportedOnTime / row.expected * 10000) / 100));
  assert.ok(data.reportingUpdate.timelinessPeriods.includes(`${month} 2026`));
});
const januaryMwandi = data.timelinessRows.find(row => isImported(row) && row.period === "January 2026" && row.district === "Mwandi");
assert.deepEqual([januaryMwandi.expected, januaryMwandi.reportedOnTime, januaryMwandi.reportedLate], [14, 6, 8]);
const previousText = execFileSync("git", ["show", "65ffd6f:src/dashboardData.js"], { encoding: "utf8", maxBuffer: 100_000_000 });
const previous = JSON.parse(previousText.split("export const dashboardData = ")[1].trim().replace(/;$/, ""));
for (const field of ["reportingRows", "participants", "facilityMetadata"]) assert.deepEqual(data[field], previous[field], `${field} unchanged`);
assert.deepEqual(data.timelinessRows.filter(row => !isImported(row)), previous.timelinessRows.filter(row => !isImported(row)), "September, ARV, LAB and 2025 timeliness unchanged");
console.log("Verified 928 EM district-month records, eight PDF controls, weighted rates, source provenance, and unchanged September/ARV/LAB/reporting/training data.");
