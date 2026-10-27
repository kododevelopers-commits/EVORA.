# Deploying Evora (free, no credit card)

This puts the site **and** the order backend online, so orders arrive and
emails go out even when your laptop is switched off.

Three services, all free and none needing a card:

| Service | Job | Plan |
|---|---|---|
| **Netlify** | serves the site, runs the backend as a function | Free (300 credits/month) |
| **Upstash** | stores orders and complaints | Free (250 MB) |
| **Brevo** | sends the emails | Free (300 emails/day) |

> **Why Netlify and not Render?** Render now asks for a card even on the free
> plan. Netlify's free plan needs none and allows commercial use. Vercel's
> free Hobby plan is cheaper to set up but is restricted to non-commercial
> projects.

> **The laptop is no longer involved.** Once deployed, customers reach the
> Netlify URL, the function records the order in Upstash, and Brevo delivers
> the two emails. Your computer can be off.

---

## What the backend actually runs on

Netlify serves the static pages from `dist/` and forwards `/api/*` and
`/health` to `netlify/functions/api.js`, which wraps the same Express app in
`assets/server/server.js`. No behaviour changes — same endpoints, same order
validation, same admin dashboard.

Netlify Functions do not sleep for 15 minutes like Render; a cold start is
milliseconds, so customers never wait.

---

## 1. Create the site

1. Sign up at <https://app.netlify.com/signup> with **GitHub** (no card).
2. **Add new site → Import an existing project → GitHub**.
3. Authorise Netlify for the `EVORA.` repository when asked.
4. Pick the repository. Netlify reads `netlify.toml` and fills in:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
5. Do **not** deploy yet — add the environment variables first (next step).

---

## 2. Environment variables

**Site configuration → Environment variables → Add a variable** (add all
seven, then deploy):

| Key | Value |
|---|---|
| `NOTIFY_EMAIL` | `evora.reply@gmail.com` |
| `BREVO_API_KEY` | from Brevo → SMTP & API → **API Keys** (`xkeysib-…`) |
| `BREVO_SENDER_EMAIL` | the address verified under Senders & IPs |
| `UPSTASH_REDIS_REST_URL` | from the Upstash database's **REST API** section |
| `UPSTASH_REDIS_REST_TOKEN` | same section |
| `ADMIN_API_KEY` | your existing key from `assets\server\.env` |
| `PUBLIC_BASE_URL` | leave empty for now |

Email goes through **Brevo's HTTPS API**, not SMTP: Netlify's functions
cannot open SMTP connections, and the API key is what the backend uses when
it is set. Keep **IP blocking off** in Brevo (Security → Authorised IPs);
Netlify's outbound addresses change.

---

## 3. Deploy

1. **Deploys → Trigger deploy → Deploy site**.
2. Watch the log: `npm ci` for the backend, `Site built into dist/`, then
   **Functions bundling**.
3. When it says **Published**, open `https://YOUR-SITE.netlify.app/health` —
   it should return `{"status":"ok"}`.

---

## 4. Point the emails at the real address

1. Copy the site URL (`https://something.netlify.app`).
2. Site configuration → Environment variables → set `PUBLIC_BASE_URL` to it.
3. **Deploys → Trigger deploy** again (this makes "Track Your Order" links in
   customer emails work).

Each deploy costs **15 credits**, so batch changes when you can.

---

## 5. Check it end to end

1. Open the site and place a test order.
2. Confirm both emails arrive (your inbox + the customer address).
3. Open `/admin.html` with your `ADMIN_API_KEY` and check the order appears.
4. Send a test complaint from the contact page.

Existing orders were copied to Upstash already. To copy new local ones later:

```powershell
cd assets\server
npm run migrate:redis
```

(`UPSTASH_*` must be in `.env` for that command.)

---

## Free plan limits

Netlify gives **300 credits/month**, hard stop (the site pauses until the
next month if used up):

| Action | Cost | Rough allowance |
|---|---|---|
| Deploy | 15 credits | ~20 deploys |
| Bandwidth | 20 credits/GB | ~15 GB |
| Function requests | 2 credits/10k | ~150,000 requests |
| Function compute | 10 credits/GB-hour | plenty at this size |

For a small shop that is comfortable — just don't redeploy dozens of times a
month. Upstash free: 250 MB / 500k commands. Brevo free: 300 emails/day
(two per order, so ~150 orders/day).

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Build fails on `npm ci` | `assets/server/package-lock.json` missing from the repo |
| `/health` returns 500 | Check **Deploys → Functions → api → Logs**; usually a missing environment variable |
| "The Evora backend isn't running" banner | The function failed — read the function log, then redeploy |
| Emails fail: `Key not found` | `BREVO_API_KEY` wrong or revoked |
| Emails fail: `sender not valid` | `BREVO_SENDER_EMAIL` isn't verified in Brevo |
| Emails fail: `unrecognised IP` | Turn off Brevo's IP blocking (Security → Authorised IPs) |
| Orders vanish after a while | `UPSTASH_*` missing — the function fell back to files it cannot keep |
| Admin page rejects the key | `ADMIN_API_KEY` on Netlify differs from what you typed |
| Site paused mid-month | Out of credits — check **Team → Usage** |

---

## Local development is unchanged

Run `npm start` in `assets\server` exactly as before. `dist/` and
`netlify/functions` are only used by Netlify.

`render.yaml` is kept for reference but is not used: Render's free plan now
requires a credit card.
