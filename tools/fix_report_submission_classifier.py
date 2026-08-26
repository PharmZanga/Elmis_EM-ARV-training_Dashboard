from pathlib import Path

MAIN = Path(__file__).resolve().parents[1] / "src" / "main.jsx"
text = MAIN.read_text(encoding="utf-8")

old = '''function reportWasSubmitted(row) {
  const status = String(row.status || "").trim().toUpperCase();
  const received = String(row.dateReceived || "").trim();

  if (received) return true;
  if (!status) return false;
  if (status.includes("NON_REPORT") || status.includes("NOT_REPORT") || status === "NO") return false;
  return status.includes("REPORT") || status.includes("SUBMIT") || status.includes("RECEIV");
}'''

new = '''function reportWasSubmitted(row) {
  const status = String(row.status || "").trim().toUpperCase().replace(/[-\\s]+/g, "_");
  const received = String(row.dateReceived || "").trim();
  const emptyReceived = new Set(["", "-", "--", "N/A", "NA", "NIL", "NONE", "NULL"]);

  // Explicit non-reporting status must always win, even when the source sheet
  // contains a placeholder or legacy value in Date Report Received.
  if (
    status.includes("NON_REPORT") ||
    status.includes("NOT_REPORT") ||
    status.includes("DID_NOT_REPORT") ||
    status === "NO" ||
    status === "MISSING"
  ) return false;

  if (!emptyReceived.has(received.toUpperCase())) return true;
  if (!status) return false;

  return (
    status === "REPORTING" ||
    status === "REPORTED" ||
    status.includes("SUBMIT") ||
    status.includes("RECEIV")
  );
}'''

if old not in text:
    raise SystemExit("reportWasSubmitted helper not found. Run fix_facility_reporting_semantics.py first.")

text = text.replace(old, new, 1)
MAIN.write_text(text, encoding="utf-8")
print(f"Updated {MAIN}")
print("Explicit NON_REPORTING now overrides Date Report Received placeholders/legacy values.")
print("Blank markers such as -, N/A, NIL and NULL are no longer treated as submissions.")
