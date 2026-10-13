"""Import the supplied January-August 2026 district timeliness PDFs."""
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
SPECS = {
    "EM": {"program": "Essential Medicine", "files": FILES, "districts": [116] * 8, "expected": [3381] * 8},
    "ARV": {"program": "Antiretroviral Drugs", "files": ["arv Timeliness Reporting.pdf", "arv febTimeliness Reporting.pdf", "arv march Timeliness Reporting.pdf", "arv april Timeliness Reporting.pdf", "arv may Timeliness Reporting.pdf", "arv june Timeliness Reporting.pdf", "arv july Timeliness Reporting.pdf", "arv aug Timeliness Reporting.pdf"], "districts": [115, 115, 115, 115, 115, 114, 114, 115], "expected": [1951, 1951, 1951, 1948, 1948, 1945, 1938, 1948]},
    "LAB": {"program": "Laboratory Commodities", "files": ["lab jan Timeliness Reporting.pdf", "lab feb Timeliness Reporting.pdf", "lab march Timeliness Reporting.pdf", "lab april Timeliness Reporting.pdf", "lab may Timeliness Reporting.pdf", "lab june Timeliness Reporting.pdf", "lab july Timeliness Reporting.pdf", "lab august Timeliness Reporting.pdf"], "districts": [112, 113, 113, 108, 109, 111, 111, 113], "expected": [637, 637, 638, 631, 633, 635, 636, 637]},
}
PROVINCES = "North Western|Central|Copperbelt|Eastern|Luapula|Lusaka|Muchinga|Northern|Southern|Western"
ROW = re.compile(rf"^(\d+) (.+?) ({PROVINCES}) (Zambia) (\d+) (\d+) (\d+)$")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--program", choices=["EM", "ARV", "LAB", "ALL"], default="EM")
    args = parser.parse_args()
    path = ROOT / "src/dashboardData.js"
    prefix, payload = path.read_text(encoding="utf-8").split(MARKER, 1)
    data = json.loads(payload.strip().removesuffix(";"))
    known = {(row["province"], row["district"]) for row in data["reportingRows"]}
    imported, controls = [], []
    selected = list(SPECS.values()) if args.program == "ALL" else [SPECS[args.program]]
    sources = [(spec, month, filename) for spec in selected for month, filename in enumerate(spec["files"], 1)]
    for spec, month, filename in sources:
        program = spec["program"]
        source = args.folder / filename
        period = datetime(2026, month, 1).strftime("%B %Y")
        source_period = datetime(2026, month, 1).strftime("%b %Y")
        rows, numbers = [], []
        with pdfplumber.open(source) as pdf:
            for page_number, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                if (page_number == 1 or "Program:" in text or "Period:" in text) and (f"Program: {program}" not in text or f"Period: {source_period}" not in text):
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
                                 "program": program, "period": period,
                                 "expected": expected, "reportedOnTime": on_time,
                                 "reportedLate": late, "timeliness": round(on_time / expected * 100, 2),
                                 "sourceFile": filename, "sourcePage": page_number})
            pages = len(pdf.pages)
        district_count = spec["districts"][month - 1]
        if numbers != list(range(1, district_count + 1)) or len({r["district"] for r in rows}) != district_count:
            raise ValueError(f"Incomplete or duplicate district roster: {filename}")
        totals = {key: sum(row[key] for row in rows) for key in ("expected", "reportedOnTime", "reportedLate")}
        if totals["expected"] != spec["expected"][month - 1]:
            raise ValueError(f"Unexpected national denominator: {filename}")
        controls.append({"file": filename, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                         "period": period, "program": program, "pages": pages,
                         "districts": len(rows), **totals,
                         "timeliness": round(totals["reportedOnTime"] / totals["expected"] * 100, 4)})
        imported.extend(rows)
    print(json.dumps(controls, indent=2))
    if not args.apply:
        return
    periods = {row["period"] for row in imported}
    old = data["timelinessRows"]
    programs = {spec["program"] for spec in selected}
    retained = [row for row in old if not (row["program"] in programs and row["period"] in periods)]
    replaced = len(old) - len(retained)
    data["timelinessRows"] = retained + imported
    update = data.setdefault("reportingUpdate", {})
    update["timelinessPeriods"] = sorted({row["period"] for row in data["timelinessRows"] if row["period"].endswith("2026")}, key=lambda value: datetime.strptime(value, "%B %Y"))
    update["sources"] = list(dict.fromkeys(update.get("sources", []) + [filename for _, _, filename in sources]))
    for key, spec in SPECS.items():
        if spec["program"] in programs:
            update[f"{key.lower()}TimelinessPdfSources"] = [control for control in controls if control["program"] == spec["program"]]
    path.write_text(prefix + MARKER + json.dumps(data, ensure_ascii=True, separators=(",", ":")) + ";\n", encoding="utf-8")
    audit = {"programs": sorted(programs), "records": len(imported), "replacedRecords": replaced,
             "retainedRecords": len(retained), "sources": controls,
             "note": "PDFs contain expected, on-time and late counts only. Remainders are not classified as non-reporting or unscheduled. Monthly district coverage and denominators follow each source. September and earlier years are unchanged."}
    audit_name = "timeliness-january-august-2026.json" if args.program == "ALL" else f"timeliness-{args.program.lower()}-january-august-2026.json"
    (ROOT / "reconciliation" / audit_name).write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} district-month rows; replaced {replaced}; retained {len(retained)}.")


if __name__ == "__main__":
    main()
