const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const catalog = require('../../catalog');
const store = require('./lib/supabase-store');

(async () => {
  if (!store.isConfigured()) throw new Error('Configure Supabase before seeding the dashboard.');
  await store.request('/products?select=id&limit=0');
  await store.request('/products?on_conflict=id', {
    method: 'POST',
    body: catalog.items.map((item, position) => ({ id: item.id, data: item, position })),
    prefer: 'resolution=ignore-duplicates,return=minimal'
  });
  const result = await store.request('/products?select=id');
  console.log('Dashboard catalog ready: ' + JSON.parse(result.text).length + ' products. Existing edits were preserved.');
})().catch(() => {
  console.error('Dashboard setup failed. Run supabase-schema.sql first and check the Supabase environment settings.');
  process.exitCode = 1;
});
