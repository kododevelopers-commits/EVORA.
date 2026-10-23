// ============================================================================
// migrate-to-redis.js — move existing orders/contacts into Upstash Redis
// ----------------------------------------------------------------------------
// Run this ONCE, after the server is deployed and UPSTASH_REDIS_REST_URL +
// UPSTASH_REDIS_REST_TOKEN are in .env. It copies the local JSON files into
// Redis without deleting anything and without creating duplicates.
//
//   npm run migrate:redis            # local files  -> Redis  (safe merge)
//   npm run migrate:redis -- --pull  # Redis        -> local files (backup)
//
// A merge is by id (orderId for orders, contactId for contacts): records that
// already exist in Redis are left alone, so running it twice is harmless.
// ============================================================================

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const storage = require('./lib/storage');

const DATA_DIR = path.join(__dirname, 'data');
const COLLECTIONS = [
  { name: 'orders', id: 'orderId' },
  { name: 'contacts', id: 'contactId' }
];

function readLocal(name) {
  const file = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Could not read ${file}: ${err.message}`);
    return [];
  }
}

function writeLocal(name, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(data, null, 2));
}

function idOf(record, key) {
  return record && record[key] ? String(record[key]) : null;
}

async function pull() {
  console.log('Pulling from Redis into local JSON files (backup)...\n');
  for (const c of COLLECTIONS) {
    const records = await storage.read(c.name);
    writeLocal(c.name, records);
    console.log(`  ${c.name.padEnd(10)} ${String(records.length).padStart(4)} records -> data/${c.name}.json`);
  }
  console.log('\nDone. The local files now match Redis.');
}

async function push() {
  if (!storage.usingRedis()) {
    console.error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set.');
    console.error('Add both to assets/server/.env, then run this again.');
    process.exit(1);
  }

  console.log('Copying local JSON files into Redis (' + storage.describe() + ')...\n');

  for (const c of COLLECTIONS) {
    const local = readLocal(c.name);
    const remote = await storage.read(c.name);
    const known = new Set(remote.map((r) => idOf(r, c.id)).filter(Boolean));

    let added = 0;
    for (const record of local) {
      const id = idOf(record, c.id);
      if (id && known.has(id)) continue; // already there
      remote.push(record);
      if (id) known.add(id);
      added += 1;
    }

    if (added > 0) {
      await storage.save(c.name, remote);
    }

    console.log(
      `  ${c.name.padEnd(10)} ${String(added).padStart(4)} copied, ` +
      `${String(remote.length - added).padStart(4)} already present, ` +
      `${String(remote.length).padStart(4)} total in Redis`
    );
  }

  console.log('\nDone. The site will now read and write those records in Redis.');
}

const wantsPull = process.argv.includes('--pull');

(wantsPull ? pull() : push()).catch(function (err) {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
