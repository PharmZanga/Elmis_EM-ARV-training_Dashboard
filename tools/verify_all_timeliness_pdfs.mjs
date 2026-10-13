import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dashboardData as data } from "../src/dashboardData.js";
import { timelyGroups } from "../src/managementMetrics.js";

const months = ["January", "February", "March", "April", "May", "June", "July", "August"];
const controls = [
  { program: "Essential Medicine", districts: [116,116,116,116,116,116,116,116], expected: [3381,3381,3381,3381,3381,3381,3381,3381], onTime: [2980,2892,2951,2858,2772,2815,2850,3022], late: [278,332,241,340,429,409,379,250] },
  { program: "Antiretroviral Drugs", districts: [115,115,115,115,115,114,114,115], expected: [1951,1951,1951,1948,1948,1945,1938,1948], onTime: [1685,1649,1658,1603,1536,1592,1583,1735], late: [183,208,195,225,286,209,265,142] },
  { program: "Laboratory Commodities", districts: [112,113,113,108,109,111,111,113], expected: [637,637,638,631,633,635,636,637], onTime: [538,523,544,521,525,527,507,563], late: [39,49,38,50,46,55,70,27] },
];
const audit = JSON.parse(readFileSync(new URL("../reconciliation/timeliness-january-august-2026.json", import.meta.url)));
assert.equal(audit.records, 2736);
assert.equal(audit.sources.length, 24);
for (const control of controls) months.forEach((month, index) => {
  const period = `${month} 2026`;
  const rows = data.timelinessRows.filter(row => row.program === control.program && row.period === period);
  const source = audit.sources.find(row => row.program === control.program && row.period === period);
  assert.equal(rows.length, control.districts[index], `${period}/${control.program}`);
  assert.equal(new Set(rows.map(row => `${row.province}|${row.district}`)).size, rows.length);
  for (const [field, total] of [["expected", control.expected[index]], ["reportedOnTime", control.onTime[index]], ["reportedLate", control.late[index]]]) {
    assert.equal(rows.reduce((sum, row) => sum + row[field], 0), total);
    assert.equal(source[field], total);
  }
  assert.ok(rows.every(row => row.sourceFile === source.file && row.sourcePage >= 1 && row.sourcePage <= source.pages));
  assert.ok(rows.every(row => row.reportedOnTime + row.reportedLate <= row.expected));
  assert.ok(rows.every(row => row.timeliness === Math.round(row.reportedOnTime / row.expected * 10000) / 100));
});
months.forEach(month => assert.equal(timelyGroups(data.timelinessRows.filter(row => row.period === `${month} 2026`), "program").length, 3));
const previousText = execFileSync("git", ["show", "aef32d6:src/dashboardData.js"], { encoding: "utf8", maxBuffer: 100_000_000 });
const previous = JSON.parse(previousText.split("export const dashboardData = ")[1].trim().replace(/;$/, ""));
for (const field of ["reportingRows", "participants", "facilityMetadata"]) assert.deepEqual(data[field], previous[field], `${field} unchanged`);
const preserved = row => row.program === "Essential Medicine" || !months.some(month => row.period === `${month} 2026`);
assert.deepEqual(data.timelinessRows.filter(preserved), previous.timelinessRows.filter(preserved), "EM, September and all earlier years unchanged");
console.log("Verified 2,736 EM/ARV/LAB district-month records from 24 PDFs, monthly denominators, program comparisons and preserved EM/September/reporting/training data.");
