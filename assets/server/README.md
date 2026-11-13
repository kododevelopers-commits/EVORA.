# Evora — Backend

This is the backend for the Evora site. Locally it serves the static site
itself (HTML / CSS / JS / images) **and** a small JSON API the frontend uses
to place orders, save contact messages, track and cancel orders, show the
menu, and let customers sign in to see their past orders. In production the
same Express app runs as a Vercel Function
(`api/index.js`) and the static site is served from `dist/`.

It runs on Node.js. Data lives in **Supabase Postgres** in production (orders,
contacts, staff, products); locally it falls back to JSON files so you can try
it without any cloud account. A role-based admin dashboard is built in.

---

## Folder layout

```
EVORA/
├── index.html  menu.html  product.html
├── checkout.html  track.html  contact.html  about.html
├── style.css  script.js  admin.js
├── catalog.js          <- seed catalogue + categories (live products are in Supabase)
├── locations.js        <- Pakistan city→area dataset
├── location-picker.js  <- checkout address picker + GPS / Google Maps
├── api-client.js       <- finds the backend, whatever serves the page
├── admin.html          <- role-based admin dashboard
├── account.html  account.js  <- customer sign-in + their past orders
├── api/index.js        <- Vercel Function entry (wraps server.js)
├── vercel.json         <- Vercel build + rewrite config
├── tools/build-site.js <- assembles dist/ for deployment
├── assets/
│   └── server/         <- everything below is the backend
    ├── server.js         (the Express app)
    ├── package.json
    ├── supabase-schema.sql (orders / contacts / staff / products tables)
    ├── seed-dashboard.js (seeds fixture staff/products for local tests)
    ├── test-dashboard.js (92 API scenarios + --preview fixture site)
    ├── test-email.js     (sends a test email to check your setup)
    ├── setup-email.ps1   (helper: saves your app password into .env)
    ├── .env.example      (copy to .env and fill in)
    ├── .gitignore
    ├── lib/              <- small helpers
    │   ├── storage.js    (backend picker: Supabase → Redis → JSON)
    │   ├── supabase-store.js (Postgres REST backend + row mapping)
    │   ├── products.js   (live catalogue: list/create/update/upload)
    │   ├── staff.js      (staff directory + owner/admin/viewer roles)
    │   ├── validation.js (input validators)
    │   ├── auth.js       (two-step sign-in, sessions, role middleware)
    │   ├── customer-auth.js (customer sign-in: verifies a Supabase Auth token)
    │   ├── brand.js      (the Evora logo, embedded into every email)
    │   └── mailer.js     (sending email + provider setup)
    └── data/             <- local JSON fallback (auto-created)
        ├── orders.json    (created on first order, when Supabase is off)
        └── contacts.json  (created on first contact submission)
```

---

## 1. Install Node.js

If you don't already have it: download from https://nodejs.org (the LTS
version). To check it's installed, run:

```
node --version
```

## 2. Install the dependencies

Open a terminal **inside the `server` folder** and run:

```
cd server
npm install
```

This downloads Express, Nodemailer, Helmet, express-rate-limit and dotenv
into a `node_modules` folder (only needs to be done once).

## 3. Run the server

Still inside `server/`:

```
npm start
```

You should see something like:

```
Evora server running at http://localhost:3000
  Home:        http://localhost:3000/
  Menu:        http://localhost:3000/menu.html
  Checkout:    http://localhost:3000/checkout.html
  Admin:       http://localhost:3000/admin.html
  Health:      http://localhost:3000/health
  Orders JSON: http://localhost:3000/api/orders
  Menu JSON:   http://localhost:3000/api/menu
```

Open **http://localhost:3000** in your browser — that's your whole site,
served by this server. Add something to your cart, go to checkout, fill in
the form, and click **Place Order**. You should see the order confirmation
screen, and in the terminal you'll see the order details (and an email
notification if you configured one — see step 5).

## 4. Use the admin dashboard

The admin dashboard at `/admin.html` lets you see all orders, change their
status (received → preparing → out for delivery → delivered, or cancelled),
add and edit products, manage staff, view contact submissions, and see stats.

### Sign-in (two-step)

1. Copy `.env.example` to `.env` and set `ADMIN_API_KEY` to a long random
   string. Easiest way:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   In production this same value is a Vercel environment variable.
2. Make sure your email is in the **staff** table with a role (see below).
   The fixed owner is `evora.reply@gmail.com`.
3. Open `/admin.html`, enter your **staff email** and the **admin key**. The
   server checks the key, then emails you a one-time sign-in code (via Brevo,
   using Supabase Auth).
4. Enter the code. You're signed in with **HttpOnly session cookies**
   (`evora_access` / `evora_refresh`); "remember me" keeps the session 30 days.
   The dashboard polls for new orders every 15 seconds.

The admin key is only used to *start* sign-in — it is never stored in the
browser. After that, every admin request is authenticated by the session
cookie, not a key in a header or URL.

### Roles

| Role | Access |
|---|---|
| **owner** | everything, plus staff management and email health (fixed `ROOT_OWNER`) |
| **admin** | orders + products |
| **viewer** | read-only orders/contacts; revenue and totals hidden |

Staff are managed in the dashboard's **Staff** tab (owner only) and stored in
the Supabase `staff` table. These endpoints require a signed-in session:

- `GET  /api/orders`             — list orders (contains customer data)
- `GET  /api/stats`              — revenue, order counts, top items
- `GET  /api/contacts`           — contact form submissions
- `PATCH /api/orders/:id/status` — change an order's status (owner/admin)
- `GET/POST/PATCH/DELETE /api/admin/staff…` — staff management (owner)
- `GET/POST/PATCH /api/admin/products…`     — product editing (owner/admin)

### CORS

The site is served by this same server, so it needs no CORS headers. If you
host the frontend on a different origin, list that origin in `CORS_ORIGINS`
(comma separated) in `.env`:

```
CORS_ORIGINS=https://www.evora.example,https://evora.example
```

Anything not listed gets no CORS headers, so other sites cannot read API
responses from a visitor's browser.

**Local origins are allowed by default.** `http://localhost:*`,
`http://127.0.0.1:*` and `file://` pages (which send the origin `null`) are
accepted without any configuration, because they can only be reached from this
machine. This is what lets you open the site from VS Code Live Server
(`http://localhost:5500`) or by double-clicking an `.html` file and still get
working orders — `api-client.js` in the project root finds the backend on
port 3000 and calls it from wherever the page was opened. Websites on the
internet are still refused.

If you want to tighten this, put your own list in `CORS_ORIGINS` and set
`CORS_ALLOW_LOCAL=false` in `.env`.

## 5. Turn on email (complaints + orders)

By default, the server just *prints* what each email would say instead of
sending it, so you can test everything without setting up email first.

When you're ready for real emails:

1. Copy `.env.example` to `.env` in the `server` folder.
2. Open `.env` and fill in `ADMIN_API_KEY` (above) **and** the email values.
3. Set `NOTIFY_EMAIL` to the address that should receive notifications —
   this is where complaints and order alerts land.
4. Restart the server (`Ctrl+C`, then `npm start` again).
5. Check it worked:

   ```
   npm run test:email
   ```

   That sends a real message through the exact code path a live order uses.
   Pass an extra address to also check the customer copy:

   ```
   npm run test:email -- someone@example.com
   ```

#### Easiest way to save the app password

Instead of editing `.env` by hand, run the helper. It asks for the app
password without echoing it to the screen, strips the spaces, and writes it
to the right line:

```
cd assets\server
powershell -ExecutionPolicy Bypass -File .\setup-email.ps1
```

To do it by hand instead: open `assets\server\.env` in Notepad and paste the
16 characters after `GMAIL_APP_PASSWORD=`.

### Which email provider?

**Option A — Gmail** (quickest for personal testing)

1. Turn on 2-Step Verification on the Gmail account:
   https://myaccount.google.com/security
2. Create an "App Password" (Google Account → Security → App passwords).
   Use that 16-character code, **not** your normal password, and type it
   without spaces.
3. Set in `.env`:
   ```
   EMAIL_PROVIDER=gmail
   GMAIL_USER=youraccount@gmail.com
   GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
   ```

**Option B — Brevo** (recommended for a real store; 300 emails/day free)

1. Create a free account: https://www.brevo.com/ (no credit card).
2. Add your sending address under **Senders & IPs** and click the link Brevo
   emails you to verify it.
3. Brevo dashboard → **SMTP & API**:
   - **API Keys** tab → **Create a new API key** (preferred) — uses HTTPS,
     so it also works on hosts that block SMTP, such as Vercel.
   - or **SMTP** tab → copy the **login** and create an **SMTP key** (local
     machines and paid hosts).
   Neither the login nor the keys are your Brevo account email or password.
4. Set in `.env`:
   ```
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY=xkeysib-your-api-key      # takes priority over SMTP
   BREVO_SENDER_EMAIL=the-address-you-verified
   # only if you use the SMTP relay instead:
   # BREVO_SMTP_HOST=smtp-relay.brevo.com
   # BREVO_SMTP_PORT=587
   # BREVO_SMTP_USER=your-smtp-login
   # BREVO_SMTP_KEY=your-smtp-key
   ```
5. Check it with `npm run test:email`.

Brevo's free plan caps at 300 emails per day. If you ever send from a free
mailbox (e.g. a Gmail address) through Brevo, deliverability is lower than
with a domain you own, because Gmail's own DMARC record does not authorise
Brevo to send on its behalf. It still works — a verified custom domain is
just the better long-term setup.

**Option C — SendGrid** (alternative, 100 emails/day free)

1. Create a free account: https://signup.sendgrid.com/
2. Create an API key: Settings → API Keys → Create API Key.
3. Verify a sender email: Settings → Sender Authentication.
4. Set `EMAIL_PROVIDER=sendgrid`, `SENDGRID_API_KEY`, and
   `SENDGRID_FROM_EMAIL`.

**Option D — Any other SMTP provider** (Hostinger, Zoho, your own relay…)

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false          # true for port 465
SMTP_USER=you@yourdomain.com
SMTP_PASS=your-mail-password
SMTP_FROM=you@yourdomain.com   # optional, defaults to SMTP_USER
```

### What actually gets sent

| Trigger | To | Reply-To | What it is |
|---|---|---|---|
| Contact form / complaint | `NOTIFY_EMAIL` | the customer's email | Their message, their name, phone, subject, plus a "Reply to <name>" button |
| New order | `NOTIFY_EMAIL` | the customer's email | Items, totals, delivery address, payment method, plus a "Reply to <name>" button |
| New order | the customer's email | `NOTIFY_EMAIL` | A branded confirmation: order ID, items table, totals, delivery address, "what happens next" and a "Track Your Order" button |
| Customer cancels | `NOTIFY_EMAIL` | the customer's email | Which order was cancelled, customer details, items and total |
| Customer cancels | the customer's email | `NOTIFY_EMAIL` | A branded "your order has been cancelled" note with a "View order" button |
| Admin sign-in | the staff member's email | — | A one-time sign-in code |

Because the customer is the reply-to address on the store's copies, pressing
**Reply** in your inbox answers them directly — no copying addresses around. The
customer's copy is sent as both **HTML** (branded template) and plain text
for clients that don't render HTML.

If an email fails to send, the order or complaint is still saved and the API
still responds successfully; only the terminal logs the failure.

> When `EMAIL_PROVIDER` is not set, the server prints the email to
> the terminal and also saves the HTML version to
> `server/data/last-customer-email.html` so you can open it in a
> browser and see exactly what the customer would receive.

### No restart needed after changing .env

The email settings are re-read from `.env` before every send, so if you paste
your app password while the server is already running it starts working
immediately — no `Ctrl+C`, no `npm start`. The file wins over the environment
the server was started with; if there is no `.env` file at all, the real
environment variables are used (that's what a hosting platform injects).

### When an email fails, the dashboard says so

A complaint that silently fails to send is the worst possible outcome — you
think you got it, and you didn't. So the server counts every failed send and
the admin dashboard shows a **red banner** at the top:

> ⚠ **Email problem** — 1 email could not be sent (last failure 2026-10-21
> 18:52). Some complaints or order confirmations were never delivered — check
> your inbox and send them again. Server said: `Invalid login: 535-5.7.8 ...`

The banner also appears when no email provider is configured at all. It
clears itself as soon as sending works again. The same numbers are in
`GET /api/stats` under `email` (`sent`, `failed`, `lastError`,
`lastFailureAt`, `lastSentAt`).

### If emails don't arrive

The startup banner tells you what the server thinks is configured:

```
📧  Email: provider=gmail, sending as you@gmail.com
    Store inbox (orders + complaints): you@gmail.com
    Customers get a copy of their order confirmation.
```

Common causes:

| Symptom | Fix |
|---|---|
| "provider=gmail but GMAIL_APP_PASSWORD is empty" | You forgot to paste the app password into `.env` |
| `535 Authentication failed` | The app password is wrong, or 2-Step Verification isn't on |
| Nothing arrives, no error | Check spam; also confirm `NOTIFY_EMAIL` is spelled correctly |
| `ETIMEDOUT` / `ECONNREFUSED` | Your network blocks outbound port 587 — try a different provider |

---

## API reference

### Public

| Method | Path                       | What it does |
|--------|----------------------------|--------------|
| GET    | `/health`                  | uptime / liveness check |
| GET    | `/api/menu`                | list live products (optional `?category=men`) |
| GET    | `/api/menu/:id`            | get a single product |
| GET    | `/api/orders/:id`          | look up one order by id — the public view returns only `customer.name`/`area`, never email/phone/address |
| POST   | `/api/orders`              | place a new order (rate-limited: 30 / 15 min per IP) |
| POST   | `/api/orders/:id/cancel`   | customer cancels their own order — only while `received`/`preparing`; verifies the order's email or phone (rate-limited) |
| POST   | `/api/contact`             | save a contact-form submission (rate-limited: 5 / hour per IP) |
| GET    | `/api/account/config`      | public sign-in config (Supabase URL + publishable key, or `enabled:false` when accounts are off) |
| GET    | `/api/account/orders`      | a signed-in customer's own orders — needs `Authorization: Bearer <Supabase token>` with a **confirmed** email; returns only that email's orders, never contact details |

### Admin only (require a signed-in staff session cookie)

| Method | Path                                | What it does |
|--------|-------------------------------------|--------------|
| POST   | `/api/admin/login`                  | start sign-in: staff email + `ADMIN_API_KEY` → emails a code |
| POST   | `/api/admin/verify`                 | finish sign-in: email + code → sets session cookies |
| POST   | `/api/admin/logout`                 | clear the session |
| GET    | `/api/admin/me`                     | the signed-in staff member |
| GET    | `/api/orders`                       | list all orders (newest first; optional `?status=preparing`) |
| GET    | `/api/stats`                        | totals, revenue, top items (revenue hidden for viewers) |
| GET    | `/api/contacts`                     | list contact submissions |
| PATCH  | `/api/orders/:id/status`            | change an order's status (owner/admin) |
| GET    | `/api/admin/staff`                  | list staff |
| POST   | `/api/admin/staff`                  | add staff (owner) |
| PATCH  | `/api/admin/staff/:email`           | update a staff role/name (owner) |
| DELETE | `/api/admin/staff/:email`           | remove staff (owner) |
| GET    | `/api/admin/products`               | list products for editing (owner/admin) |
| POST   | `/api/admin/products`               | create a product (owner/admin) |
| PATCH  | `/api/admin/products/:id`           | edit a product (owner/admin) |
| POST   | `/api/admin/product-images`         | upload a product photo to Supabase Storage (owner/admin) |

### Order payload (POST /api/orders)

```json
{
  "customer": {
    "name": "Ahsan Khan",
    "email": "ahsan@example.com",
    "phone": "0334-3745379",
    "address": "House 12, Street 5, Block 4",
    "area": "Clifton"
  },
  "items": [
    { "name": "Classic Crew Neck Tee", "qty": 2, "price": 1899 }
  ],
  "payment": {
    "method": "cod",
    "methodLabel": "Cash on Delivery"
  },
  "totals": {
    "subtotal": 3798,
    "gst": 684,
    "deliveryCharge": 200,
    "total": 4682
  }
}
```

The server responds with `{ success: true, orderId: "EVR-...", status: "received" }`.

### Order status values

`received` → `preparing` → `out_for_delivery` → `delivered`
(plus `cancelled` from any state)

---

## Notes

- **Storage.** In production, orders, contacts and staff live in **Supabase
  Postgres** (`SUPABASE_URL` + `SUPABASE_SERVICE_KEY`), and products live in
  the Supabase `products` table. `lib/storage.js` picks the backend:
  Supabase → Upstash Redis → local JSON files. Locally, with no cloud
  credentials, orders/contacts fall back to `data/*.json`. **Products always
  require Supabase** — there is no JSON fallback for the catalogue.
- **Customer accounts.** Shoppers sign in at `/account.html` with Google or
  email + password (Supabase Auth, in the browser). The server only verifies
  their token (`lib/customer-auth.js`) and reads orders whose `customer.email`
  matches their **confirmed** email — it never trusts an email sent by the
  browser, and the database stays locked (RLS denies `anon`/`authenticated`).
  Set `SUPABASE_ANON_KEY` (the public *publishable* key) to turn accounts on;
  leave it blank and `/account.html` shows a "coming soon" notice. See
  `ACCOUNTS-SETUP.md` for the one-time dashboard setup.
- There is no real payment processing here — "Cash on Delivery", "Card",
  "JazzCash", and "EasyPaisa" are recorded as the customer's chosen method,
  but no money actually moves. Wiring up Stripe / a local Pakistani gateway
  would be a separate step.
- `.env` holds real secrets once you fill it in — it's already listed in
  `.gitignore` so it won't be committed if you put this in Git. In production
  the same values are Vercel environment variables.
- Rate limits live in `server.js` (look for `writeLimiter` / `contactLimiter`).
  Adjust the numbers if you need to.
- **To change products, prices, original prices, photos or descriptions**, use
  the admin dashboard's **Products** tab. They save to Supabase and show on the
  storefront immediately. `catalog.js` is only the *seed* catalogue and the
  category list — not the live source of truth.
- Prices are never trusted from the browser. `POST /api/orders` looks every item
  up in the live catalogue and recomputes the subtotal, 18% GST and the Rs. 200
  delivery charge, so editing prices in devtools cannot change what an order
  costs. If a price changed since the page loaded, the order is rejected (409).
- The server refuses to serve anything under `/assets/server`, so
  `orders.json`, `contacts.json`, `.env` and the server source cannot be
  downloaded from the site. Keep that guard if you change how static files are
  served.
