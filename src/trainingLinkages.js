export function linkTrainingToFacilities(facilityKpis, traineeRows) {
  const normalize = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const key = (row, field) => [row.province, row.district, row[field]].map(normalize).join("|");
  const byName = new Map();
  const byCode = new Map();
  for (const person of traineeRows) {
    if (person.facilityMatchStatus === "Facility identity requires confirmation") continue;
    const nameKey = key(person, "facility");
    byName.set(nameKey, (byName.get(nameKey) || 0) + 1);
    if (person.facilityCode) {
      const codeKey = key(person, "facilityCode");
      byCode.set(codeKey, (byCode.get(codeKey) || 0) + 1);
    }
  }
  return facilityKpis.map((facility) => ({
    ...facility,
    trained: byCode.get(key(facility, "facilityCode")) ?? byName.get(key(facility, "facility")) ?? 0,
  })).sort((a, b) => b.trained - a.trained);
}
