# Evora — Handoff Overview

A briefing for whoever picks up this project next. It covers what Evora is,
how it runs in production, what has been built, where everything lives, and
the traps that are easy to fall into. **No secret values are in this file** —
only environment-variable *names*. Real keys live in `assets/server/.env`
(local) and Vercel's environment variables (production), never in the repo.

- **Live site:** https://evora-server.vercel.app
- **Local repo:** `C:\Users\muham\OneDrive\Documents\EVORA`
- **GitHub:** `kododevelopers-commits/EVORA.` (note the trailing dot in the
  name; the remote URL is `…/EVORA..git`), branch `main`
- **Supabase project ref:** `tvyajshharknnkwdupoo`

---

## 1. What this is

Evora is a clothing store for the Pakistani market. It is a static front-end
(HTML / CSS / vanilla JS) plus a small Node.js + Express backend that handles
orders, contact complaints, order tracking, customer cancellations, customer
accounts, a role-based admin dashboard, and email notifications.

The owner is Pakistan-based, cost-sensitive (free tiers only, no credit card),
and judges every change on the **live site**, not on localhost. They test on a
laptop and a phone separately. Prefer the cheapest/free option that works and
state any limits before recommending something.

---

## 2. Live architecture (cloud-only)

There is **no laptop backend** any more. Everything runs in the cloud, and the
site keeps taking orders while the owner's laptop is off.

| Piece | Service | Notes |
|---|---|---|
| Website + API | **Vercel** | Static site published from `dist/`; the Express app runs as a serverless Function (`api/index.js`). Region `sin1`. |
| Database | **Supabase** (Postgres) | `orders`, `contacts`, `staff`, `products` tables + a `product-images` Storage bucket. Free tier. |
| Email | **Brevo** (HTTPS API) | 300 emails/day free, no card. HTTPS works where SMTP ports are blocked. |
| Source / deploy | **GitHub → Vercel** | Pushing to `main` auto-deploys in ~15–30s. No manual deploy step. |

**Request flow:** browser → Vercel static (`dist/`) for pages, and
`/api/*` + `/health` are rewritten (see `vercel.json`) to the Function
`api/index.js`, which does `module.exports = require('../assets/server/server.js').app`.
So every route in `server.js` works unchanged on Vercel.

**Storage backend priority** (`lib/storage.js`): Supabase → Upstash Redis →
local JSON files. Supabase wins when `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`
are set. **Products are the exception: they ALWAYS go through Supabase**
(`lib/products.js` → `lib/supabase-store.js`); there is no JSON/Redis fallback
for the catalogue.

---

## 3. Repository map

Root (storefront + deploy):

| File | Role |
|---|---|
| `index.html` `menu.html` `product.html` | home, shop grid, product detail |
| `checkout.html` | delivery details + Pakistan location picker + payment method |
| `track.html` | public order tracking **and customer self-cancellation** |
| `account.html` `account.js` | customer sign-in (Google / email+password) + their past orders |
| `contact.html` `about.html` | complaints/enquiries, the story |
| `admin.html` `admin.js` | role-based dashboard (orders, products, staff, stats) |
| `style.css` `script.js` | shared styles; cart/checkout/contact logic |
| `catalog.js` | **seed** catalogue + category list (NOT live product data) |
| `locations.js` | Pakistan dataset: 7 regions, 114 cities, 1783 areas |
| `location-picker.js` | city→area cascade, free-text street, GPS + keyless Google Maps |
| `api-client.js` | finds the backend from any origin; replaces `window.EVORA_CATALOG` with live `/api/menu` |
| `api/index.js` | Vercel Function entry (wraps the Express app) |
| `vercel.json` | build command, `dist/` output, `/api/*` + `/health` rewrites, region |
| `package.json` | root `build` script only |
| `tools/build-site.js` | copies the 20 storefront files + `assets/` (minus `assets/server`) into `dist/` |
| `tools/render-logo.js` | rebuilds `evora-logo.png` from the SVG (one-off, needs `sharp`) |
| `robots.txt` `sitemap.xml` `google76232651f15caf32.html` | SEO / Search Console verification |

Backend (`assets/server/`):

| File | Role |
|---|---|
| `server.js` | the Express app: all routes, order/contact/cancel logic, email templates |
| `lib/storage.js` | backend picker + per-collection write queue |
| `lib/supabase-store.js` | PostgREST client + row↔object mapping |
| `lib/products.js` | live catalogue: list / create / update / image upload |
| `lib/staff.js` | staff directory + roles; `ROOT_OWNER = 'evora.reply@gmail.com'` (fixed) |
| `lib/auth.js` | two-step sign-in, HttpOnly session cookies, role middleware, `sameOrigin` |
| `lib/customer-auth.js` | verifies a customer's Supabase Auth token; exposes public sign-in config + confirmed-email gate |
| `lib/mailer.js` | Brevo HTTPS / SMTP / Gmail / SendGrid sending + stats |
| `lib/brand.js` | the Evora logo embedded in every email |
| `lib/validation.js` | input validators (email, phone, fields, items) |
| `supabase-schema.sql` | idempotent DDL for all four tables + Storage bucket + grants |
| `seed-dashboard.js` | seeds fixture staff/products (used by tests/preview) |
| `test-dashboard.js` | 92 API scenarios; `--preview` serves a fixture site |
| `test-email.js` | sends a real test email (`npm run test:email`) |
| `setup-email.ps1` | Windows helper to save the email app password into `.env` |
| `.env` / `.env.example` | live secrets (git-ignored) / template |
| `data/` | local JSON fallback for orders/contacts |

Docs: `README.md` (root, user-facing), `assets/server/README.md` (backend),
`ACCOUNTS-SETUP.md` (one-time customer-accounts setup for the owner), this
`OVERVIEW.md`. **Docs are intentionally NOT in the build `FILES` array**,
so they never ship to the public `dist/`.

---

## 4. Features built (all live unless noted)

- **Storefront** — 21 real product photos; each product has a selling `price`
  and an optional `originalPrice` shown struck through. Categories: men,
  women, unisex.
- **Checkout location picker** — searchable City→Area cascade over the full
  Pakistan dataset, free-text street/landmark, GPS auto-fill, and keyless
  Google Maps address lookup. (Deployed in commit `e2c7ac0`.)
- **Order tracking** — `track.html?id=EVR-…` shows a live status timeline.
- **Customer cancellation** — on the track page, a customer can cancel their
  own order **only while `received` or `preparing`**, confirming with the
  order's email or phone. Once `out_for_delivery`/`delivered`/`cancelled`, it
  is locked. Enforced server-side. *(Built + verified locally; see §9 — not
  yet deployed.)*
- **Customer accounts** — an **Account** button in the left categories panel
  opens `account.html`: sign in / sign up with **Google** or **email +
  password** (Supabase Auth in the browser). The **Orders** tab auto-lists
  every past order placed with that **confirmed** email; each order links to
  its `track.html` progress timeline. The server verifies the token and reads
  orders by email with the service key — the DB stays locked (RLS denies
  anon/authenticated). Off until `SUPABASE_ANON_KEY` is set (page shows a
  "coming soon" notice). **Apple sign-in omitted** (needs a paid Apple
  Developer account). *(Built + verified locally; see §9 — not yet deployed.
  Owner setup: `ACCOUNTS-SETUP.md`.)*
- **Admin dashboard** — two-step sign-in (staff email + `ADMIN_API_KEY` →
  emailed one-time code → HttpOnly session). Roles: **owner** (everything +
  staff + email health), **admin** (orders + products), **viewer** (read-only,
  revenue/totals hidden). Tabs: Orders, Products, Staff, Stats.
- **Product management** — owners/admins add/edit products (name, price,
  original price, description, category, photos, availability) in the
  dashboard; saved to Supabase, live immediately. Photos upload to Supabase
  Storage. Optimistic-concurrency `version` guard on edits.
- **Email** — complaint, new-order (store + customer copies), and cancellation
  (store + customer copies) notices, plus admin sign-in codes. All branded
  with the embedded logo. Customer is the reply-to on the store's copies.

---

## 5. Data model

**Order object** (as the API sees it):

```
{ orderId: 'EVR-YYYYMMDD-XXXXXX', status, receivedAt, statusUpdatedAt,
  customer: { name, email (lowercase), phone, address, area },
  items: [ { id, name, qty, price } ],
  payment: { method, methodLabel },
  totals: { subtotal, gst, deliveryCharge, total } }
```

- `ORDER_STATUSES = ['received','preparing','out_for_delivery','delivered','cancelled']`.
- GST 18%, delivery Rs. 200. The server **recomputes** totals from the live
  catalogue and rejects stale prices with **409**.
- Payment methods (cod / card / jazzcash / easypaisa) are recorded only — no
  real money moves.

**Supabase tables** (`supabase-schema.sql`): `orders`, `contacts`, `staff`,
`products` (`id`, `data jsonb`, `position`, `version`). RLS is enabled with
**no policies**; only `service_role` has grants, so the public anon key reads
nothing. The `staff` table seeds the owner + two admins on first run.

> **Mapping trap:** `supabase-store.js` `orderToRow`/`orderFromRow` map ONLY
> the fixed columns listed above. Any extra field you add to an order object
> (e.g. `cancelledBy`, `cancelledAt`) is **silently dropped** on Supabase.
> That is why cancellation persists only `status` + `statusUpdatedAt` and
> conveys "customer cancelled" via email — no schema migration was needed.

---

## 6. Environment variables (names only — never commit values)

Set in **Vercel → Settings → Environment Variables** for production, and in
`assets/server/.env` for local dev. Template: `assets/server/.env.example`.

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | project REST URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_KEY` | **service_role** key — full access, server-only, never in browser/repo |
| `SUPABASE_ANON_KEY` | **publishable** (or legacy anon) key — public-safe, used by the browser for customer sign-in. Enables accounts; blank = accounts hidden. Never put the service key here. |
| `ADMIN_API_KEY` | the admin sign-in "password" (long random string) |
| `EMAIL_PROVIDER` | `brevo` in production |
| `BREVO_API_KEY` | Brevo HTTPS API key (wins over SMTP) |
| `BREVO_SENDER_EMAIL` | verified sender address |
| `NOTIFY_EMAIL` | store inbox for complaints + order alerts (defaults to the owner Gmail) |
| `PUBLIC_BASE_URL` | live site URL; used for "Track Your Order" links in email |
| `CORS_ORIGINS` / `CORS_ALLOW_LOCAL` | optional cross-origin allow-list |
| `UPSTASH_REDIS_REST_URL` / `…_TOKEN` | optional Redis fallback (not used now) |
| `PORT` | local only (3000) |

Email settings are re-read before every send, so a new key takes effect
without a restart. `brand.js` resolves the public base from `PUBLIC_BASE_URL`
→ `VERCEL_URL` (legacy `URL`/`DEPLOY_PRIME_URL` fallbacks remain).

---

## 7. Run / test / build / deploy

```bash
# Local dev (orders/contacts fall back to JSON; products need Supabase creds)
cd assets/server && npm install && npm start      # http://localhost:3000

# Tests — 92 API scenarios, no real email/DB/cloud
npm test --prefix assets/server

# Isolated fixture preview (real pages, in-memory mocked Supabase/Brevo)
node assets/server/test-dashboard.js --preview    # http://127.0.0.1:3100
#   login: any fixture staff email, key fixture-admin-key, code 123456

# Build the static site (what Vercel runs)
npm run build                                      # from repo root → dist/

# Email smoke test
cd assets/server && npm run test:email
```

**Deploy = commit + push to `main`.** Vercel auto-builds (`npm run build`) and
publishes `dist/` + the Function. Then verify on the live site.

---

## 8. Constraints & gotchas (read before changing anything)

1. **New root files must be added to `FILES` in `tools/build-site.js`** (20
   entries) or they won't be copied into `dist/` and won't ship. Docs
   (`OVERVIEW.md`, `ACCOUNTS-SETUP.md`, READMEs) must **NOT** be added — they
   stay out of the public site.
2. **Vercel project Root Directory must be empty.** The build runs from the
   repo root; `api/index.js` reaches `../assets/server/server.js`.
3. **Products always need Supabase.** Plain `npm start` with no cloud creds can
   serve pages (browser falls back to the `catalog.js` seed) but `/api/menu`
   and order price-checks return 503. Use the `--preview` harness to exercise
   the full flow with no cloud account.
4. **Public `GET /api/orders/:id` is sanitized** — returns only
   `customer.name`/`area`, never email/phone/address. Don't "fix" this by
   returning the full order; it would leak contact details and weaken the
   cancel identity check.
5. **Cancel is race-safe:** the status guard runs *inside* the
   `storage.update` mutator, so a concurrent admin status change can't be
   overwritten. The UI handles 409 by refreshing the timeline.
6. **Emails are awaited** (`Promise.allSettled`) before the response, because
   serverless functions freeze once they respond. A failed email never undoes
   the order/cancel; it is counted and surfaced as a red admin banner.
7. **Write endpoints** (`POST /api/orders`, `/api/contact`,
   `/api/orders/:id/cancel`) use `writeLimiter` only — **not** `sameOrigin` —
   so cross-origin local dev (Live Server → remote API) works. Admin mutations
   use `sameOrigin` + role middleware.
8. **Supabase drops unmapped order fields** (see §5). Persist only the fixed
   columns unless you also update `orderToRow`/`orderFromRow` AND the schema.
9. **Brevo free = 300/day.** Sending from a free Gmail address hurts
   deliverability (Gmail DMARC doesn't authorise Brevo); a verified custom
   domain is the durable fix. Click tracking is OFF (it broke the Track CTA).
10. **Secrets:** never commit `.env`, the Supabase service key, or Brevo keys;
    never echo key values in replies or shell commands. The service key is
    full-access — local `.env` and host env only.
11. **Pushes need fresh confirmation.** A previous "push it live" approval does
    not carry over to a new change. Confirm before each push.
12. **Windows / OneDrive quirks:** the shell is Git Bash. The `Write` tool can
    fail on an existing OneDrive file with "File has not been read yet" even
    after reading — use `Edit` for those. Paths use backslashes in PowerShell
    snippets, forward slashes in bash.

---

## 9. Current state (as of 2026-11-13)

- **Live / last deployed commit:** `e2c7ac0` — the Pakistan location picker.
  Everything in §4 except customer cancellation **and customer accounts** is
  live.
- **Uncommitted working tree** (a large, coherent changeset, NOT yet pushed):
  - **Cloud-only cleanup:** deleted `DEPLOY.md`, `netlify.toml`,
    `netlify/functions/api.js`, `render.yaml`, `start-evora.cmd`, and the
    `migrate-*.js` scripts; renamed `tools/build-netlify.js` →
    `tools/build-site.js`; removed the `serverless-http` dependency; updated
    the "backend isn't running" banners in `api-client.js` / `script.js` to
    cloud wording.
  - **Customer cancellation feature:** `server.js` (public
    `POST /api/orders/:id/cancel` + sanitized GET + cancel emails),
    `track.html` (cancel UI), `test-dashboard.js` (cancel scenarios).
  - **Customer accounts feature:** `lib/customer-auth.js` (token verify +
    public config + confirmed-email gate), `server.js`
    (`GET /api/account/config` + `GET /api/account/orders`, `accountLimiter`,
    `Authorization` in CORS), `account.html` + `account.js` (sign in/up,
    Orders/Profile tabs, recovery), `script.js` + `style.css` (Account button
    in the categories panel), `tools/build-site.js` (+`account.html`/
    `account.js` → 20 files), `.env.example` (`SUPABASE_ANON_KEY`),
    `test-dashboard.js` (6 account scenarios).
  - **Docs:** both READMEs rewritten for Vercel/Supabase/cloud-only + accounts;
    new `ACCOUNTS-SETUP.md` (owner setup guide); stale Netlify/Render comments
    fixed across `brand.js`, `mailer.js`, `storage.js`, `supabase-schema.sql`,
    `.env.example`; this `OVERVIEW.md`.
- **Verification done:** all **92** test scenarios pass; `npm run build`
  succeeds (20 files). The cancel flow was verified end-to-end in the browser
  on the fixture preview (received→cancel button; wrong identity→403; correct
  +92 phone→success; out_for_delivery→locked + 409; race→409 + timeline
  refresh). The accounts flow was browser-verified against the real render
  code (config-off notice; sign-in/sign-up tabs; signed-in header + Orders
  list; order card → `track.html`; unconfirmed-email gate; single orders fetch
  on OAuth redirect; mobile layout at 548px with no overflow). No real data or
  email was touched (preview is in-memory).
- **Next step:** commit the changeset and push to `main` to ship cancellation
  + accounts + cleanup live — **after confirming with the owner**. Accounts
  also need the one-time dashboard setup in `ACCOUNTS-SETUP.md` (Email+Google
  providers, redirect URLs, Brevo SMTP, `SUPABASE_ANON_KEY` in Vercel) before
  they work for real customers; until then the page shows "coming soon". Then
  re-verify on https://evora-server.vercel.app.

### Quick task tracker

The work was tracked as tasks #1–#40. #1–#33 and #35–#39 are complete.
**#34** (deploy customer cancellation) and **#40** (setup guide + docs) are the
open items. #40's docs are written; both #34 and the accounts feature are built
and verified, awaiting the owner's go-ahead to push.