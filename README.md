# Evora — Modern Apparel

A clothing store demo: static front-end (HTML / CSS / vanilla JS) plus a small
Node.js + Express backend that serves the site **and** handles orders, contact
complaints and email notifications.

> **Want it online, so it keeps taking orders while your laptop is off?**
> See **[DEPLOY.md](DEPLOY.md)** — free Netlify hosting (no credit card),
> with Upstash Redis for storage and Brevo for email.

---

## Run it (the short version)

> ### Open the site at **http://localhost:3000**
>
> That's the address the backend serves. It's also the address the backend
> listens on for API calls.
>
> **You can now open the site from other addresses too** — VS Code Live Server
> on `:5500`, a `file://` path, any other static server. The pages find the
> backend on their own (see `api-client.js`) and orders, complaints and the
> admin dashboard all work. But `http://localhost:3000` is the one to bookmark,
> because that server has to be running either way.

Two ways to start the backend, easiest first:

### 1. Double-click `start-evora.cmd`

A console window opens, the server starts, and your browser opens
automatically at http://localhost:3000.

- If the server crashes, it restarts itself after 3 seconds.
- If it is already running, it just opens the site again.
- **Stop it:** click the console window and press `Ctrl+C`, then `Y`.

### 2. The normal way (a terminal)

```powershell
cd assets\server
npm install     # first time only
npm start
```

Then open http://localhost:3000.

---

## What you can do on the site

| Page | URL | What it is |
|---|---|---|
| Home | `/index.html` | landing page, featured products |
| Shop | `/menu.html` | the full catalogue, filters, search, cart |
| Product | `/product.html?slug=classic-crew-neck-tee` | one product, size picker |
| Checkout | `/checkout.html` | delivery details + payment method |
| Contact | `/contact.html` | complaints, order help, general questions |
| About | `/about.html` | the story |
| **Admin** | `/admin.html` | orders, contact messages, stats |

### Admin dashboard

Open http://localhost:3000/admin.html and paste the admin key (it is in
`assets/server/.env` as `ADMIN_API_KEY`).

You can then:

- see every order, change its status
  (`received → preparing → out for delivery → delivered`, or `cancelled`),
- read every contact-form message,
- click **Reply by email** on any order or complaint to answer the customer
  straight from Gmail,
- see a **red banner** at the top if an email failed to send — so a complaint
  is never silently lost.

The dashboard refreshes itself every 15 seconds.

---

## Email notifications

The backend sends real email through Brevo (300/day free), over its HTTPS
API or SMTP relay — or through Gmail / SendGrid / any SMTP server if you
prefer. Brevo's HTTPS API is what makes sending work on hosts that block
SMTP ports, such as Render's free tier.

| Trigger | To | Reply-To |
|---|---|---|
| Contact form / complaint | `kododevelopers@gmail.com` | the customer's email |
| New order | `kododevelopers@gmail.com` | the customer's email |
| New order | the customer's email | `kododevelopers@gmail.com` |

So pressing **Reply** in Gmail answers the customer directly, and every
customer gets their own confirmation.

Every email carries the Evora logo at the top (see [The logo](#the-logo)
below). The logo is embedded directly in the message, so it shows up even
though the site is only running on localhost.

Settings live in `assets/server/.env`. They are re-read before every send, so
you can paste a new app password into `.env` **while the server is running** —
no restart needed.

Test it any time:

```powershell
cd assets\server
npm run test:email
```

Full email setup, providers and troubleshooting:
[`assets/server/README.md`](assets/server/README.md).

---

## Project layout

```
EVORA/
├── index.html  menu.html  product.html
├── checkout.html  contact.html  about.html
├── admin.html                 <- admin dashboard
├── style.css  script.js  admin.js
├── catalog.js                 <- products & prices (single source of truth)
├── api-client.js              <- finds the backend, whatever serves the page
├── assets/                    <- images, icons, and the backend folder
│   ├── evora-logo.svg         <- THE logo (website)
│   ├── evora-logo.png         <- the same logo, for email + og:image
│   └── server/
│       ├── server.js          <- the Express app
│       ├── .env               <- live secrets (never commit this)
│       ├── .env.example       <- template
│       ├── test-email.js      <- "is my email working?" check
│       ├── setup-email.ps1    <- saves your app password safely
│       ├── lib/               <- mailer, brand, auth, storage, validation
│       └── data/              <- orders.json / contacts.json
├── tools/render-logo.js       <- rebuilds evora-logo.png from the SVG
├── start-evora.cmd            <- double-click launcher
└── .vscode/settings.json      <- tells Live Server to ignore the backend
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

```powershell
npm install --no-save sharp
node tools\render-logo.js
```

`sharp` is only needed for that one-off — it is **not** a dependency of the
backend. After rebuilding, restart the backend so it picks the new logo up.

---

## Editing the shop

- **Products, prices, descriptions** → edit `catalog.js`. The same file is
  loaded by the browser and required by the server, so the shop grids, product
  pages and the prices used to verify orders never drift apart. Restart the
  server after editing it.
- **Pages and layout** → the `*.html` files and `style.css`.
- **Cart, checkout behaviour, contact form** → `script.js`.

Prices are never trusted from the browser: `POST /api/orders` looks every item
up in `catalog.js` and recomputes the subtotal, 18% GST and the Rs. 200
delivery charge, so editing prices in devtools cannot change what an order
costs.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Place order" does nothing | Check the browser console. If it says the backend isn't running, start it (`start-evora.cmd`). |
| Page loads but the shop is empty | The backend isn't running, or `catalog.js` failed to load. Check the log with `view-log.cmd`. |
| `EADDRINUSE` / port 3000 busy | Another copy is already running. `start-evora.cmd` detects this and just opens the site. |
| `node` is not recognised | Reinstall Node.js from https://nodejs.org, then open a **new** terminal. |
| No email arrives | Run `npm run test:email` in `assets\server`, then check the spam folder. |
| The email has no logo | `assets\evora-logo.png` is missing. Rebuild it with `node tools\render-logo.js`, then restart the backend. |
| Admin says "no ADMIN_API_KEY" | Add `ADMIN_API_KEY=` to `assets\server\.env` and restart. |
| Red banner on the admin page | An email failed to send. The banner names the error — fix it and the banner clears itself. |

### How the pages find the backend

`api-client.js` runs on every page. It works out where the backend is:

1. `window.EVORA_API_URL` if you set one (forces a specific address),
2. the address the page was served from,
3. `http://localhost:3000`,
4. `http://127.0.0.1:3000`.

It keeps the first one that answers `/api/menu` and sends every request there.
If **none** answer, a red banner appears telling you to start the backend
instead of showing a bare "405 Method Not Allowed".

The server allows requests from `localhost` and `127.0.0.1` (any port) and
from `file://` pages by default — those can only be reached from this
machine. Websites on the internet get no CORS headers. To host the frontend
somewhere else, list that origin in `CORS_ORIGINS` in `assets/server/.env`.
