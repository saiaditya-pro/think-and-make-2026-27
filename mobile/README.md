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
- `app/(app)/index.tsx` — home screen (school name + Inqui Buddy entry
  point). Other Think & Make forms are web-only for now — see the approved
  architecture plan for the website/mobile split rationale.
- `app/(app)/inquibuddy/` — the full InquiBuddy flow: select grade/section,
  per-team photo capture (`expo-image-picker`) and audio recording
  (`expo-audio`), "Generate Feedback for All Submitted Teams", and PDF
  download/share (`expo-file-system` + `expo-sharing`).

## Known gap

"Upload Audio" (picking an existing audio file, as opposed to recording live)
currently just points the user at "Record Audio" — a real file picker needs
`expo-document-picker`, not yet wired up.
