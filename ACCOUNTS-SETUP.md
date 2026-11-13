# Customer accounts — live setup guide

This switches on the **Account** button in the left menu of the Evora store.
Customers can sign in with **Google** or **email + password**, and every order
they placed with that email shows up automatically in their **Orders** tab.
Tapping an order opens its live progress timeline (the same `track.html` page).

Everything here is **free**. You need no card. Apple sign-in is intentionally
left out (it requires a paid Apple Developer account).

The code is already built and deployed-ready. Accounts stay hidden ("coming
soon") until you complete the steps below and add one environment variable.

> **Your live details** (used in the examples below)
> - Store URL: `https://evora-server.vercel.app`
> - Account page: `https://evora-server.vercel.app/account.html`
> - Supabase project ref: `tvyajshharknnkwdupoo`
> - Supabase callback URL: `https://tvyajshharknnkwdupoo.supabase.co/auth/v1/callback`

---

## What you need to do (overview)

1. Turn on **Email** sign-in in Supabase (with "Confirm email" on).
2. Turn on **Google** sign-in (create a free Google OAuth client, paste it in).
3. Set the **Site URL** and **Redirect URLs** in Supabase.
4. Connect **Brevo SMTP** so confirmation emails reach real customers.
5. Copy the **publishable key** into Vercel as `SUPABASE_ANON_KEY`, redeploy.
6. Test on the live site.

Steps 1–4 are in the Supabase and Google dashboards. Step 5 is in Vercel.

---

## Step 1 — Enable email + password sign-in

1. Open <https://supabase.com/dashboard/project/tvyajshharknnkwdupoo/auth/providers>.
2. Click **Email**.
3. Turn on **Enable Email provider**.
4. Keep **Confirm email** turned **ON**.
   - This is the safety check: a customer must click the link we email them
     before they can see orders. It stops anyone registering another person's
     email and reading their orders. **Do not turn this off.**
5. Save.

## Step 2 — Enable Google sign-in

You create a free "OAuth client" in Google, then paste two values into Supabase.

### 2a. Create the Google OAuth client

1. Open <https://console.cloud.google.com/auth/clients> (sign in with the Google
   account you want to manage this — e.g. `evora.reply@gmail.com`).
2. If asked, create a project (any name, e.g. "Evora") and continue.
3. First set up the consent screen if prompted: **Google Auth Platform →
   Branding / Audience**. Choose **External**, add the app name "Evora", your
   support email, and keep it in **Testing** (fine for a small shop) or publish
   it. Add yourself as a test user while in Testing.
4. Go to **Clients → Create client** (or "Create OAuth client ID").
5. Application type: **Web application**. Name it "Evora Web".
6. **Authorized JavaScript origins** → add:
   - `https://evora-server.vercel.app`
7. **Authorized redirect URIs** → add exactly:
   - `https://tvyajshharknnkwdupoo.supabase.co/auth/v1/callback`
8. Click **Create**. Google shows a **Client ID** and **Client Secret**. Copy both.

### 2b. Paste them into Supabase

1. Open <https://supabase.com/dashboard/project/tvyajshharknnkwdupoo/auth/providers?provider=Google>.
2. Turn on **Enable Google provider**.
3. Paste the **Client ID** and **Client Secret** from Google.
4. Save.

## Step 3 — Set the Site URL and Redirect URLs

1. Open <https://supabase.com/dashboard/project/tvyajshharknnkwdupoo/auth/url-configuration>.
2. **Site URL**: `https://evora-server.vercel.app`
3. **Redirect URLs** → add:
   - `https://evora-server.vercel.app/account.html`
   - (Optional, for Vercel preview deployments: `https://*.vercel.app/account.html`)
4. Save.

> The account page sends customers back to `…/account.html` after Google
> sign-in and after they click an email confirmation link. That exact URL must
> be in this list or the redirect is rejected.

## Step 4 — Connect Brevo SMTP (so confirmation emails deliver)

On the free plan, Supabase's built-in email **only delivers to your own team's
addresses** — real customers would never get their confirmation link. Connecting
your own Brevo SMTP fixes this. You already use Brevo for order emails.

1. In Brevo, open **Transactional → Settings → SMTP & API** (the **SMTP** tab).
   Note the **SMTP server**, **port**, **login**, and generate an **SMTP key**
   (this is different from the REST API key used for order emails).
   - Server: `smtp-relay.brevo.com`
   - Port: `587`
   - Login: your Brevo login email (shown on that page)
   - Password: the **SMTP key** you generate
2. Make sure the **sender email** you use is a **verified sender** in Brevo
   (Brevo → Senders & domains). Your existing order-email sender works.
3. In Supabase, open <https://supabase.com/dashboard/project/tvyajshharknnkwdupoo/auth/smtp>.
4. Turn on **Enable Custom SMTP** and fill in:
   - **Sender email**: your verified Brevo sender (e.g. `evora.reply@gmail.com`)
   - **Sender name**: `Evora`
   - **Host**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Username**: your Brevo SMTP login
   - **Password**: your Brevo **SMTP key**
5. Save, then use **Send test email** to confirm it arrives.

> A brand-new custom SMTP setup starts with a low limit (about 30 auth emails
> per hour). That is plenty for a small shop. If you ever need more, raise it at
> **Authentication → Rate Limits** in Supabase.

## Step 5 — Add the publishable key in Vercel and redeploy

The browser needs Supabase's **public** key to run sign-in. This key is safe to
expose — the database is locked so it can read no shop data.

1. In Supabase, open **Settings → API Keys**
   (<https://supabase.com/dashboard/project/tvyajshharknnkwdupoo/settings/api-keys>).
2. Copy the **Publishable key** (starts with `sb_publishable_…`).
   - Older projects also show a legacy **anon public** key under **Settings →
     API**. Either one works here; prefer the publishable key.
   - **Never** copy the **secret** / `service_role` key into the browser or this
     variable. That one is full-access and stays server-side only.
3. In Vercel, open your project → **Settings → Environment Variables**.
4. Add a new variable:
   - **Name**: `SUPABASE_ANON_KEY`
   - **Value**: the publishable key you copied
   - Environments: tick **Production** (and Preview if you use it).
5. Save, then **redeploy**: Vercel → **Deployments** → latest → ⋯ → **Redeploy**.
   (Or push any commit to `main`; Vercel auto-deploys.)

> `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are already set in Vercel from the
> earlier setup. You only need to add `SUPABASE_ANON_KEY`.

## Step 6 — Test on the live site

1. Open `https://evora-server.vercel.app`, tap the **left menu** button, and tap
   **Account** at the top of the panel.
2. **Create account** with email + password → you should get a confirmation
   email → click the link → sign in.
3. **Continue with Google** → pick your Google account → you return signed in.
4. Place a test order at checkout **using the same email**, then open the
   **Orders** tab — it should appear. Tap it to see the progress timeline.
5. Sign out, then sign back in to confirm the session persists.

If the Account page shows "Accounts coming soon", `SUPABASE_ANON_KEY` is missing
or the redeploy hasn't finished. If Google sign-in errors, re-check the Client
ID/Secret and that the callback URL is exactly the Supabase one. If confirmation
emails don't arrive, re-check the Brevo SMTP test email and the verified sender.

---

## How it works (for reference)

- Sign-in runs in the browser with `supabase-js` (loaded from a pinned CDN). The
  server never sees a password.
- `GET /api/account/config` hands the browser the Supabase URL + publishable key.
- `GET /api/account/orders` takes the customer's access token, asks Supabase who
  it belongs to, **requires a confirmed email**, then returns only the orders
  whose `customer.email` matches — newest first. No token, no orders.
- The database stays locked (RLS on, no public grants). The publishable key can
  only talk to Supabase Auth; it cannot read orders, contacts, staff or products.
- New files: `account.html`, `account.js`, `assets/server/lib/customer-auth.js`.
  New env var: `SUPABASE_ANON_KEY`. The Account button is injected into the left
  panel by `script.js` on every page.

## Files NOT to touch

- Do not put the **secret / service_role** key in `SUPABASE_ANON_KEY`, in the
  browser, or in the repo.
- Do not turn off **Confirm email** (Step 1) — it is what keeps customers from
  seeing each other's orders.