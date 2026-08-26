from pathlib import Path

MAIN = Path(__file__).resolve().parents[1] / "src" / "main.jsx"
text = MAIN.read_text(encoding="utf-8")

old_semantics = '''function getFacilityReportingSemantics(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const key = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!key) return;
    const current = facilities.get(key) || { reported: false };
    if (reportWasSubmitted(row)) current.reported = true;
    facilities.set(key, current);
  });

  const facilitiesExpected = facilities.size;
  const facilitiesReported = [...facilities.values()].filter((item) => item.reported).length;
  const nonReportingFacilities = Math.max(facilitiesExpected - facilitiesReported, 0);

  return {
    facilitiesExpected,
    facilitiesReported,
    nonReportingFacilities,
  };
}'''

new_semantics = '''function getFacilityReportingSemantics(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const facilityKey = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!facilityKey) return;

    const programKey = String(row.program || "Unspecified").trim() || "Unspecified";
    const facility = facilities.get(facilityKey) || new Map();
    const program = facility.get(programKey) || { submitted: false };

    // A programme is counted as submitted if any row for that facility-programme
    // has a received date or a submitted/reported status.
    if (reportWasSubmitted(row)) program.submitted = true;

    facility.set(programKey, program);
    facilities.set(facilityKey, facility);
  });

  const facilitiesExpected = facilities.size;
  let facilitiesReported = 0;

  facilities.forEach((programs) => {
    const expectedPrograms = programs.size;
    const submittedPrograms = [...programs.values()].filter((item) => item.submitted).length;
    if (expectedPrograms > 0 && submittedPrograms === expectedPrograms) facilitiesReported += 1;
  });

  return {
    facilitiesExpected,
    facilitiesReported,
    nonReportingFacilities: Math.max(facilitiesExpected - facilitiesReported, 0),
  };
}'''

old_unique = '''function uniqueFacilityStatusRows(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const key = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!key) return;
    const existing = facilities.get(key);
    if (!existing) {
      facilities.set(key, { ...row });
      return;
    }
    if (String(row.status || "").trim().toUpperCase() === "REPORTING") {
      facilities.set(key, { ...existing, ...row, status: "REPORTING" });
    }
  });

  return [...facilities.values()];
}'''

new_unique = '''function uniqueFacilityStatusRows(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const facilityKey = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!facilityKey) return;

    const programKey = String(row.program || "Unspecified").trim() || "Unspecified";
    const facility = facilities.get(facilityKey) || {
      representative: { ...row },
      programs: new Map(),
    };
    const program = facility.programs.get(programKey) || { submitted: false };
    if (reportWasSubmitted(row)) program.submitted = true;
    facility.programs.set(programKey, program);
    facilities.set(facilityKey, facility);
  });

  return [...facilities.values()].map(({ representative, programs }) => {
    const expectedPrograms = programs.size;
    const submittedPrograms = [...programs.values()].filter((item) => item.submitted).length;
    const complete = expectedPrograms > 0 && submittedPrograms === expectedPrograms;

    return {
      ...representative,
      status: complete ? "REPORTING" : "NON_REPORTING",
      expectedPrograms,
      submittedPrograms,
    };
  });
}'''

if old_semantics not in text:
    raise SystemExit("Current facility KPI helper was not found. Run the earlier KPI patches first.")
if old_unique not in text:
    raise SystemExit("Current uniqueFacilityStatusRows helper was not found. Run apply_kpi_cascade_patch.py first.")

text = text.replace(old_semantics, new_semantics, 1)
text = text.replace(old_unique, new_unique, 1)

MAIN.write_text(text, encoding="utf-8")
print(f"Updated {MAIN}")
print("Facility aggregation now requires all expected programmes for a facility to be submitted.")
print("Program-specific views remain one-programme facility status; Program=All evaluates completeness across EM/ARV.")
