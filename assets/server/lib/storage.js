// ============================================================================
// storage.js — tiny async JSON "database" used everywhere we need to persist
// ----------------------------------------------------------------------------
// Why this exists: the original server.js read/wrote orders.json synchronously
// (fs.readFileSync / fs.writeFileSync). That's fine for one user, but if two
// orders arrive at the same time, one write can clobber the other.
//
// The fix: every read+modify+write goes through a single in-process queue per
// collection, so "load → mutate → save" is always atomic from the server's
// point of view.
//
// TWO BACKENDS
// ------------
// Local development keeps using JSON files in data/ — nothing changes.
//
// When the server is deployed to a host with an ephemeral disk (Render's free
// tier wipes the filesystem on every restart), set both of these environment
// variables and the same API stores the data in Upstash Redis instead:
//
//     UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
//     UPSTASH_REDIS_REST_TOKEN=xxxx
//
// Nothing else in the server needs to know which one is in use.
//
// What it gives you:
//   - storage.read('orders')         -> Promise<array>
//   - storage.append('orders', item) -> Promise<number>   (push to array)
//   - storage.update('orders', fn)   -> Promise<array>    (mutate in place)
//   - storage.save('orders', array)  -> Promise<void>     (overwrite)
//   - storage.describe()             -> 'local JSON files' | 'Upstash Redis'
//
// If the collection doesn't exist yet, it's treated as [].
// ============================================================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Every key this app stores lives under this prefix, so the Redis database
// stays readable ("evora:orders", "evora:contacts") and can't collide with
// anything else that might share it.
const KEY_PREFIX = 'evora:';

// A per-collection promise chain. We tack the next operation on with .then(),
// so even when many requests come in at once they run strictly one after
// another.
const queues = new Map();

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------
// Read at call time, not at require time, so dotenv has always run first and
// the server can be reconfigured without a restart (same as the mailer).
function redisConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  return url && token ? { url: url, token: token } : null;
}

function usingRedis() {
  return !!redisConfig();
}

function describe() {
  return usingRedis() ? 'Upstash Redis' : 'local JSON files';
}

// ---------------------------------------------------------------------------
// File backend
// ---------------------------------------------------------------------------
function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(name) {
  return path.join(DATA_DIR, name + '.json');
}

function readFileSafe(name) {
  const file = filePath(name);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // If the JSON is corrupt, we don't want to crash the server — log it and
    // start fresh. The original (broken) data is left in place so a human
    // can recover it.
    console.error(`[storage] Could not parse ${name}.json, starting fresh:`, err.message);
    return [];
  }
}

function writeFileSafe(name, data) {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Redis backend (Upstash REST API)
// ---------------------------------------------------------------------------
// Upstash exposes Redis over plain HTTPS, so this needs no npm driver and
// works anywhere fetch() exists (Node 18+, including Render). A command is
// just a JSON array: POST ["GET","evora:orders"] -> { result: "..." }.
async function redisCommand(command) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('Upstash is not configured');

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(15000)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error('Upstash HTTP ' + res.status + ': ' + text.slice(0, 200));
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch (e) {
    throw new Error('Upstash returned non-JSON: ' + text.slice(0, 200));
  }
  if (body && body.error) {
    throw new Error('Upstash error: ' + body.error);
  }
  return body ? body.result : null;
}

async function readRedisSafe(name) {
  const raw = await redisCommand(['GET', KEY_PREFIX + name]);
  if (raw === null || raw === undefined || raw === '') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`[storage] Could not parse ${KEY_PREFIX}${name} in Redis, starting fresh:`, err.message);
    return [];
  }
}

async function writeRedisSafe(name, data) {
  await redisCommand(['SET', KEY_PREFIX + name, JSON.stringify(data)]);
}

// ---------------------------------------------------------------------------
// Backend-agnostic raw read/write
// ---------------------------------------------------------------------------
function readRaw(name) {
  return usingRedis() ? readRedisSafe(name) : Promise.resolve(readFileSafe(name));
}

function writeRaw(name, data) {
  return usingRedis() ? writeRedisSafe(name, data) : Promise.resolve(writeFileSafe(name));
}

// Run `task` after every previously-queued task for the same collection.
function enqueue(name, task) {
  const previous = queues.get(name) || Promise.resolve();
  const next = previous.then(task, task); // run even if the previous one rejected
  // Don't let one failure poison the whole chain forever.
  queues.set(name, next.catch(() => {}));
  return next;
}

const storage = {
  // Read whatever's stored right now.
  read(name) {
    return enqueue(name, () => readRaw(name));
  },

  // Overwrite the collection with the given array.
  save(name, data) {
    return enqueue(name, async () => {
      if (!Array.isArray(data)) {
        throw new Error(`storage.save('${name}') expects an array`);
      }
      await writeRaw(name, data);
    });
  },

  // Load the array, push `item` onto it, save it back, return the new length.
  append(name, item) {
    return enqueue(name, async () => {
      const arr = await readRaw(name);
      arr.push(item);
      await writeRaw(name, arr);
      return arr.length;
    });
  },

  // Load the array, run `mutator(arr)`, save it back, return the new array.
  // `mutator` can mutate the array in place or return a new one.
  update(name, mutator) {
    return enqueue(name, async () => {
      const arr = await readRaw(name);
      const result = mutator(arr);
      const next = result === undefined ? arr : result;
      if (!Array.isArray(next)) {
        throw new Error(`storage.update('${name}') mutator must return an array`);
      }
      await writeRaw(name, next);
      return next;
    });
  },

  // Which backend is active — used for the startup banner and the migration
  // script, never for business logic.
  describe: describe,
  usingRedis: usingRedis
};

module.exports = storage;
