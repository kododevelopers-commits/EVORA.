const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'assets', 'server', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_KEY missing');
  process.exit(1);
}

const sql = fs.readFileSync('assets/server/supabase-schema.sql', 'utf8');

async function runSchema() {
  console.log('Applying SQL schema...');
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  console.log('Status:', res.status, await res.text());
}

runSchema();
