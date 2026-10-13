"""Import the supplied January-August 2026 EM district timeliness PDFs."""
import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
MARKER = "export const dashboardData = "
FILES = ["jan Timeliness Reporting.pdf", "feb Timeliness Reporting.pdf", "mar Timeliness Reporting.pdf", "apr Timeliness Reporting.pdf", "may Timeliness Reporting.pdf", "june PDF.pdf", "july Timeliness Reporting.pdf", "aug Timeliness Reporting.pdf"]
PROVINCES = "North Western|Central|Copperbelt|Eastern|Luapula|Lusaka|Muchinga|Northern|Southern|Western"
ROW = re.compile(rf"^(\d+) (.+?) ({PROVINCES}) (Zambia) (\d+) (\d+) (\d+)$")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    path = ROOT / "src/dashboardData.js"
    prefix, payload = path.read_text(encoding="utf-8").split(MARKER, 1)
    data = json.loads(payload.strip().removesuffix(";"))
    known = {(row["province"], row["district"]) for row in data["reportingRows"]}
    imported, controls = [], []
    for month, filename in enumerate(FILES, 1):
        source = args.folder / filename
        period = datetime(2026, month, 1).strftime("%B %Y")
        source_period = datetime(2026, month, 1).strftime("%b %Y")
        rows, numbers = [], []
        with pdfplumber.open(source) as pdf:
            for page_number, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if (page_number == 1 or "Program:" in text or "Period:" in text) and ("Program: Essential Medicine" not in text or f"Period: {source_period}" not in text):
                    raise ValueError(f"Unexpected program or period: {filename}, page {page_number}")
                for line in text.splitlines():
                    if not re.match(r"^\d+ ", line):
                        continue
                    match = ROW.fullmatch(line)
                    if not match:
                        raise ValueError(f"Unparsed numeric row in {filename}: {line}")
                    number, district, province, depot, expected, on_time, late = match.groups()
                    district = {"Mwansabombw": "Mwansabombwe"}.get(district, district)
                    if (province, district) not in known:
                        raise ValueError(f"Unmatched district: {province}/{district}")
                    expected, on_time, late = map(int, (expected, on_time, late))
                    if not expected or on_time + late > expected:
                        raise ValueError(f"Invalid counts in {filename}: {line}")
                    numbers.append(int(number))
                    rows.append({"province": province, "district": district,
                                 "sourceDistrict": match.group(2), "supplyingDepot": depot,
                                 "program": "Essential Medicine", "period": period,
                                 "expected": expected, "reportedOnTime": on_time,
                                 "reportedLate": late, "timeliness": round(on_time / expected * 100, 2),
                                 "sourceFile": filename, "sourcePage": page_number})
            pages = len(pdf.pages)
        if numbers != list(range(1, 117)) or len({r["district"] for r in rows}) != 116:
            raise ValueError(f"Incomplete or duplicate district roster: {filename}")
        totals = {key: sum(row[key] for row in rows) for key in ("expected", "reportedOnTime", "reportedLate")}
        if totals["expected"] != 3381:
            raise ValueError(f"Unexpected national denominator: {filename}")
        controls.append({"file": filename, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                         "period": period, "program": "Essential Medicine", "pages": pages,
                         "districts": len(rows), **totals,
                         "timeliness": round(totals["reportedOnTime"] / totals["expected"] * 100, 4)})
        imported.extend(rows)
    print(json.dumps(controls, indent=2))
    if not args.apply:
        return
    periods = {row["period"] for row in imported}
    old = data["timelinessRows"]
    retained = [row for row in old if not (row["program"] == "Essential Medicine" and row["period"] in periods)]
    replaced = len(old) - len(retained)
    data["timelinessRows"] = retained + imported
    update = data.setdefault("reportingUpdate", {})
    update["timelinessPeriods"] = sorted({row["period"] for row in data["timelinessRows"] if row["period"].endswith("2026")}, key=lambda value: datetime.strptime(value, "%B %Y"))
    update["sources"] = list(dict.fromkeys(update.get("sources", []) + FILES))
    update["emTimelinessPdfSources"] = controls
    path.write_text(prefix + MARKER + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n", encoding="utf-8")
    audit = {"program": "Essential Medicine", "records": len(imported), "replacedRecords": replaced,
             "retainedRecords": len(retained), "sources": controls,
             "note": "PDFs contain expected, on-time and late counts only. Remainders are not classified as non-reporting or unscheduled. Other programs and September are unchanged."}
    (ROOT / "reconciliation/timeliness-em-january-august-2026.json").write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} EM district-month rows; replaced {replaced}; retained {len(retained)}.")


if __name__ == "__main__":
    main()
