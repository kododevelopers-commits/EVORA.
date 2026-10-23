# Evora — Backend

This is the backend for the Evora site. It serves the static site
itself (HTML / CSS / JS / images) **and** a small JSON API the frontend uses
to place orders, save contact messages, and show the menu.

It runs entirely on Node.js — no database server, no paid services required
to try it out. Orders, contact submissions, and a tiny admin dashboard are
all built in.

---

## Folder layout

```
your-site/
├── index.html
├── menu.html
├── checkout.html
├── contact.html
├── about.html
├── style.css
├── script.js
├── catalog.js          <- single source of truth for products & prices
├── admin.html          <- NEW: small admin dashboard
├── admin.js            <- NEW: dashboard logic
├── assets/
│   └── server/         <- everything below is the backend
    ├── server.js         (the Express app)
    ├── package.json
    ├── test-email.js     (sends a test email to check your setup)
    ├── setup-email.ps1   (helper: saves your app password into .env)
    ├── .env.example      (copy to .env and fill in)
    ├── .gitignore
    ├── lib/              <- small helpers
    │   ├── storage.js    (async JSON file store)
    │   ├── validation.js (input validators)
    │   ├── auth.js       (admin API-key middleware)
    │   ├── brand.js      (the Evora logo, embedded into every email)
    │   └── mailer.js     (sending email + provider setup)
    └── data/             <- runtime data (auto-created)
        ├── .gitkeep
        ├── orders.json    (created on first order)
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
status (received → preparing → out for delivery → delivered), view contact
submissions, and see basic stats.

1. Copy `.env.example` to `.env` (you'll do this in step 5 anyway).
2. Set `ADMIN_API_KEY` in `.env` to a long random string. Easiest way:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
3. Restart the server.
4. Open http://localhost:3000/admin.html and paste the key in. The dashboard
   stores the key in `sessionStorage` (so it disappears when you close the
   tab) and polls for new orders every 15 seconds.

The admin key is required for these endpoints:
- `GET  /api/orders`        — list orders (contains customer data)
- `GET  /api/stats`         — revenue, order counts, top items
- `GET  /api/contacts`      — contact form submissions
- `PATCH /api/orders/:id/status` — change an order's status

Send it in the `x-admin-key` HTTP header (the dashboard does this). Query
strings are deliberately not accepted: a key in a URL ends up in server logs,
browser history and `Referer` headers.

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
3. Go to **SMTP & API → SMTP**, copy the **login** and create an **SMTP key**.
   Neither is your Brevo account email or password.
4. Set in `.env`:
   ```
   EMAIL_PROVIDER=brevo
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-smtp-login
   BREVO_SMTP_KEY=your-smtp-key
   BREVO_SENDER_EMAIL=the-address-you-verified
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

Because the customer is the reply-to address on the store's copies, pressing
**Reply** in Gmail answers them directly — no copying addresses around. The
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
| GET    | `/api/menu`                | list menu items (optional `?category=men`) |
| GET    | `/api/menu/:id`            | get a single menu item |
| GET    | `/api/orders/:id`          | look up one order by id |
| POST   | `/api/orders`              | place a new order (rate-limited: 30 / 15 min per IP) |
| POST   | `/api/contact`             | save a contact-form submission (rate-limited: 5 / hour per IP) |

### Admin only (require `x-admin-key` header)

| Method | Path                                | What it does |
|--------|-------------------------------------|--------------|
| GET    | `/api/orders`                       | list all orders (newest first; optional `?status=preparing`) |
| GET    | `/api/stats`                        | totals, revenue, top items |
| GET    | `/api/contacts`                     | list contact submissions |
| PATCH  | `/api/orders/:id/status`            | change an order's status |

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

- Orders and contact submissions are stored in plain JSON files. That's fine
  for learning and small-scale testing; a real store should use a database
  (e.g. PostgreSQL, MongoDB) — to swap one in, only `lib/storage.js` would
  need to change.
- There is no real payment processing here — "Cash on Delivery", "Card",
  "JazzCash", and "EasyPaisa" are recorded as the customer's chosen method,
  but no money actually moves. Wiring up Stripe / a local Pakistani gateway
  would be a separate step.
- `.env` holds real secrets once you fill it in — it's already listed in
  `.gitignore` so it won't be committed if you put this in Git.
- Rate limits live in `server.js` (look for `writeLimiter` / `contactLimiter`).
  Adjust the numbers if you need to.
- To change products, prices or descriptions, edit `catalog.js` at the top of
  the project — **not** the HTML. The same file is loaded by the browser and
  required by the server, so the shop grids, product pages and the prices used
  to verify orders all stay in sync. Restart the server after changing it
  (Node caches required files).
- Prices are never trusted from the browser. `POST /api/orders` looks every item
  up in `catalog.js` and recomputes the subtotal, 18% GST and the Rs. 200
  delivery charge, so editing prices in devtools cannot change what an order
  costs. Item names must match the catalogue or the order is rejected.
- The server refuses to serve anything under `/assets/server`, so
  `orders.json`, `contacts.json`, `.env` and the server source cannot be
  downloaded from the site. Keep that guard if you change how static files are
  served.
