# eLMIS metadata integration

The dashboard data extractor can now enrich facility information from the local PostgreSQL database `openlmis_local` before writing `src/dashboardData.js`.

## What comes from eLMIS metadata

The extractor reads `public.dim_facility` and uses the eLMIS values for:

- facility code
- facility name
- facility type
- district
- province

The existing Excel reporting, timeliness, and training files remain the source for reporting periods, programme reporting status, timeliness, and training participants.

## One-time Python setup

From the repository folder run:

```powershell
py -m pip install -r tools\requirements.txt
```

## Database connection

The extractor defaults to:

- host: `127.0.0.1`
- port: `5432`
- database: `openlmis_local`
- user: `postgres`

Set the PostgreSQL password only in the local PowerShell session. Do not commit it to GitHub.

```powershell
$env:ELMIS_DB_PASSWORD="YOUR_POSTGRES_PASSWORD"
```

If your settings differ, optional variables are:

```powershell
$env:ELMIS_DB_HOST="127.0.0.1"
$env:ELMIS_DB_PORT="5432"
$env:ELMIS_DB_NAME="openlmis_local"
$env:ELMIS_DB_USER="postgres"
```

## Refresh dashboard data

```powershell
py tools\extract_dashboard_data.py
```

A successful metadata connection will print a message similar to:

```text
eLMIS metadata: loaded 3003 facilities from public.dim_facility
Reporting rows matched to eLMIS metadata: ...; unmatched: ...
```

The generated `src/dashboardData.js` also contains `facilityMetadata`, making the full facility hierarchy available for later dashboard enhancements.

## Test locally

```powershell
npm install
npm run dev
```

Then open the local Vite address shown in PowerShell.

## Safety

The public GitHub Pages site never connects directly to PostgreSQL. Only the generated dashboard data is committed/deployed. Database passwords remain local.
