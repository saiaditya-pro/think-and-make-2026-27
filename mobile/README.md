# Think & Make 2026-27 — Mobile

Expo (SDK 57) + expo-router app for the school-side field flows that need
camera/mic (InquiBuddy: photo + optional audio per team -> async AI feedback
-> PDF download). Talks to the same Django REST API as `../web`.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set `EXPO_PUBLIC_API_URL` to your machine's **LAN IP** (not
`localhost`) so a phone running Expo Go can reach the Django backend, e.g.
`http://192.168.1.20:8000/api/v1`. Also add that IP to the backend's
`DJANGO_ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` in `../backend/.env`.

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `a`/`i` for an emulator/simulator.

## What's built

- `app/login.tsx` — JWT login against `/auth/login/`, token stored via
  `expo-secure-store`, auto-refresh on 401 (`src/lib/auth-context.tsx`).
- `app/(app)/index.tsx` — home screen with cards for every Think & Make form.
- `app/(app)/schools/enrollment.tsx` — Form 1, School Enrollment.
- `app/(app)/schools/contact-info.tsx` — Form 2, Schools Contact Info
  (teachers + session schedule, gated on Form 1).
- `app/(app)/headcounts.tsx` — Form 3, Students Count Info (incremental
  per grade/section entries, gated on Form 2).
- `app/(app)/sl-selection.tsx` — Form 4, SL Selection Assessment (bulk
  submit with a duplicate-detection lock per grade/section, gated on Form 2).
- `app/(app)/kits.tsx` — Form 5, Kits Handover Info (gated on Form 1).
- `app/(app)/inquibuddy/` — the full InquiBuddy flow: select grade/section,
  per-team photo capture (`expo-image-picker`) and audio recording
  (`expo-audio`) or file upload (`expo-document-picker`), "Generate Feedback
  for All Submitted Teams", and PDF download/share (`expo-file-system` +
  `expo-sharing`).

Shared form infrastructure lives under `src/components/forms/` (partner/school
picker, section cards, status banners) and `src/lib/` (`api.ts`, `api-error.ts`,
`grades.ts`) — ported from the equivalent `../web` modules to keep the two
codebases' form behavior in sync without sharing code between them.

## Known gaps

- `reports` (School Dashboard) and `observations` (Unit 1 Session
  Observations) have no UI on web either yet, so nothing to port to mobile.
- Session-schedule times and kit delivery dates use plain text inputs
  (`HH:MM` / `YYYY-MM-DD`) rather than a native date/time picker, matching
  the simplification already used for Form 1's visit date.
