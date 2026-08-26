import json
import os
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


def load_elmis_facility_metadata():
    """Load the authoritative facility hierarchy from local eLMIS PostgreSQL.

    The dashboard remains buildable when PostgreSQL is unavailable: in that case
    this function returns empty lookups and the Excel values are used unchanged.
    Database credentials are read from environment variables so they are never
    committed to GitHub.
    """
    try:
        import psycopg2
    except ImportError:
        print("eLMIS metadata: psycopg2 is not installed; using Excel facility fields.")
        return {}, {}

    connection = None
    try:
        connection = psycopg2.connect(
            host=os.getenv("ELMIS_DB_HOST", "127.0.0.1"),
            port=int(os.getenv("ELMIS_DB_PORT", "5432")),
            dbname=os.getenv("ELMIS_DB_NAME", "openlmis_local"),
            user=os.getenv("ELMIS_DB_USER", "postgres"),
            password=os.getenv("ELMIS_DB_PASSWORD", ""),
            connect_timeout=5,
        )
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT
                    id,
                    code,
                    name,
                    type,
                    district_name,
                    "provence" AS province
                FROM public.dim_facility
                WHERE code IS NOT NULL
                  AND BTRIM(code) <> ''
                ORDER BY code
                '''
            )
            rows = cursor.fetchall()

        by_code = {}
        by_name = {}
        for facility_id, code, name, facility_type, district, province in rows:
            item = {
                "id": facility_id,
                "code": clean(code),
                "name": clean(name),
                "type": clean(facility_type),
                "district": clean(district),
                "province": clean(province),
            }
            by_code[item["code"].upper()] = item
            if item["name"]:
                by_name.setdefault(item["name"].casefold(), item)

        print(f"eLMIS metadata: loaded {len(by_code)} facilities from public.dim_facility")
        return by_code, by_name
    except Exception as exc:
        print(f"eLMIS metadata: database unavailable ({exc}); using Excel facility fields.")
        return {}, {}
    finally:
        if connection is not None:
            connection.close()


FACILITIES_BY_CODE, FACILITIES_BY_NAME = load_elmis_facility_metadata()


def authoritative_facility(row):
    """Return the best matching eLMIS facility metadata record for an Excel row."""
    code = clean(row.get("Facility Code")).upper()
    if code and code in FACILITIES_BY_CODE:
        return FACILITIES_BY_CODE[code]

    name = clean(row.get("Facility"))
    if name:
        return FACILITIES_BY_NAME.get(name.casefold())
    return None


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
    matched = 0
    unmatched = 0

    for row in read_rows(path, "Page 1"):
        meta = authoritative_facility(row)
        if meta:
            matched += 1
        else:
            unmatched += 1

        records.append(
            {
                "facilityCode": meta["code"] if meta else clean(row.get("Facility Code")),
                "facility": meta["name"] if meta else clean(row.get("Facility")),
                "facilityType": meta["type"] if meta else clean(row.get("Facility type")),
                "province": meta["province"] if meta else clean(row.get("Province")),
                "district": meta["district"] if meta else clean(row.get("District")),
                "program": clean(row.get("Program")),
                "period": period_label(row.get("Period")),
                "dateReceived": clean(row.get("Date Report Received")),
                "status": clean(row.get("Status")),
                "metadataMatched": bool(meta),
            }
        )

    if FACILITIES_BY_CODE:
        print(f"Reporting rows matched to eLMIS metadata: {matched}; unmatched: {unmatched}")
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


def facility_metadata():
    return sorted(
        FACILITIES_BY_CODE.values(),
        key=lambda item: (item["province"], item["district"], item["name"]),
    )


data = {
    "participants": participants(),
    "reportingRows": reporting_rows(),
    "timelinessRows": timeliness_rows(),
    "facilityMetadata": facility_metadata(),
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
print(f"Facility metadata rows: {len(data['facilityMetadata'])}")
