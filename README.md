# Evora — Modern Apparel

A clothing store for the Pakistani market: a static front-end (HTML / CSS /
vanilla JS) plus a small Node.js + Express backend that handles orders,
contact complaints, order tracking, customer cancellations and email
notifications.

**The store is live at https://evora-server.vercel.app** — it keeps taking
orders even when your laptop is off. There is no laptop backend to start any
more; everything runs in the cloud.

| Piece | Service | Notes |
|---|---|---|
| Website + API | **Vercel** | static site from `dist/`, Express API as a serverless function (`api/index.js`). Region `sin1`. |
| Database | **Supabase** (Postgres) | orders, contacts, staff, products. Free tier. |
| Email | **Brevo** (HTTPS API) | 300 emails/day free, no credit card. |
| Source / deploy | **GitHub** → Vercel | pushing to `main` auto-deploys in ~15–30s. |

> For a full handoff briefing (architecture, features, env vars, gotchas) see
> **[OVERVIEW.md](OVERVIEW.md)**.

---

## Run it locally (for development)

The live site needs nothing from you. To work on the code locally:

```bash
cd assets/server
npm install     # first time only
npm start
```

Then open **http://localhost:3000**. That one server serves the whole site
*and* the API.

- **Orders, contacts and staff** fall back to local JSON files in
  `assets/server/data/` when no cloud credentials are set, and emails print to
  the terminal instead of sending.
- **Products always come from Supabase**, so to browse the shop and place
  orders locally you need `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `.env`.

To exercise the whole flow with **no cloud credentials at all**, use the
isolated fixture preview under [Tests](#tests) — it mocks Supabase and Brevo
in memory and never touches live data.

The pages also work when opened from VS Code Live Server (`:5500`), another
static server, or a `file://` path — `api-client.js` finds the backend on its
own. But `http://localhost:3000` is the one to bookmark.

### Build the static site

```bash
npm run build      # from the project root
```

This installs the backend's production dependencies and runs
`tools/build-site.js`, which copies the storefront files into `dist/`
(everything except `assets/server`). Vercel runs this same command on deploy.
**If you add a new root-level page or script, add it to the `FILES` array in
`tools/build-site.js` or it won't ship.**

### Tests

```bash
npm test --prefix assets/server                 # 86 API scenarios, no real email/DB
node assets/server/test-dashboard.js --preview  # isolated fixture site at 127.0.0.1:3100
```

The preview serves the real pages against an in-memory fixture backend
(login: any fixture staff email, key `fixture-admin-key`, code `123456`).
It never calls real Supabase, Brevo or Vercel.

---

## What you can do on the site

| Page | URL | What it is |
|---|---|---|
| Home | `/index.html` | landing page, featured products |
| Shop | `/menu.html` | the full catalogue, filters, search, cart |
| Product | `/product.html?slug=olive-drape-coord-set` | one product, size picker, strikethrough original price |
| Checkout | `/checkout.html` | Pakistan city→area picker + GPS / Google Maps address, payment method |
| Track | `/track.html?id=EVR-…` | live order status; customers can cancel while it's still received/preparing |
| Account | `/account.html` | customer sign-in (Google or email + password) and an Orders tab |
| Contact | `/contact.html` | complaints, order help, general questions |
| About | `/about.html` | the story |
| **Admin** | `/admin.html` | orders, products, staff, stats (role-based) |

### Admin dashboard

Open `/admin.html` on the live site (or http://localhost:3000/admin.html
locally). Sign-in is two-step:

1. Enter your **staff email** and the **admin key** (`ADMIN_API_KEY` in
   `assets/server/.env`, or the matching Vercel env var). The server emails
   you a one-time sign-in code.
2. Enter that code. You're signed in with a secure cookie — tick "remember
   me" to stay signed in for 30 days.

Only emails listed in the **Staff** tab can sign in. There are three roles:

| Role | Can do |
|---|---|
| **owner** | everything: orders, products, staff management, email health |
| **admin** | orders + products (no staff management) |
| **viewer** | read-only orders/contacts; revenue and totals hidden |

The owner account (`evora.reply@gmail.com`) is fixed — it can't be removed
or demoted.

You can then:

- see every order and change its status
  (`received → preparing → out for delivery → delivered`, or `cancelled`),
- add and edit products (price, original price, photos) — changes save to
  Supabase and show on the storefront immediately,
- manage staff (owner only),
- read every contact-form message,
- click **Reply by email** on any order or complaint to answer the customer
  straight from your inbox,
- see a **red banner** at the top if an email failed to send — so a complaint
  is never silently lost.

The dashboard refreshes itself every 15 seconds.

#### Customer cancellations

Customers can cancel their own order from the **Track** page, but only while
it is `received` or `preparing`. They confirm with the email or phone number
on the order. Once you move it to `out for delivery` (or `delivered`), the
cancel button disappears and the server rejects any cancel attempt — an
order already on its way can't be pulled back by the customer. Both you and
the customer get a cancellation email.

#### Customer accounts

The **Account** button at the top of the left menu opens `/account.html`.
Customers sign in with **Google** or **email + password** (sign-up confirms the
email by link). Once signed in, the **Orders** tab lists every order placed with
that email — newest first — and tapping one opens its live `track.html`
timeline. Sign-in runs in the browser via Supabase Auth; the server only sees a
short-lived token, verifies it, and requires a **confirmed email** before
returning that customer's orders. The database stays locked, so the public
browser key can read no shop data.

Accounts are **off until configured** (the page shows "coming soon"). To switch
them on, follow **[ACCOUNTS-SETUP.md](ACCOUNTS-SETUP.md)** — enable Email +
Google providers in Supabase, set the redirect URLs, connect Brevo SMTP for
confirmation emails, and add `SUPABASE_ANON_KEY` in Vercel. Apple sign-in is
intentionally omitted (it needs a paid Apple Developer account).

---

## Email notifications

The backend sends real email through **Brevo** (300/day free) over its HTTPS
API — which works on Vercel, where outbound SMTP ports are blocked. Gmail,
SendGrid or any SMTP server also work if you prefer (see the backend README).

`NOTIFY_EMAIL` is the store inbox that receives complaints and order alerts
(it defaults to `evora.reply@gmail.com`).

| Trigger | To | Reply-To |
|---|---|---|
| Contact form / complaint | `NOTIFY_EMAIL` | the customer's email |
| New order | `NOTIFY_EMAIL` | the customer's email |
| New order | the customer's email | `NOTIFY_EMAIL` |
| Customer cancels an order | `NOTIFY_EMAIL` | the customer's email |
| Customer cancels an order | the customer's email | `NOTIFY_EMAIL` |
| Admin sign-in | the staff member's email | — (one-time code) |

So pressing **Reply** in your inbox answers the customer directly, and every
customer gets their own confirmation.

Every email carries the Evora logo at the top (see [The logo](#the-logo)
below). The logo is embedded directly in the message, so it shows up on the
live site and in every mail client.

Settings live in `assets/server/.env` locally, or in the Vercel environment
variables in production. They are re-read before every send, so you can paste
a new key while the server is running — no restart needed.

Test it any time:

```bash
cd assets/server
npm run test:email
```

Full email setup, providers and troubleshooting:
[`assets/server/README.md`](assets/server/README.md).

---

## Project layout

```
EVORA/
├── index.html  menu.html  product.html
├── checkout.html  track.html  account.html  contact.html  about.html
├── admin.html                 <- role-based admin dashboard
├── style.css  script.js  account.js  admin.js
├── catalog.js                 <- seed catalogue + categories (live products live in Supabase)
├── locations.js               <- Pakistan city→area dataset
├── location-picker.js         <- checkout address picker + GPS / Google Maps
├── api-client.js              <- finds the backend, whatever serves the page
├── api/index.js               <- Vercel Function entry (wraps the Express app)
├── vercel.json                <- Vercel build + rewrite config
├── package.json               <- root build script (npm run build)
├── README.md  OVERVIEW.md  ACCOUNTS-SETUP.md   <- docs (not shipped in dist/)
├── assets/                    <- images, icons, and the backend folder
│   ├── evora-logo.svg         <- THE logo (website)
│   ├── evora-logo.png         <- the same logo, for email + og:image
│   └── server/
│       ├── server.js          <- the Express app
│       ├── .env               <- live secrets (never commit this)
│       ├── .env.example       <- template
│       ├── supabase-schema.sql<- orders / contacts / staff / products tables
│       ├── seed-dashboard.js  <- seeds fixture staff/products for local tests
│       ├── test-dashboard.js  <- 92 API scenarios + --preview fixture site
│       ├── test-email.js      <- "is my email working?" check
│       ├── setup-email.ps1    <- saves your app password safely
│       ├── lib/               <- mailer, brand, auth, customer-auth, staff, products, storage, validation
│       └── data/              <- local JSON fallback (orders / contacts)
└── tools/
    ├── build-site.js          <- assembles dist/ for Vercel
    └── render-logo.js         <- rebuilds evora-logo.png from the SVG
```

---

## The logo

There is one piece of artwork, in two formats:

| File | Where it is used |
|---|---|
| `assets/evora-logo.svg` | every visible logo on the website (header, footer, category panel) |
| `assets/evora-logo.png` | the emails, and the `og:image` for social previews |

**Why two?** Gmail and most other webmail clients strip `<svg>` images out of
HTML mail, so an SVG logo arrives as a broken image. The PNG is a raster render
of the exact same artwork, so the email shows the logo everywhere.

Both are committed, so there is nothing to install or build. If you ever change
the artwork, update the SVG and rebuild the PNG:

```bash
npm install --no-save sharp
node tools/render-logo.js
```

`sharp` is only needed for that one-off — it is **not** a dependency of the
backend. After rebuilding, redeploy so the live site picks the new logo up
(or restart the local server).

---

## Editing the shop

- **Products, prices, original prices, photos, descriptions** → edit them in
  the **admin dashboard → Products** tab. They save to Supabase and appear on
  the storefront immediately — no redeploy, no file editing.
- **Categories** → `catalog.js` (the `categories` array). That file also holds
  the *seed* catalogue used to provision/reset the database
  (`seed-dashboard.js`); it is no longer the live source of truth for products.
- **Pages and layout** → the `*.html` files and `style.css`.
- **Cart, checkout, location picker, contact form** → `script.js`,
  `location-picker.js` and `locations.js`.

The browser loads `catalog.js` as a fallback, then `api-client.js` replaces it
with the live `/api/menu` response, so the shop always shows current products.

Prices are never trusted from the browser: `POST /api/orders` looks every item
up in the live catalogue and recomputes the subtotal, 18% GST and the Rs. 200
delivery charge, so editing prices in devtools cannot change what an order
costs. If a price changed since the page loaded, the order is rejected (409)
and the customer is asked to reload.

---

## Deployment

The store is hosted on **Vercel**, which auto-deploys whenever you push to
`main` on GitHub (~15–30s). There is no manual deploy step and no laptop
server to keep running.

- **Static site** — Vercel runs `npm run build` (`tools/build-site.js`) and
  publishes `dist/`.
- **API** — `api/index.js` wraps the Express app as a Vercel Function.
  `vercel.json` rewrites `/api/*` and `/health` to it. Region: `sin1`.
- **Database** — Supabase Postgres (orders, contacts, staff, products).
- **Email** — Brevo HTTPS API.

### Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in
`assets/server/.env` for local dev). Never commit real values.

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project REST URL |
| `SUPABASE_SERVICE_KEY` | service_role key — full access, server-only |
| `SUPABASE_ANON_KEY` | publishable (or legacy anon) key — public-safe, browser sign-in; enables customer accounts. Leave blank to hide them. |
| `ADMIN_API_KEY` | the admin sign-in "password" |
| `EMAIL_PROVIDER` | `brevo` |
| `BREVO_API_KEY` | Brevo HTTPS API key |
| `BREVO_SENDER_EMAIL` | verified sender address |
| `NOTIFY_EMAIL` | store inbox for complaints + order alerts |
| `PUBLIC_BASE_URL` | live site URL, used for "Track Your Order" links in email |
| `CORS_ORIGINS` | optional extra allowed origins |

`assets/server/.env.example` is the full template (it also lists the optional
Upstash Redis fallback and Gmail/SendGrid/SMTP email providers).

### Shipping a change

1. Edit the code.
2. Run `npm test --prefix assets/server` (92 scenarios) and `npm run build`.
3. Commit and push to `main`. Vercel redeploys automatically.
4. Check the live site.

**New root-level pages or scripts must be added to the `FILES` array in
`tools/build-site.js`**, or they won't be copied into `dist/`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Live site won't load / API errors | Check the Vercel deployment and function logs. Confirm the env vars (Supabase, Brevo, `ADMIN_API_KEY`) are set in Vercel. |
| "Place order" does nothing | Open the browser console. On the live site this is usually a failed API call — check Vercel logs. Locally, make sure `npm start` is running. |
| Page loads but the shop is empty | The API didn't return products. Check the Supabase credentials and that the `products` table is seeded (`seed-dashboard.js`). |
| `EADDRINUSE` / port 3000 busy (local) | Another local copy is running. Stop it, or just use the live site. |
| `node` is not recognised | Reinstall Node.js from https://nodejs.org, then open a **new** terminal. |
| No email arrives | Run `npm run test:email` in `assets/server`, then check the spam folder. Confirm the Brevo key/sender in `.env` (or Vercel). |
| The email has no logo | `assets/evora-logo.png` is missing. Rebuild it with `node tools/render-logo.js`, then redeploy. |
| Can't sign in to admin | Your email must be in the Staff tab and `ADMIN_API_KEY` must match. The sign-in code is emailed — check spam. |
| Red banner on the admin page | An email failed to send. The banner names the error — fix it and the banner clears itself. |

### How the pages find the backend

`api-client.js` runs on every page. It works out where the backend is:

1. `window.EVORA_API_URL` if you set one (forces a specific address),
2. the address the page was served from,
3. `http://localhost:3000`,
4. `http://127.0.0.1:3000`.

It keeps the first one that answers `/api/menu` and sends every request there.
If **none** answer, a red banner appears telling you the API isn't reachable
instead of showing a bare "405 Method Not Allowed". On the live site the API
is always up; this fallback mainly matters when running locally.

The server allows requests from `localhost` and `127.0.0.1` (any port) and
from `file://` pages by default — those can only be reached from this
machine. Websites on the internet get no CORS headers. To host the frontend
somewhere else, list that origin in `CORS_ORIGINS` in `assets/server/.env`.
