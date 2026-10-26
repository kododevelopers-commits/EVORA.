# Deploying Evora to Render (free)

This puts the site **and** the backend on the internet, so orders arrive and
emails go out even when your laptop is switched off.

Everything here is free and needs no credit card. The only trade-off is that
Render's free tier puts the app to sleep after 15 minutes with no visitors, so
the first request after a quiet spell takes ~30–60 seconds. Step 7 removes
that.

> **Why not just keep the laptop on?** Because the backend runs on it. If it
> is off, no order can be recorded and no email can be sent — no email
> provider can fix that.

---

## What you need

| Account | Why | Card? |
|---|---|---|
| GitHub | Render deploys from a Git repository | no |
| Render | runs the server | no |
| Upstash | stores orders (Render's free disk is wiped on restart) | no |

Roughly 30–40 minutes the first time.

---

## 1. Create the database (Upstash)

Do this first — you will need the two values in step 4.

1. Sign up at <https://console.upstash.com/> (GitHub or email).
2. **Create Database** → type **Redis** → any name, region **Singapore**,
   plan **Free**.
3. Open the database and scroll to **REST API**.
4. Copy **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`**.

Free plan limits (plenty for a shop): 250 MB of data, 500,000 commands/month,
one database.

---

## 2. Put the project on GitHub

Git is already installed on your machine. In the project folder:

```powershell
cd "C:\Users\muham\OneDrive\Documents\EVORA"
git init
git add .
git commit -m "Evora store + backend"
```

Then create an **empty** repository at <https://github.com/new> — no README,
no .gitignore — and push:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/evora.git
git branch -M main
git push -u origin main
```

`.gitignore` already keeps out everything that must not be published:
`.env` (your passwords), `data/*.json` (real customer orders), and
`node_modules/`. **Check that before pushing** — if `git status` ever lists
`assets/server/.env`, stop.

---

## 3. Deploy on Render

1. Sign up at <https://render.com/> with your GitHub account.
2. **New** → **Blueprint**.
3. Pick the repository. Render reads `render.yaml` and shows one service
   named **evora**.
4. It asks for the `sync: false` values — fill them in from step 4 below.
5. **Apply**. The first build takes a few minutes.

---

## 4. Environment variables

Render asks for these when you apply the Blueprint (and they can be edited
later under **evora → Environment**):

| Key | Value |
|---|---|
| `NOTIFY_EMAIL` | `kododevelopers@gmail.com` |
| `BREVO_API_KEY` | from Brevo → SMTP & API → **API Keys** |
| `BREVO_SENDER_EMAIL` | the address you verified in Brevo |
| `UPSTASH_REDIS_REST_URL` | from step 1 |
| `UPSTASH_REDIS_REST_TOKEN` | from step 1 |
| `ADMIN_API_KEY` | a long random string — use the same one as local so your admin login keeps working |
| `PUBLIC_BASE_URL` | leave blank for now, set it after the first deploy |

`EMAIL_PROVIDER=brevo` is already set in `render.yaml`.

**Why the API key and not SMTP?** Render's free tier blocks outbound traffic
to SMTP ports 25, 465 and 587
([changelog](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)),
so `smtp-relay.brevo.com` would just time out. Brevo's HTTP API uses port 443
and sends the same 300 free emails/day.

**Do not** set `CORS_ORIGINS` — the same service serves the website and the
API, so they are the same origin and need no CORS at all.

---

## 5. Copy your existing orders into the database

Once the deploy says **Live**, copy the records from your laptop into Upstash.
Run this locally, with the two `UPSTASH_*` values temporarily in
`assets/server/.env`:

```powershell
cd "C:\Users\muham\OneDrive\Documents\EVORA\assets\server"
npm run migrate:redis
```

It merges by ID and never duplicates, so it is safe to run twice. To keep a
local backup later:

```powershell
npm run migrate:redis -- --pull
```

---

## 6. Check it

Visit `https://YOUR-SERVICE.onrender.com/health` — you should get
`{"status":"ok"}`.

Then:

1. Open the site, place a test order.
2. Confirm it appears in the admin dashboard and that both emails arrive.
3. Set `PUBLIC_BASE_URL` to the Render URL (e.g.
   `https://evora-xxxx.onrender.com`) and redeploy — this makes the
   "Track Your Order" links in customer emails work.

---

## 7. Stop it from sleeping

Render free services sleep after 15 minutes without traffic. Two options:

**A. Accept it.** The site still works; the first visitor after a quiet spell
waits ~30–60 seconds while the server wakes.

**B. Keep it awake (free).** Create a free monitor at
<https://cron-job.org/> that requests
`https://YOUR-SERVICE.onrender.com/health` every **10 minutes**.

Free plans include **750 instance-hours per month**. Running 24/7 is about
744 hours in a 31-day month, so it just fits — but there is very little
headroom. If Render suspends the service, switch the ping to daytime only
(e.g. 08:00–23:00) or upgrade to Starter ($7/month).

---

## Email on Render

Email goes out through **Brevo's HTTPS API** (`EMAIL_PROVIDER=brevo` +
`BREVO_API_KEY`). Nothing else is needed; the API key is what makes it work
on the free tier, where SMTP ports are closed.

To change the API key later: Render → **evora → Environment** →
`BREVO_API_KEY` → save. Render restarts the service automatically and the
next order uses the new key. `BREVO_SENDER_EMAIL` must stay an address
verified under **Senders & IPs** in Brevo, or sends fail with
`sender not valid`.

---

## Local development is unchanged

With `UPSTASH_*` blank in `assets/server/.env`, the server still reads and
writes `data/*.json` exactly as before. Nothing about running it locally has
changed.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Build fails on `npm ci` | `package-lock.json` missing from the repo — commit it |
| Orders vanish after a restart | `UPSTASH_*` not set, or set after the deploy |
| `The Evora backend isn't running` banner | The Render service is asleep (wait a minute) or the deploy failed — check **Logs** |
| Emails time out / `ETIMEDOUT` | SMTP is blocked on the free tier — use `BREVO_API_KEY` (HTTPS API), not the SMTP relay |
| `Brevo API: Key not found` | `BREVO_API_KEY` is wrong or revoked — create a new key under SMTP & API → API Keys |
| `sender not valid` | `BREVO_SENDER_EMAIL` is not verified under Senders & IPs |
| Admin page rejects the key | `ADMIN_API_KEY` on Render differs from the one you typed |
| 502 / timeout on first visit | Cold start — see step 7 |
