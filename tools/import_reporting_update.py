"""Import EM/ARV non-reporting snapshots and September district timeliness."""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parents[1]
PROGRAMS = {"ARV": "Antiretroviral Drugs", "EM": "Essential Medicine"}
MARKER = "export const dashboardData = "


def clean(value):
    return str(value).strip() if value is not None else ""


def records(path, sheet):
    workbook = xlrd.open_workbook(path)
    table = workbook.sheet_by_name(sheet)
    headers = [clean(v) for v in table.row_values(0)]
    for i in range(1, table.nrows):
        values = table.row_values(i)
        if any(clean(v) for v in values):
            yield dict(zip(headers, values))


def row_key(row):
    return row["period"], row["program"], row["facilityCode"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("non_reporting", type=Path)
    parser.add_argument("timeliness", type=Path)
    args = parser.parse_args()
    data_path = ROOT / "src/dashboardData.js"
    original = data_path.read_text(encoding="utf-8")
    prefix, payload = original.split(MARKER, 1)
    data = json.loads(payload.strip().removesuffix(";"))
    participants_before = json.dumps(data["participants"], sort_keys=True)
    facilities_before = json.dumps(data["facilityMetadata"], sort_keys=True)
    metadata = {f["code"].upper(): f for f in data["facilityMetadata"]}
    non_reporting = {}
    unmatched = []
    counts = Counter()
    for sheet, program in PROGRAMS.items():
        for raw in records(args.non_reporting, sheet):
            period = datetime.strptime(clean(raw["Period"]), "%b %Y").strftime("%B %Y")
            if datetime.strptime(period, "%B %Y").year != 2026:
                raise ValueError(f"Unexpected period: {period}")
            code = clean(raw["Facility Code"])
            if not code:
                raise ValueError("Missing facility code")
            meta = metadata.get(code.upper())
            row = {
                "facilityCode": meta["code"] if meta else code,
                "facility": meta["name"] if meta else clean(raw["Facility"]),
                "facilityType": meta["type"] if meta else clean(raw["Facility type"]),
                "province": meta["province"] if meta else clean(raw["Province"]),
                "district": meta["district"] if meta else clean(raw["District"]),
                "program": program, "period": period, "dateReceived": "-",
                "status": "NON_REPORTING", "metadataMatched": bool(meta),
                "sourceFile": args.non_reporting.name,
            }
            key = row_key(row)
            if key in non_reporting:
                raise ValueError(f"Duplicate non-reporting record: {key}")
            non_reporting[key] = row
            counts[f"{period}|{program}"] += 1
            if not meta:
                unmatched.append({"facilityCode": code, "facility": row["facility"], "period": period, "program": program})

    timely = []
    seen_timely = set()
    source_totals = {}
    for sheet, program in PROGRAMS.items():
        totals = Counter()
        for raw in records(args.timeliness, sheet):
            expected, on_time, late = [int(clean(raw[c])) for c in ("Expected", "Reported On Time", "Reported Late")]
            if min(expected, on_time, late) < 0 or on_time + late > expected:
                raise ValueError(f"Invalid timeliness counts: {raw}")
            row = {
                "district": {"Mwansabombw": "Mwansabombwe"}.get(clean(raw["District"]), clean(raw["District"])), "province": clean(raw["Region"]),
                "sourceDistrict": clean(raw["District"]),
                "supplyingDepot": clean(raw["Supplying Depot"]),
                "expected": expected, "reportedOnTime": on_time, "reportedLate": late,
                "period": "September 2026", "program": program,
                "timeliness": round(on_time / expected * 100, 2) if expected else None,
                "sourceFile": args.timeliness.name,
            }
            key = row["province"], row["district"], program
            if key in seen_timely:
                raise ValueError(f"Duplicate district timeliness: {key}")
            seen_timely.add(key)
            timely.append(row)
            totals.update(expected=expected, onTime=on_time, late=late)
        totals["missingReports"] = totals["expected"] - totals["onTime"] - totals["late"]
        totals["namedNonReporting"] = counts[f"September 2026|{program}"]
        source_totals[program] = dict(totals)

    # Only the original full rosters support a facility-level denominator.
    full_periods = {r["period"] for r in data["reportingRows"] if not r.get("nonReportingOnly")}
    imported_periods = {r["period"] for r in non_reporting.values()}
    kept = []
    matched_keys = set()
    for row in data["reportingRows"]:
        if row["period"] not in imported_periods or row["program"] not in PROGRAMS.values():
            kept.append(row)
            continue
        if row.get("nonReportingOnly"):
            continue
        key = row_key(row)
        if key in non_reporting:
            kept.append(non_reporting[key])
            matched_keys.add(key)
        else:
            # The exhaustive new list supersedes the earlier non-reporting snapshot.
            updated = dict(row)
            if updated["status"] == "NON_REPORTING":
                updated["status"] = "REPORTING"
                updated["sourceFile"] = args.non_reporting.name
                updated["statusBasis"] = "Not listed in updated non-reporting snapshot; existing expected roster"
            kept.append(updated)
    for key, row in non_reporting.items():
        if key not in matched_keys:
            kept.append({**row, **({"nonReportingOnly": True} if row["period"] not in full_periods else {})})
    data["reportingRows"] = kept
    data["timelinessRows"] = [r for r in data["timelinessRows"] if not (r["period"] == "September 2026" and r["program"] in PROGRAMS.values())] + timely
    data["reportingUpdate"] = {
        "nonReportingPeriods": sorted(imported_periods, key=lambda p: datetime.strptime(p, "%B %Y")),
        "partialReportingPeriods": sorted(imported_periods - full_periods, key=lambda p: datetime.strptime(p, "%B %Y")),
        "timelinessPeriods": ["September 2026"],
        "sources": [args.non_reporting.name, args.timeliness.name],
    }
    assert json.dumps(data["participants"], sort_keys=True) == participants_before
    assert json.dumps(data["facilityMetadata"], sort_keys=True) == facilities_before
    audit = {
        "sources": [{"file": p.name, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in (args.non_reporting, args.timeliness)],
        "programs": list(PROGRAMS.values()), "nonReportingCounts": dict(counts),
        "septemberTotals": source_totals, "unmatchedFacilities": unmatched,
        "coverage": data["reportingUpdate"],
    }
    data_path.write_text(prefix + MARKER + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    audit_dir = ROOT / "reconciliation"
    audit_dir.mkdir(exist_ok=True)
    (audit_dir / "reporting-january-september-2026.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"nonReportingRecords": len(non_reporting), "timelinessDistrictRows": len(timely), "unmatched": len(unmatched), "september": source_totals}, indent=2))


if __name__ == "__main__":
    main()
