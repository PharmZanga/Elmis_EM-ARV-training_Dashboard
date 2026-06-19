import json
from datetime import datetime
from pathlib import Path

import openpyxl


SOURCE_DIR = Path(r"C:\Users\Zanga Musakuzi\Desktop\ELMIS DASH BOARD\eLMIS Final Draft_20260226")
OUT_FILE = Path(__file__).resolve().parents[1] / "src" / "dashboardData.js"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return str(value).strip()


def period_label(value):
    if isinstance(value, datetime):
        return value.strftime("%B %Y")
    text = clean(value)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(text, fmt).strftime("%B %Y")
        except ValueError:
            pass
    return text


def read_rows(path, sheet_name):
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook[sheet_name]
    headers = [clean(cell) for cell in next(sheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    for row in sheet.iter_rows(min_row=2, values_only=True):
        record = {headers[index]: row[index] if index < len(row) else None for index in range(len(headers))}
        if any(value is not None and clean(value) != "" for value in record.values()):
            yield record


def participants():
    path = SOURCE_DIR / "Participants Masterfile.xlsx"
    sheets = {
        "eLMIS Expert ToT": "Expert",
        "eLMIS ToT Superusers": "Superuser",
        "eLMIS Trained Users": "User",
    }
    records = []
    for sheet, role in sheets.items():
        for row in read_rows(path, sheet):
            records.append(
                {
                    "role": role,
                    "province": clean(row.get("Province")),
                    "district": clean(row.get("District")),
                    "firstName": clean(row.get("First Name")),
                    "lastName": clean(row.get("Last Name")),
                    "phone": clean(row.get("Mobile Phone")),
                    "nrc": clean(row.get("NRC")),
                    "facility": clean(row.get("Duty Station")),
                    "profession": clean(row.get("Profession")).title() or "Not Specified",
                    "startDate": clean(row.get("Start Date")),
                    "endDate": clean(row.get("End Date")),
                    "issuesResolved": int(row.get("Issues Resolved") or 0),
                }
            )
    return records


def reporting_rows():
    path = SOURCE_DIR / "Reporting Status Masterfile.xlsx"
    records = []
    for row in read_rows(path, "Page 1"):
        records.append(
            {
                "facilityCode": clean(row.get("Facility Code")),
                "facility": clean(row.get("Facility")),
                "facilityType": clean(row.get("Facility type")),
                "province": clean(row.get("Province")),
                "district": clean(row.get("District")),
                "program": clean(row.get("Program")),
                "period": period_label(row.get("Period")),
                "dateReceived": clean(row.get("Date Report Received")),
                "status": clean(row.get("Status")),
            }
        )
    return records


def timeliness_rows():
    path = SOURCE_DIR / "Timeliness Reporting Masterfile.xlsx"
    records = []
    for row in read_rows(path, "Page 1"):
        expected = int(row.get("Expected") or 0)
        on_time = int(row.get("Reported On Time") or 0)
        late = int(row.get("Reported Late") or 0)
        records.append(
            {
                "district": clean(row.get("District")),
                "province": clean(row.get("Region")),
                "supplyingDepot": clean(row.get("Supplying Depot")),
                "expected": expected,
                "reportedOnTime": on_time,
                "reportedLate": late,
                "period": period_label(row.get("Period")),
                "program": clean(row.get("Program")),
                "timeliness": round((on_time / expected) * 100, 2) if expected else 0,
            }
        )
    return records


data = {
    "participants": participants(),
    "reportingRows": reporting_rows(),
    "timelinessRows": timeliness_rows(),
}

OUT_FILE.write_text(
    "export const dashboardData = "
    + json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    + ";\n",
    encoding="utf-8",
)
print(f"Wrote {OUT_FILE}")
print(f"Participants: {len(data['participants'])}")
print(f"Reporting rows: {len(data['reportingRows'])}")
print(f"Timeliness rows: {len(data['timelinessRows'])}")
