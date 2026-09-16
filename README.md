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

Import the real program data (schools, kits, SL selection, headcounts) from
the legacy spreadsheet:

```bash
cd backend
python manage.py import_legacy_sheets --file "../docs/Datla-Think & Make _ 2026-2027.xlsx"
```

## Status

Built and verified this session: full Django data model + RBAC + tests
(`backend/`, 9/9 tests passing), the legacy-sheet import command (run
against the real xlsx — 7 schools, 59 SL selections, 23 headcounts, 7 kit
deliveries imported cleanly), the Next.js login + dashboard shell + schools
list + full InquiBuddy flow, and the Expo login + InquiBuddy flow. The
InquiBuddy PDF report and the other web dashboard cards (Students Count
Info, SL Selection Assessment, Kits Handover Info, School Dashboard, Session
Observations) are scaffolded with working APIs but still need their UI
built out — see `web/src/components/coming-soon.tsx`.
