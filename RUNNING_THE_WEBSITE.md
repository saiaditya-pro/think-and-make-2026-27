# Running the Think & Make Website

This guide takes you from a fresh clone to the website running at **http://localhost:3000**. The website (`web/`) is only a front end; it needs the Django backend (`backend/`) running to show any data.

For how the backend and the Google Sheets sync work, see [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md).

```
Browser ──► Next.js website :3000 ──► Django API :8000/api/v1 ──► database
                      └── /admin redirects to the Django admin
```

---

## 1. Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Python | 3.12 | Backend |
| Node.js + npm | 20.9 or newer (22 LTS recommended) | Website |
| Redis | any recent | *Optional*: scheduled Sheets sync and background jobs. On Windows, use Docker (`docker run -p 6379:6379 redis`) or Memurai |
| GTK3 runtime | — | *Optional, Windows only*: InquiBuddy PDF reports (WeasyPrint) |

All commands below are run from the repository root unless stated otherwise. On macOS or Linux, use `source .venv/bin/activate` instead of `.venv\Scripts\activate`.

## 2. Start the backend (terminal 1)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
python manage.py migrate
python manage.py createsuperuser   # your own admin login
python manage.py runserver         # http://127.0.0.1:8000
```

**Database.** The project uses a **Supabase Postgres** database:
1. In the Supabase dashboard, open your project and click **Connect**.
2. Copy the **Session pooler** connection string.
3. Put it in `backend/.env` as `DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`. URL-encode special characters in the password, e.g. `@` → `%40`.
4. `python manage.py migrate` creates all the tables in Supabase.

Without `DATABASE_URL`, the backend falls back to a local SQLite file (`backend/db.sqlite3`). That's handy for working offline.

**Loading real data (optional).** Fill in the Google Sheets settings in `backend/.env`; see BACKEND_ARCHITECTURE.md §8.7. Then run:

```bash
python manage.py sync_google_sheets          # imports partners, schools, users and form data
python manage.py reconcile_school_progress   # refreshes dashboard progress (the sync already does this)
```

Check it's up:
- http://127.0.0.1:8000/admin/ shows the Django admin login.
- http://127.0.0.1:8000/api/v1/partners/ returns `401` without a login, which is expected.

## 3. Start the website (terminal 2)

```bash
cd web
npm install
copy .env.local.example .env.local   # macOS/Linux: cp .env.local.example .env.local
npm run dev                          # http://localhost:3000
```

### `web/.env.local`

| Variable | Default | Used for |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | API calls made from the browser |
| `DJANGO_API_URL` | `http://127.0.0.1:8000/api/v1` | Login and token refresh, made by the Next.js server |
| `DJANGO_BASE_URL` | `http://127.0.0.1:8000` | Where `/admin` on the website redirects to (the Django admin) |
| `AUTH_SECRET` | `change-me` | Encrypts the login session cookie. **Replace it** with a random string: `npx auth secret`, or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_TRUST_HOST` | `true` | Lets next-auth run on localhost |

After changing `.env.local`, restart `npm run dev`.

### Logging in

Open http://localhost:3000 and you'll be sent to `/login`. Use:
- the superuser you created, or
- any user imported from the Sheets `Users` tab (username and PIN).

Here's what happens when you log in:
1. The website posts your credentials to Django `/api/v1/auth/login/` and gets back a JWT pair.
2. It calls `/auth/me/` to learn your role and school.
3. Both are stored in an encrypted session cookie.
4. The access token is renewed automatically through `/auth/refresh/` before it expires (every 15 minutes).
5. Signed-out visitors to any `/dashboard` page are redirected to `/login`; `web/src/proxy.ts` does this.

### What you'll see

| Role | Landing page |
|---|---|
| Admin / IIF staff | **Partners** grid. Click a partner to get its **Dashboard** (KPIs and school table) and its **Forms**, with the partner already selected |
| School | Their own school's progress |

## 4. Background jobs (optional, terminals 3 and 4)

Only needed if you want the Google Sheets sync to run every 15 minutes, the "Sync now" button to queue jobs, or InquiBuddy AI feedback. Start Redis first, then:

```bash
cd backend
.venv\Scripts\activate
celery -A config worker -l info -P solo   # terminal 3 (-P solo is required on Windows)
celery -A config beat -l info             # terminal 4 (the scheduler)
```

No Redis? Schedule `python manage.py sync_google_sheets` with Windows Task Scheduler or cron instead. The website works fine without background jobs.

## 5. Everyday start-up checklist

1. **Terminal 1:** `cd backend` → `.venv\Scripts\activate` → `python manage.py runserver`
2. **Terminal 2:** `cd web` → `npm run dev`
3. *(Optional)* Redis, then the Celery worker and beat
4. Open http://localhost:3000

After pulling new code:
- run `python manage.py migrate` in `backend/` if there are new migrations
- run `npm install` in `web/` if `package.json` changed

## 6. Production-style build

```bash
cd web
npm run build
npm start          # serves the built site on :3000
```

Before deploying for real:
- **Backend:** set `DJANGO_DEBUG=False`, a real `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DATABASE_URL` (Postgres), and `CORS_ALLOWED_ORIGINS` set to the site's real URL.
- **Website:** point the `web/.env` URLs at the deployed API and set a strong `AUTH_SECRET`.

## 7. Checks

```bash
cd backend && pytest                       # backend tests
cd web && npm run lint && npx tsc --noEmit # website lint + type check
```

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Partner cards / dashboard stay on grey placeholders | The backend isn't running or crashed. Check terminal 1. A typo in `backend/config/settings.py` or `.env` stops `runserver`; fix the error it prints and restart |
| `migrate`/`runserver` hangs, then "connection timed out" | You're using Supabase's *Direct connection* host (`db.<ref>.supabase.co`, IPv6-only). Switch to the **Session pooler** string |
| `password authentication failed` / `could not translate host name` | The password has an unencoded special character, or the user isn't `postgres.<project-ref>`. Copy the string again from **Connect** |
| `SSL connection is required` / SSL errors | Make sure `DATABASE_URL` starts with `postgresql://`; SSL is then turned on automatically |
| Browser console shows a CORS error | Add the website's origin to `CORS_ALLOWED_ORIGINS` in `backend/.env` and restart Django |
| Login fails with correct credentials | Check `DJANGO_API_URL` in `web/.env.local`, and that the user is active in Django admin |
| Suddenly signed out / requests return 401 | The refresh token expired (7 days) or `AUTH_SECRET` changed. Sign in again |
| `Port 3000/8000 is already in use` | Another dev server is still running. Stop it, or run `npm run dev -- -p 3001` / `runserver 8001` and update the URLs in `.env.local` |
| `/admin` on the website goes nowhere | `DJANGO_BASE_URL` is wrong, or Django isn't running. On Vercel, change it in Project Settings → Environment Variables and redeploy |
| "Partly synced" / "Sync failed" on the dashboard | A Google Sheets problem, not a website problem. See BACKEND_ARCHITECTURE.md §8.8 |
| Uploaded photos don't show | With `USE_S3_STORAGE=False`, Django serves `/media/` only when `DJANGO_DEBUG=True` |

## 9. Mobile app

The Expo app in `mobile/` uses the same backend. Run `npm install`, copy `.env.example` to `.env`, then `npx expo start`. See `mobile/README.md`. To test on a real phone:
- set `EXPO_PUBLIC_API_URL` to your computer's LAN IP
- run Django with `python manage.py runserver 0.0.0.0:8000`
- add that IP to `DJANGO_ALLOWED_HOSTS`

## 10. Deploy the backend to Render

The backend is ready for a Render **Web Service** on the Python runtime. It uses `backend/build.sh`, `gunicorn`, WhiteNoise for the admin's static files, and a `/healthz` endpoint.

### Service settings

| Field | Value |
|---|---|
| Branch | `new-version` |
| Region | **Singapore**: closest to the Supabase database (Seoul) and to users in India |
| Root Directory | `backend` |
| Build Command | `./build.sh` (installs packages, collects static files, runs migrations) |
| Start Command | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120` |
| Health Check Path | `/healthz` |

### Environment variables

| Key | Value |
|---|---|
| `PYTHON_VERSION` | `3.12.4` |
| `DJANGO_SECRET_KEY` | A long random string, e.g. `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DJANGO_DEBUG` | `False` |
| `DATABASE_URL` | Supabase **Session pooler** connection string (same as in your local `.env`) |
| `CORS_ALLOWED_ORIGINS` | The website's URL(s), comma-separated, e.g. `https://think-and-make.vercel.app,http://localhost:3000` |
| `GOOGLE_MASTER_SHEET_ID` | Same as local |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | `/etc/secrets/google-service-account.json` |
| `SHEETS_SYNC_ENABLED` / `SHEETS_SYNC_YEAR` | `True` / `2026` |
| `GEMINI_API_KEY` | For InquiBuddy feedback |
| `USE_S3_STORAGE` + `SUPABASE_STORAGE_*` | `True` plus your Supabase Storage S3 keys. **Needed for photo uploads**: Render's disk is wiped on every deploy |

Under **Advanced → Secret Files**, add a file named `google-service-account.json` and paste the contents of your key from `backend/secrets/`.

Notes:
- **Don't use "Add from .env" as-is.** Your local `.env` has `DJANGO_DEBUG=True` and a Windows key path.
- You don't need `DJANGO_ALLOWED_HOSTS` or `CSRF_TRUSTED_ORIGINS` for the `.onrender.com` address; Render's hostname is added automatically. Add them only for a custom domain.

### After the first deploy

- `https://<service>.onrender.com/healthz` → `ok`
- `https://<service>.onrender.com/admin/` → styled admin login
- `https://<service>.onrender.com/api/v1/partners/` → `401` (needs login, which is expected)
- Point the website at it: `NEXT_PUBLIC_API_URL` and `DJANGO_API_URL` = `https://<service>.onrender.com/api/v1`, and `DJANGO_BASE_URL` = `https://<service>.onrender.com`.

### Free-plan limits

- **No automatic Sheets sync.** There's no Celery worker, so the 15-minute sync and nightly progress refresh don't run. Admins can still press **Sync now** on the dashboard; it runs in the background of the web service. For automatic syncs, add a Render **Cron Job** with the same repo, root directory and env vars, command `python manage.py sync_google_sheets`, schedule `*/15 * * * *`.
- **Sleeps when idle.** After about 15 minutes without traffic, the first request takes roughly 30–60 seconds to wake it.
- **InquiBuddy PDF reports** need system libraries (Pango) that Render's Python runtime may lack. If PDF download fails there, everything else still works.
