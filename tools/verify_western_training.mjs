import assert from "node:assert/strict";
import { dashboardData } from "../src/dashboardData.js";
import { linkTrainingToFacilities } from "../src/trainingLinkages.js";

const users = dashboardData.participants.filter((p) => p.province === "Western" && p.role === "User");
assert.equal(users.length, 33);
assert.equal(new Set(users.map((p) => `${p.firstName}|${p.lastName}`)).size, 33);
assert.equal(new Set(users.map((p) => p.district)).size, 14);
assert.equal(users.filter((p) => p.facilityCode).length, 31);
assert.equal(users.filter((p) => p.preTest === null).length, 2);
assert.equal(users.filter((p) => p.postTest !== null).length, 33);
for (const person of users.filter((p) => p.facilityCode)) {
  const facility = dashboardData.facilityMetadata.find((f) => f.code === person.facilityCode);
  assert.equal(person.facility, facility.name);
  assert.equal(person.district, facility.district);
}
const linked = linkTrainingToFacilities(dashboardData.facilityMetadata.filter((f) => f.province === "Western").map((f) => ({ ...f, facility: f.name, facilityCode: f.code })), users);
assert.equal(linked.reduce((sum, f) => sum + f.trained, 0), 31);
assert.equal(linked.find((f) => f.facility === "Senanga General Hospital").trained, 3);
assert.equal(linked.find((f) => f.facility === "Senanga Urban Health Centre").trained, 3);
assert.equal(linked.find((f) => f.facility === "Litambya Rural Health Center").trained, 1);
assert.equal(linked.find((f) => f.facility === "Mangango Mission Hospital HAHC").trained, 0);
const fixture = { province: "Western", district: "Mongu", facility: "Clinic", facilityCode: "123" };
const checks = linkTrainingToFacilities([fixture, { ...fixture, province: "Other" }, { ...fixture, facility: "Other", facilityCode: "456" }], [fixture]);
assert.deepEqual(checks.map((f) => f.trained), [1, 0, 0]);
assert.equal(linkTrainingToFacilities(Array.from({ length: 501 }, () => fixture), []).length, 501);
console.log("Verified: 33 distinct Western end users, 14 districts, 31 facility matches, and accurate facility training counts.");
