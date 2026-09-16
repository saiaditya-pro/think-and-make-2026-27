# Think & Make 2026-27 — Backend

Django 5 + Django REST Framework API replacing the Google Forms/Sheets/Drive
setup described in `../docs/Think_and_Make_Backend_Architecture.docx`. Serves
both the `web` (Next.js) and `mobile` (React Native) clients from one API.

## Setup

```bash
python -m venv .venv
.venv/Scripts/activate        # or: source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # defaults to SQLite + local media, no external services needed
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

API is served under `/api/v1/`. Django admin at `/admin/`.

## Importing the legacy spreadsheet

```bash
python manage.py import_legacy_sheets --file "../docs/Datla-Think & Make _ 2026-2027.xlsx"
```

Upserts every row from the xlsx (School_Enrollment, Schools_Contact_Info,
Kits_Info, SL_Selection_Assessment, Students_Count_Info) into the new tables,
keyed by the original Submission ID (`external_ref`). Safe to re-run.
Teams/Clusters/Students (from the OCR'd student database referenced in
`Students_Count_Info`) aren't in this command yet — that sheet only links out
to a photo/file per section rather than a structured roster, so importing it
needs a follow-up OCR/extraction step, not just a sheet read.

## Known local-dev caveat: PDF generation needs WeasyPrint's native deps

`lib/pdf_builder.py` renders the bilingual InquiBuddy feedback PDF with
WeasyPrint (chosen because it does real Pango/HarfBuzz text shaping, which
Telugu needs — Devanagari/Telugu-family scripts render incorrectly with
libraries that just draw glyphs, e.g. reportlab). On Windows, WeasyPrint
needs the GTK3 runtime installed separately (see
https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows) —
without it, everything else in the app works fine (the import is lazy), but
`GET /api/v1/inquibuddy-submissions/{id}/report/` will raise an import error
until GTK3 is installed. On Linux (Docker/staging/prod) this is a normal
`apt-get install libpango-1.0-0 libpangoft2-1.0-0` with no extra setup. For
correct Telugu glyphs in prod, also install the "Noto Sans Telugu" font
package (or bundle a `.ttf` and add an `@font-face` rule to
`apps/inquibuddy/templates/inquibuddy/_report_style.html`).

## Async jobs (Celery)

`generate_ai_feedback` (Gemini call, 1-3 min) runs via Celery. Requires Redis
locally:

```bash
celery -A config worker -l info
```

Without a running worker, `POST .../generate-feedback/` still returns
`status=processing` immediately (matching the InquiBuddy manual's staged UX)
but the job won't actually run until a worker is up.

## Tests

```bash
pytest
```

Covers RBAC school-scoping (a school account can only ever read/write its
own data — enforced server-side, never trusted from the request) and the
InquiBuddy upload → generate-feedback flow.

## App layout

One Django app per entity family under `apps/` (`accounts`, `programs`,
`schools`, `kits`, `sl_selection`, `headcounts`, `teams`, `observations`,
`inquibuddy`, `files`, `core`) — see the top of the approved architecture
plan for the full entity map and rationale. `lib/` holds the Gemini and PDF
integrations; `apps/core/mixins.py` and `apps/core/permissions.py` hold the
shared school-scoping/RBAC logic every "school form" viewset reuses.
