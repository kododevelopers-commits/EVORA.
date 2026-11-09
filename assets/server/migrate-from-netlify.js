// ============================================================================
// migrate-from-netlify.js — pull the LIVE orders/contacts from the still-running
//                           Netlify site (admin API) into Supabase
// ----------------------------------------------------------------------------
// The Netlify deploy is frozen but still serving real data from Upstash. This
// reads that data through the admin endpoints (x-admin-key from .env) and
// upserts it into Supabase, so nothing is lost when the site moves to Vercel.
//
//   npm run migrate:from-netlify
//
// Safe to re-run: rows are upserted by id. Requires ADMIN_API_KEY in .env and
// SUPABASE_URL + SUPABASE_SERVICE_KEY. Override the source with NETLIFY_BASE_URL.
// ============================================================================

require('dotenv').config();

const supabase = require('./lib/supabase-store');

const BASE = (process.env.NETLIFY_BASE_URL || 'https://evora-pk.netlify.app').replace(/\/+$/, '');
const KEY = (process.env.ADMIN_API_KEY || '').trim();

async function fetchCollection(path) {
  const res = await fetch(BASE + path, {
    headers: { 'x-admin-key': KEY },
    signal: AbortSignal.timeout(20000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(path + ' -> HTTP ' + res.status + ': ' + text.slice(0, 160));
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [];
}

async function main() {
  if (!KEY) {
    console.error('ADMIN_API_KEY is not set in .env.');
    process.exit(1);
  }
  if (!supabase.isConfigured()) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are not set in .env.');
    process.exit(1);
  }

  console.log('Pulling live data from ' + BASE + ' into Supabase...\n');

  for (const name of ['orders', 'contacts']) {
    const records = await fetchCollection('/api/' + name);
    await supabase.upsertMany(name, records);
    const total = await supabase.count(name);
    console.log(
      '  ' + name.padEnd(10) +
      String(records.length).padStart(4) + ' pulled, ' +
      String(total).padStart(4) + ' rows now in Supabase'
    );
  }

  console.log('\nDone. Supabase now holds the live order/contact history.');
}

main().catch(function (err) {
  console.error('\nMigration failed: ' + err.message);
  process.exit(1);
});
