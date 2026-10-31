// ============================================================================
// migrate-to-supabase.js — copy existing orders/contacts from Upstash Redis
//                          (or the local JSON files) into Supabase Postgres
// ----------------------------------------------------------------------------
// Run once after the tables exist and SUPABASE_URL + SUPABASE_SERVICE_KEY are
// in .env. It does not delete anything from Redis, and it is safe to re-run:
// rows are upserted by id, so existing records are simply overwritten with the
// same values.
//
//   npm run migrate:supabase           # Redis -> Supabase
//   npm run migrate:supabase -- --files # local data/*.json -> Supabase
// ============================================================================

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const supabase = require('./lib/supabase-store');

const DATA_DIR = path.join(__dirname, 'data');
const COLLECTIONS = ['orders', 'contacts'];

function redisConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  return url && token ? { url: url, token: token } : null;
}

async function readRedis(name) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['GET', 'evora:' + name]),
    signal: AbortSignal.timeout(15000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Upstash HTTP ' + res.status + ': ' + text.slice(0, 200));
  const body = JSON.parse(text);
  if (body && body.error) throw new Error('Upstash error: ' + body.error);
  const raw = body ? body.result : null;
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function readFiles(name) {
  const file = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Could not read ' + file + ': ' + err.message);
    return [];
  }
}

async function main() {
  if (!supabase.isConfigured()) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are not set in .env.');
    process.exit(1);
  }

  const fromFiles = process.argv.includes('--files');
  const source = fromFiles ? 'local JSON files' : 'Upstash Redis';
  console.log('Copying ' + source + ' into Supabase...\n');

  for (const name of COLLECTIONS) {
    const records = fromFiles ? readFiles(name) : await readRedis(name);
    await supabase.upsertMany(name, records);
    const total = await supabase.count(name);
    console.log(
      '  ' + name.padEnd(10) +
      String(records.length).padStart(4) + ' copied, ' +
      String(total).padStart(4) + ' rows now in Supabase'
    );
  }

  console.log('\nDone. With SUPABASE_URL + SUPABASE_SERVICE_KEY set, the server');
  console.log('now reads and writes these tables instead of Redis.');
}

main().catch(function (err) {
  console.error('\nMigration failed: ' + err.message);
  process.exit(1);
});
