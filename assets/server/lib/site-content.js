// ============================================================================
// site-content.js — dynamic site content (carousel, our-story, footer)
// ----------------------------------------------------------------------------
// This module manages content that non-technical users can edit via the admin
// "Changes" tab. Content is stored in Supabase under a single table:
//
//   site_content (id, key, data, version, updated_at)
//
// Keys:
//   - carousel: deal banner images and alt text
//   - our-story: story section text and buttons
//   - footer: footer information
//
// Each item has a version number for optimistic locking (like products).
// ============================================================================

const supabase = require('./supabase-store');

const KEYS = {
  CAROUSEL: 'carousel',
  OUR_STORY: 'our-story',
  FOOTER: 'footer'
};

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function get(key) {
  if (typeof key !== 'string' || !key.trim() || /[\u0000-\u001f\u007f]/.test(key)) {
    throw fail(400, 'A valid key is required.');
  }
  const rows = await supabase.request('/site_content?id=eq.' + encodeURIComponent(key.trim()), {
    method: 'GET',
    prefer: 'return=representation'
  });
  const text = await rows.text();
  let rowsParsed;
  try {
    rowsParsed = JSON.parse(text);
  } catch (_) {
    throw fail(502, 'Site content service is unavailable.');
  }
  if (!Array.isArray(rowsParsed) || rowsParsed.length > 1) {
    throw fail(502, 'Site content service is unavailable.');
  }
  if (rowsParsed.length === 0) {
    return null;
  }
  return {
    id: rowsParsed[0].id,
    key: rowsParsed[0].key,
    data: rowsParsed[0].data,
    version: rowsParsed[0].version,
    updated_at: rowsParsed[0].updated_at
  };
}

async function list() {
  const rows = await supabase.request('/site_content?select=*&order=key.asc', {
    method: 'GET'
  });
  const text = await rows.text();
  let rowsParsed;
  try {
    rowsParsed = JSON.parse(text);
  } catch (_) {
    throw fail(502, 'Site content service is unavailable.');
  }
  if (!Array.isArray(rowsParsed)) {
    throw fail(502, 'Site content service is unavailable.');
  }
  return rowsParsed.map(function (row) {
    return {
      id: row.id,
      key: row.key,
      data: row.data,
      version: row.version,
      updated_at: row.updated_at
    };
  });
}

async function create(data) {
  if (!data || typeof data !== 'object' || !data.key || typeof data.key !== 'string') {
    throw fail(400, 'A key is required.');
  }
  if (!data.data || typeof data.data !== 'object') {
    throw fail(400, 'Data must be an object.');
  }
  if (!Number.isSafeInteger(data.version) || data.version < 1) {
    throw fail(400, 'Version must be at least 1.');
  }

  const key = data.key.trim();
  if (!key || /[\u0000-\u001f\u007f]/.test(key)) {
    throw fail(400, 'A valid key is required.');
  }

  const existing = await get(key);
  if (existing) {
    throw fail(409, 'Content with this key already exists. Use PATCH to update it.');
  }

  const response = await supabase.request('/site_content', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      key: key,
      data: data.data,
      version: data.version
    }
  });
  const text = await response.text();
  let created;
  try {
    created = JSON.parse(text);
  } catch (_) {
    throw fail(502, 'Site content service is unavailable.');
  }
  if (!Array.isArray(created) || created.length !== 1 || created[0].key !== key) {
    throw fail(502, 'Site content service is unavailable.');
  }
  return {
    id: created[0].id,
    key: created[0].key,
    data: created[0].data,
    version: created[0].version,
    updated_at: created[0].updated_at
  };
}

async function update(key, input) {
  if (typeof key !== 'string' || !key.trim() || /[\u0000-\u001f\u007f]/.test(key)) {
    throw fail(400, 'A valid key is required.');
  }
  if (!input || typeof input !== 'object' || !Object.keys(input).length) {
    throw fail(400, 'Provide update data.');
  }
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw fail(400, 'Version must be at least 1.');
  }

  const existing = await get(key);
  if (!existing) {
    throw fail(404, 'Content not found. Use POST to create it.');
  }

  if (existing.version !== input.version) {
    throw fail(409, 'This content was changed by someone else. Refresh and try again.');
  }

  const updated = await supabase.request('/site_content?id=eq.' + encodeURIComponent(key.trim()) + '&version=eq.' + input.version, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      data: input.data,
      version: input.version + 1
    }
  });
  const text = await updated.text();
  let rowsParsed;
  try {
    rowsParsed = JSON.parse(text);
  } catch (_) {
    throw fail(502, 'Site content service is unavailable.');
  }
  if (!Array.isArray(rowsParsed) || rowsParsed.length !== 1 || rowsParsed[0].key !== key) {
    throw fail(502, 'Site content service is unavailable.');
  }
  return {
    id: rowsParsed[0].id,
    key: rowsParsed[0].key,
    data: rowsParsed[0].data,
    version: rowsParsed[0].version,
    updated_at: rowsParsed[0].updated_at
  };
}

module.exports = {
  KEYS,
  get,
  list,
  create,
  update
};
