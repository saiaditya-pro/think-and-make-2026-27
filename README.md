# Think & Make 2026-27

Inqui-Lab Foundation's "Think & Make" program platform: one Django REST API
serving both a Next.js website and an Expo mobile app, replacing a
Google Forms + Sheets + Drive + ad-hoc Gemini script setup.

## Layout

```
backend/   Django 5 + DRF API (see backend/README.md)
web/       Next.js 16 website — admin/IIF dashboards + school desktop access
mobile/    Expo app — school field data collection (InquiBuddy photo/audio)
docs/      Local-only reference documents (real school PII + legacy login
           credentials) — gitignored, never pushed. Ask the project owner
           for these files directly if you need them.
```

## Docs

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) — backend structure, data model, roles, and how the Google Sheets sync works
- [RUNNING_THE_WEBSITE.md](RUNNING_THE_WEBSITE.md) — step-by-step guide to run the backend + website locally

## Running everything locally

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv && .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Terminal 2 — website
cd web
npm install
cp .env.local.example .env.local
npm run dev

# Terminal 3 — mobile
cd mobile
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your LAN IP for a real device
npx expo start
```

## Live data from Google Sheets

The backend pulls every partner's Google Sheet into the database: first the
master sheet (T&M_PWA_Master — `Schools_List`, `Users`, `PartnerConfig`), then
each partner sheet listed in `PartnerConfig` (`School_Enrollment`,
`Schools_Contact_Info`, `Kits_Info`, `SL_Selection_Assessment`,
`Students_Count_Info`). Re-running is safe; rows are upserted by Submission ID.

One-time setup:

1. In Google Cloud console, enable the **Google Sheets API**, create a
   **service account**, and save its JSON key as
   `backend/secrets/google-service-account.json` (gitignored).
2. Share the master sheet **and every partner sheet** with the service
   account's email (Viewer).
3. In `backend/.env` set `GOOGLE_SERVICE_ACCOUNT_FILE` and
   `GOOGLE_MASTER_SHEET_ID` (see `.env.example`).

Then:

```bash
cd backend
python manage.py sync_google_sheets          # first load / manual run

# keep it live: Redis + Celery worker + beat (syncs every SHEETS_SYNC_INTERVAL_MIN, default 15)
docker run -p 6379:6379 redis                 # or install Memurai on Windows
celery -A config worker -l info -P solo
celery -A config beat -l info
```

No Redis? Schedule `python manage.py sync_google_sheets` with Windows Task
Scheduler instead. Admins can also trigger a sync from the dashboard's
**Sync now** button or Django admin → Sync runs → *Sync from Google Sheets
now*. Every run is logged there with per-partner counts and warnings.

Login accounts from the `Users` tab are created with their sheet PIN as the
initial password; later syncs never reset a password.

Offline alternative, for one partner's xlsx export:

```bash
python manage.py import_legacy_sheets --file "../docs/Datla-Think & Make _ 2026-2027.xlsx"
```

## Status

All web forms are built: Enrollment, Contact Info, Headcounts, SL Selection,
Kits, InquiBuddy, Session Observations, plus the Reports dashboard and
schools list. InquiBuddy PDF reports need the GTK3 runtime for WeasyPrint on
Windows, and AI feedback needs `GEMINI_API_KEY`.

Not synced from Sheets yet: the separate Student DB, Session Observation and
Idea Feedback spreadsheets referenced in `PartnerConfig`. Their column
layouts aren't in the local exports.
