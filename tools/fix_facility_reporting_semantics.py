from pathlib import Path

MAIN = Path(__file__).resolve().parents[1] / "src" / "main.jsx"
text = MAIN.read_text(encoding="utf-8")

old = '''function getFacilityReportingSemantics(rows) {
  const facilities = new Map();

  rows.forEach((row) => {
    const key = row.facilityCode || `${row.province || ""}|${row.district || ""}|${row.facility || ""}`;
    if (!key) return;
    const current = facilities.get(key) || { reported: false };
    if (String(row.status || "").trim().toUpperCase() === "REPORTING") current.reported = true;
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

new = '''function reportWasSubmitted(row) {
  const status = String(row.status || "").trim().toUpperCase();
  const received = String(row.dateReceived || "").trim();

  if (received) return true;
  if (!status) return false;
  if (status.includes("NON_REPORT") || status.includes("NOT_REPORT") || status === "NO") return false;
  return status.includes("REPORT") || status.includes("SUBMIT") || status.includes("RECEIV");
}

function getFacilityReportingSemantics(rows) {
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

if old not in text:
    raise SystemExit("Expected patched KPI helper was not found. Run apply_kpi_cascade_patch.py first, or verify src/main.jsx.")

text = text.replace(old, new, 1)
MAIN.write_text(text, encoding="utf-8")
print(f"Updated {MAIN}")
print("Facility submitted status now uses Date Report Received and recognizes reported/submitted/received status variants.")
