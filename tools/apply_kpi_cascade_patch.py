from pathlib import Path

MAIN = Path(__file__).resolve().parents[1] / "src" / "main.jsx"
text = MAIN.read_text(encoding="utf-8")

replacements = [
    (
        'const { participants, reportingRows, timelinessRows } = dashboardData;',
        'const { participants, reportingRows, timelinessRows, facilityMetadata = [] } = dashboardData;',
    ),
    (
'''  const districts = useMemo(() => {
    return unique(
      reportingRows
        .filter((row) => selectedProvince === "All" || row.province === selectedProvince)
        .map((row) => row.district)
    ).sort();
  }, [selectedProvince]);''',
'''  const districts = useMemo(() => {
    const districtSource = facilityMetadata.length ? facilityMetadata : reportingRows;
    return unique(
      districtSource
        .filter((row) => selectedProvince === "All" || row.province === selectedProvince)
        .map((row) => row.district)
        .filter(Boolean)
    ).sort();
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict !== "All" && !districts.includes(selectedDistrict)) {
      setSelectedDistrict("All");
    }
  }, [districts, selectedDistrict]);''',
    ),
    (
'''  const totals = useMemo(() => getTotals(filteredReporting, filteredTimeliness, filteredParticipants), [filteredReporting, filteredTimeliness, filteredParticipants]);''',
'''  const facilitySemantics = useMemo(() => getFacilityReportingSemantics(filteredReporting), [filteredReporting]);
  const totals = useMemo(() => ({
    ...getTotals(filteredReporting, filteredTimeliness, filteredParticipants),
    ...facilitySemantics,
  }), [filteredReporting, filteredTimeliness, filteredParticipants, facilitySemantics]);''',
    ),
    (
'''              <FilterGroup title="Province" items={["All", ...provinces]} selected={selectedProvince} onSelect={setSelectedProvince} />''',
'''              <FilterGroup
                title="Province"
                items={["All", ...provinces]}
                selected={selectedProvince}
                onSelect={(province) => {
                  setSelectedProvince(province);
                  setSelectedDistrict("All");
                }}
              />''',
    ),
    (
'''        ["Non-Reporting", totals.nonReporting],''',
'''        ["Non-Reporting Facilities", totals.nonReportingFacilities],''',
    ),
    (
'''        <Panel title="Reporting Status Snapshot"><Pie reporting={totals.reporting} nonReporting={totals.nonReporting} /></Panel>''',
'''        <Panel title="Facility Reporting Status"><Pie reporting={totals.facilitiesReported} nonReporting={totals.nonReportingFacilities} /></Panel>''',
    ),
    (
'''  const reportedRows = statusRows.filter((row) => row.status === "REPORTING");
  const nonReportingRows = statusRows.filter((row) => row.status === "NON_REPORTING");''',
'''  const facilityStatusRows = uniqueFacilityStatusRows(statusRows);
  const reportedRows = facilityStatusRows.filter((row) => row.status === "REPORTING");
  const nonReportingRows = facilityStatusRows.filter((row) => row.status === "NON_REPORTING");''',
    ),
    (
'''      value: totals.reporting,
      title: "Facilities Reported Full Details",''',
'''      value: totals.facilitiesReported,
      title: "Unique Facilities Reported Full Details",''',
    ),
    (
'''      label: "Non Reporting",
      value: totals.nonReporting,
      title: "Non Reporting Facility Details",''',
'''      label: "Non-Reporting Facilities",
      value: totals.nonReportingFacilities,
      title: "Unique Non-Reporting Facility Details",''',
    ),
    (
'''        <Panel title="Reporting vs Non-Reporting"><Pie reporting={totals.reporting} nonReporting={totals.nonReporting} /></Panel>''',
'''        <Panel title="Facility Reporting vs Non-Reporting"><Pie reporting={totals.facilitiesReported} nonReporting={totals.nonReportingFacilities} /></Panel>''',
    ),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f"Patch target not found:\n{old[:180]}")
    text = text.replace(old, new, 1)

helper_marker = "function ExecutivePage("
helper = r'''function getFacilityReportingSemantics(rows) {
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
}

function uniqueFacilityStatusRows(rows) {
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
}

'''

if helper_marker not in text:
    raise SystemExit("Could not find ExecutivePage insertion point")
text = text.replace(helper_marker, helper + helper_marker, 1)

MAIN.write_text(text, encoding="utf-8")
print(f"Patched {MAIN}")
print("KPI semantics: unique facilities for facility cards; report-level Reporting Rate remains unchanged.")
print("Cascade: District options now come from facilityMetadata and reset when Province changes.")
