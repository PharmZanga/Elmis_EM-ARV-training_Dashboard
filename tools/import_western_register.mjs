import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dashboardData } from "../src/dashboardData.js";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Usage: node tools/import_western_register.mjs <register.docx>");
const xmlReader = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($env:WESTERN_REGISTER_PATH)
try {
  $reader = [IO.StreamReader]::new($archive.GetEntry('word/document.xml').Open())
  [xml]$document = $reader.ReadToEnd()
  $reader.Dispose()
  $ns = [Xml.XmlNamespaceManager]::new($document.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $rows = @(foreach ($row in $document.SelectNodes('//w:tr', $ns)) {
    $cells = @(foreach ($cell in $row.SelectNodes('w:tc', $ns)) {
      (($cell.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.'#text' }) -join ' ').Trim() -replace '\\s+', ' '
    })
    if ($cells[0] -match '^\\d+$') {
      [pscustomobject]@{number=[int]$cells[0]; name=$cells[1]; station=$cells[2]; category=$cells[3]; pre=$cells[4]; post=$cells[5]; variance=$cells[6]}
    }
  })
  ConvertTo-Json -InputObject $rows -Depth 4 -Compress
} finally { $archive.Dispose() }
`;
const rows = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command", xmlReader], {
  encoding: "utf8", env: { ...process.env, WESTERN_REGISTER_PATH: sourcePath },
}));
if (rows.length !== 33) throw new Error(`Expected 33 register rows, found ${rows.length}; review before importing.`);
const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {
  "Masese RHC": "Masese Rural Health Center",
  PHO: "Western PHO",
  "Nalwei RHC": "Nalwei Rural Health Center",
  "Mangango Hosp": "Mangango Mission Hospital",
  "Mongu D Hosp": "Mongu District Hospital",
  "Senanga urban": "Senanga Urban Health Centre",
  "Senanga Hosp": "Senanga General Hospital",
  "Yeta Hosp": "Yeta District Hospital",
  "Lewanika Hosp": "Lewanika General Hospital",
  "Luampa Hosp": "Luampa Mission Hospital",
  "Mongu urban": "Mongu Urban Clinic (Lewanika Urban Center)",
  "Lukulu D Hosp": "Lukulu District Hospital",
  "Shangombo Hosp": "Shang'ombo District Hospital",
  "Litambya RHC": "Litambya Rural Health Center",
};
const aliasByKey = new Map(Object.entries(aliases).map(([a, b]) => [normalize(a), b]));
const numeric = (value) => value === "-" || !value ? null : Number(value);
const audit = [];
for (const row of rows) {
  const people = dashboardData.participants.filter((person) => person.province === "Western" && person.role === "User" && normalize(`${person.firstName} ${person.lastName}`) === normalize(row.name));
  if (people.length !== 1) throw new Error(`Expected one existing participant for ${row.name}; found ${people.length}.`);
  const person = people[0];
  const facilityName = aliasByKey.get(normalize(row.station)) || row.station;
  const facilities = dashboardData.facilityMetadata.filter((f) => f.province === "Western" && normalize(f.name) === normalize(facilityName));
  if (facilities.length > 1) throw new Error(`Ambiguous facility ${facilityName}`);
  const facility = facilities[0];
  if (facility) {
    person.facility = facility.name;
    person.district = facility.district;
    person.facilityCode = facility.code;
  }
  person.sourceRegister = "western province eLMIS Test register-2.docx";
  person.sourceStation = row.station;
  person.preTest = numeric(row.pre);
  person.postTest = numeric(row.post);
  person.testVariance = numeric(row.variance);
  person.facilityMatchStatus = facility ? "Matched to eLMIS metadata" : "Facility identity requires confirmation";
  audit.push({ name: row.name, sourceStation: row.station, facility: person.facility, district: person.district, facilityCode: person.facilityCode || "", status: person.facilityMatchStatus });
}
const dataPath = new URL("../src/dashboardData.js", import.meta.url);
const original = readFileSync(dataPath, "utf8");
const marker = "export const dashboardData = ";
const offset = original.indexOf(marker);
if (offset < 0) throw new Error("Dashboard data export not found");
writeFileSync(dataPath, `${original.slice(0, offset)}${marker}${JSON.stringify(dashboardData)};\n`);
mkdirSync(new URL("../reconciliation/", import.meta.url), { recursive: true });
writeFileSync(new URL("../reconciliation/western-training-register.json", import.meta.url), JSON.stringify({ source: "western province eLMIS Test register-2.docx", participants: rows.length, matchedFacilities: audit.filter((r) => r.facilityCode).length, records: audit }, null, 2) + "\n");
console.log(JSON.stringify({ registerRows: rows.length, added: 0, reconciled: audit.length, matched: audit.filter((r) => r.facilityCode).length, unresolved: audit.filter((r) => !r.facilityCode) }, null, 2));
