"""Replace monthly EM, ARV and Laboratory status rosters from the supplied XLS."""
import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parents[1]
MARKER = "export const dashboardData = "
PROGRAMS = {"ARV": "Antiretroviral Drugs", "EM": "Essential Medicine", "LAB": "Laboratory Commodities"}
STATUSES = {"NON_REPORTING", "IN_APPROVAL", "RELEASED", "APPROVED", "AUTHORIZED", "RELEASED_NO_ORDER"}


def clean(value):
    return str(value).strip()


def file_source(path):
    return {"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("status", type=Path)
    parser.add_argument("september_timeliness", type=Path)
    args = parser.parse_args()
    path = ROOT / "src/dashboardData.js"
    prefix, payload = path.read_text(encoding="utf-8").split(MARKER, 1)
    data = json.loads(payload.strip().removesuffix(";"))
    book = xlrd.open_workbook(args.status)
    rows, seen, sheet_totals = [], set(), {}
    for sheet in book.sheets():
        abbreviation = sheet.name.split()[-1].upper()
        if abbreviation not in PROGRAMS:
            continue
        program = PROGRAMS[abbreviation]
        headers = [clean(v) for v in sheet.row_values(0)]
        counts = Counter()
        for index in range(1, sheet.nrows):
            raw = dict(zip(headers, sheet.row_values(index)))
            period_date = datetime.strptime(clean(raw["Period"]), "%b %Y")
            if period_date.year != 2026 or not 1 <= period_date.month <= 9:
                raise ValueError(f"Unexpected period in {sheet.name}: {raw['Period']}")
            if period_date.strftime("%b").lower() != sheet.name.split()[0].lower():
                raise ValueError(f"Sheet/period mismatch: {sheet.name}")
            if clean(raw["Program"]) != program:
                raise ValueError(f"Sheet/program mismatch: {sheet.name}")
            status = clean(raw["Status"]).upper()
            if status not in STATUSES:
                raise ValueError(f"Unknown reporting status: {status}")
            code = clean(raw["Facility Code"])
            if not code:
                raise ValueError("Missing facility code")
            period = period_date.strftime("%B %Y")
            key = period, program, code
            if key in seen:
                raise ValueError(f"Duplicate facility-program-month: {key}")
            seen.add(key)
            received = raw["Date Report Received"]
            received_at = xlrd.xldate_as_datetime(received, book.datemode) if isinstance(received, (int, float)) else None
            if status != "NON_REPORTING" and not received_at:
                raise ValueError(f"Submitted report without received date: {key}")
            if status == "NON_REPORTING" and received_at:
                raise ValueError(f"Non-reporting record has received date: {key}")
            rows.append({
                "facilityCode": code, "facility": clean(raw["Facility"]),
                "facilityType": clean(raw["Facility type"]), "province": clean(raw["Province"]),
                "district": clean(raw["District"]), "program": program, "period": period,
                "dateReceived": received_at.date().isoformat() if received_at else "-",
                "dateReceivedAt": received_at.isoformat(timespec="seconds") if received_at else "-",
                "status": status, "sourceSheet": sheet.name,
            })
            counts[status] += 1
        sheet_totals[f"{period}|{program}"] = {"sheet": sheet.name, "expected": sum(counts.values()), "statuses": dict(counts)}
    if len(sheet_totals) != 27:
        raise ValueError("Expected nine monthly sheets for each of EM, ARV and LAB")

    periods = {row["period"] for row in rows}
    old_rows = [r for r in data["reportingRows"] if r["period"] in periods and r["program"] in PROGRAMS.values()]
    changes = {}
    for key, totals in sheet_totals.items():
        period, program = key.split("|")
        old_missing = sum(r["status"] == "NON_REPORTING" for r in old_rows if r["period"] == period and r["program"] == program)
        changes[key] = {"previousNonReporting": old_missing, "currentNonReporting": totals["statuses"].get("NON_REPORTING", 0)}
    data["reportingRows"] = [r for r in data["reportingRows"] if not (r["period"] in periods and r["program"] in PROGRAMS.values())] + rows

    # Timeliness remains a separate September snapshot, not derived from dates.
    timely_book = xlrd.open_workbook(args.september_timeliness)
    lab_sheet = timely_book.sheet_by_name("LAB")
    headers = [clean(v) for v in lab_sheet.row_values(0)]
    lab_timely, timely_keys = [], set()
    for index in range(1, lab_sheet.nrows):
        raw = dict(zip(headers, lab_sheet.row_values(index)))
        expected, on_time, late = [int(clean(raw[col])) for col in ("Expected", "Reported On Time", "Reported Late")]
        if min(expected, on_time, late) < 0 or on_time + late > expected:
            raise ValueError(f"Invalid Laboratory timeliness: {raw}")
        district = {"Mwansabombw": "Mwansabombwe"}.get(clean(raw["District"]), clean(raw["District"]))
        key = clean(raw["Region"]), district
        if key in timely_keys:
            raise ValueError(f"Duplicate Laboratory district: {key}")
        timely_keys.add(key)
        lab_timely.append({
            "province": key[0], "district": district, "sourceDistrict": clean(raw["District"]),
            "supplyingDepot": clean(raw["Supplying Depot"]), "program": PROGRAMS["LAB"],
            "period": "September 2026", "expected": expected, "reportedOnTime": on_time,
            "reportedLate": late, "timeliness": round(on_time / expected * 100, 2) if expected else None,
            "sourceFile": args.september_timeliness.name,
        })
    data["timelinessRows"] = [r for r in data["timelinessRows"] if not (r["program"] == PROGRAMS["LAB"] and r["period"] == "September 2026")] + lab_timely
    update = data.setdefault("reportingUpdate", {})
    update["partialReportingPeriods"] = [p for p in update.get("partialReportingPeriods", []) if p not in periods]
    update["fullReportingPeriods"] = sorted(periods, key=lambda p: datetime.strptime(p, "%B %Y"))
    update["reportingStatusSource"] = file_source(args.status)
    update["sources"] = list(dict.fromkeys(update.get("sources", []) + [args.status.name]))
    differences = []
    for program in PROGRAMS.values():
        current = [r for r in rows if r["period"] == "September 2026" and r["program"] == program]
        timely = [r for r in data["timelinessRows"] if r["period"] == "September 2026" and r["program"] == program]
        expected = sum(r["expected"] for r in timely)
        submitted = sum(r["reportedOnTime"] + r["reportedLate"] for r in timely)
        differences.append({"program": program, "statusExpected": len(current), "statusNonReporting": sum(r["status"] == "NON_REPORTING" for r in current), "timelinessExpected": expected, "timelinessMissing": expected - submitted})
    update["septemberSourceDifferences"] = differences
    audit = {
        "sources": [file_source(args.status), file_source(args.september_timeliness)],
        "programs": list(PROGRAMS.values()), "sheets": sheet_totals, "records": len(rows),
        "snapshotChanges": changes, "septemberSourceDifferences": differences,
        "laboratoryTimeliness": {"districtRows": len(lab_timely), **{col: sum(r[col] for r in lab_timely) for col in ("expected", "reportedOnTime", "reportedLate")}},
    }
    path.write_text(prefix + MARKER + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    (ROOT / "reconciliation/reporting-status-january-september-2026.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(rows), "sheets": len(sheet_totals), "september": differences, "laboratoryTimeliness": audit["laboratoryTimeliness"]}, indent=2))


if __name__ == "__main__":
    main()
