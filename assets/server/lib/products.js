const crypto = require('node:crypto');
const supabase = require('./supabase-store');
const catalog = require('../../../catalog.js');

const EDITABLE = ['name', 'price', 'originalPrice', 'description', 'category', 'image', 'hoverImage', 'available'];
const REQUIRED = EDITABLE.filter(function (field) { return field !== 'hoverImage' && field !== 'originalPrice'; });
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3);
const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isObject(value) {
  return value !== null && typeof value === 'object' &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function isHttpsUrl(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f]/.test(value) ||
      !/^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch (_) {
    return false;
  }
}

function isImageUrl(value) {
  if (typeof value !== 'string' || !value) return false;
  if (isHttpsUrl(value)) return true;
  if (!/^(?:\/?assets\/products\/|\/api\/product-images\/)/.test(value) ||
      /[^A-Za-z0-9/_.-]/.test(value)) return false;
  const parts = value.replace(/^\//, '').split('/');
  return parts.every(function (part) { return part && part !== '.' && part !== '..'; }) &&
    /\.(?:jpe?g|png|webp|gif|avif)$/i.test(value);
}

function validateFields(input, fields) {
  const output = {};
  fields.forEach(function (field) {
    const value = input[field];
    switch (field) {
      case 'name':
        if (typeof value !== 'string' || !value.trim() || value.trim().length > 160) {
          throw fail(400, 'Name must be between 1 and 160 characters.');
        }
        output.name = value.trim();
        break;
      case 'price':
        if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000) {
          throw fail(400, 'Price must be a positive integer no greater than 1000000.');
        }
        output.price = value;
        break;
      case 'originalPrice':
        if (value === null || value === '') {
          output.originalPrice = null;
        } else if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000) {
          throw fail(400, 'Original price must be a positive integer no greater than 1000000.');
        } else {
          output.originalPrice = value;
        }
        break;
      case 'description':
        if (typeof value !== 'string' || value.length > 5000) {
          throw fail(400, 'Description must be a string of at most 5000 characters.');
        }
        output.description = value;
        break;
      case 'category':
        if (typeof value !== 'string' || !catalog.categories.some(function (category) {
          return category.id === value;
        })) throw fail(400, 'Choose a valid product category.');
        output.category = value;
        break;
      case 'available':
        if (typeof value !== 'boolean') throw fail(400, 'Availability must be a boolean.');
        output.available = value;
        break;
      case 'image':
        if (!isImageUrl(value)) throw fail(400, 'A valid main image URL is required.');
        output.image = value;
        break;
      case 'hoverImage':
        if (value !== null && value !== '' && !isImageUrl(value)) {
          throw fail(400, 'Hover image must be a valid image URL or empty.');
        }
        output.hoverImage = value || '';
        break;
      default:
        throw fail(400, 'Only editable product fields may be changed.');
    }
  });
  return output;
}

function checkOriginalPrice(data) {
  if (data.originalPrice === null || data.originalPrice === undefined || data.originalPrice === '') {
    delete data.originalPrice;
    return;
  }
  if (!Number.isSafeInteger(data.originalPrice) || data.originalPrice > 1000000 || data.originalPrice < data.price) {
    throw fail(400, 'Original price must be a whole number at least the selling price.');
  }
}

function slugify(name) {
  const base = name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return base || 'product';
}

async function requestRows(path, options) {
  try {
    const response = await supabase.request(path, options);
    const rows = JSON.parse(response.text);
    if (!Array.isArray(rows) || rows.some(function (row) {
      return !isObject(row) || typeof row.id !== 'string' || !row.id || !isObject(row.data);
    })) throw new Error('Invalid product response');
    return rows;
  } catch (_) {
    throw fail(502, 'Product service is unavailable.');
  }
}

function toItem(row) {
  return Object.assign({}, row.data, { id: row.id, version: row.version });
}

async function list() {
  const rows = await requestRows('/products?select=*&order=position.asc');
  return {
    categories: catalog.categories.map(function (category) { return Object.assign({}, category); }),
    items: rows.map(toItem)
  };
}

async function update(id, input) {
  if (typeof id !== 'string' || !id.trim() || /[\u0000-\u001f\u007f]/.test(id)) {
    throw fail(400, 'A valid product ID is required.');
  }
  if (!isObject(input) || !Object.keys(input).length) {
    throw fail(400, 'Provide editable product fields.');
  }
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw fail(400, 'Refresh the product before editing.');
  const changes = validateFields(input, Object.keys(input).filter(field => field !== 'version'));
  if (!Object.keys(changes).length) throw fail(400, 'Provide editable product fields.');
  // Quote PostgREST literals as well as URL-encoding them so IDs cannot become filters.
  const literal = '"' + id.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  let path;
  try {
    path = '/products?id=eq.' + encodeURIComponent(literal) + '&select=*';
  } catch (_) {
    throw fail(400, 'A valid product ID is required.');
  }
  const rows = await requestRows(path);
  if (!rows.length) throw fail(404, 'Product not found.');
  if (rows.length !== 1 || rows[0].id !== id) throw fail(502, 'Product service is unavailable.');

  if (rows[0].version !== input.version) throw fail(409, 'This product was changed by someone else. Close the editor, refresh products, and try again.');
  const data = Object.assign({}, rows[0].data, changes, { id: id });
  const fields = REQUIRED.concat(Object.hasOwn(data, 'hoverImage') ? ['hoverImage'] : []);
  Object.assign(data, validateFields(data, fields));
  if (!data.hoverImage) delete data.hoverImage;
  checkOriginalPrice(data);
  data.categoryLabel = catalog.categories.find(function (category) {
    return category.id === data.category;
  }).label;

  const updated = await requestRows(path + '&version=eq.' + input.version, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { data: data, version: input.version + 1 }
  });
  if (!updated.length) throw fail(409, 'This product changed while saving. Refresh products and try again.');
  if (updated.length !== 1 || updated[0].id !== id) throw fail(502, 'Product service is unavailable.');
  return toItem(updated[0]);
}

async function create(input) {
  if (!isObject(input) || !Object.keys(input).length) throw fail(400, 'Provide the product details.');
  const data = validateFields(input, Object.keys(input));
  REQUIRED.forEach(function (field) {
    if (!Object.hasOwn(data, field)) throw fail(400, 'Missing required field: ' + field + '.');
  });
  if (!data.hoverImage) delete data.hoverImage;
  checkOriginalPrice(data);
  data.categoryLabel = catalog.categories.find(function (category) {
    return category.id === data.category;
  }).label;

  const base = slugify(data.name);
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await requestRows('/products?select=*');
    const taken = new Set(rows.map(function (row) { return row.id; }));
    let id = base;
    for (let n = 2; taken.has(id); n++) id = base + '-' + n;
    const position = rows.reduce(function (max, row) {
      return Math.max(max, Number.isSafeInteger(row.position) ? row.position : 0);
    }, 0) + 1;
    data.id = id;
    let response;
    try {
      response = await supabase.request('/products', {
        method: 'POST',
        prefer: 'return=representation',
        body: { id: id, data: data, position: position, version: 1 }
      });
    } catch (err) {
      // A simultaneous create with the same name can claim the slug first.
      if (err.message.startsWith('Supabase HTTP 409') && attempt < 2) continue;
      throw fail(502, 'Product service is unavailable.');
    }
    let created;
    try {
      created = JSON.parse(response.text);
    } catch (_) {
      throw fail(502, 'Product service is unavailable.');
    }
    if (!Array.isArray(created) || created.length !== 1 || created[0].id !== id || !isObject(created[0].data)) {
      throw fail(502, 'Product service is unavailable.');
    }
    return toItem(created[0]);
  }
  throw fail(502, 'Product service is unavailable.');
}

function decodeImage(input) {
  if (!isObject(input) || Object.keys(input).some(function (field) {
    return field !== 'data' && field !== 'contentType';
  }) || typeof input.data !== 'string' || !IMAGE_TYPES.has(input.contentType)) {
    throw fail(400, 'Provide base64 data and an image/jpeg, image/png or image/webp content type.');
  }
  let data = input.data;
  if (data.startsWith('data:')) {
    const prefix = 'data:' + input.contentType + ';base64,';
    if (!data.startsWith(prefix)) throw fail(400, 'Image data type does not match its content type.');
    data = data.slice(prefix.length);
  }
  if (!data.length || data.length > MAX_BASE64_LENGTH || data.length % 4 !== 0) {
    throw fail(400, 'Image must be canonical base64 and no larger than 2 MiB.');
  }
  const bytes = Buffer.from(data, 'base64');
  // Buffer's decoder accepts malformed padding and whitespace; round-tripping rejects both.
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== data) {
    throw fail(400, 'Image must be canonical base64 and no larger than 2 MiB.');
  }
  let matches = false;
  switch (input.contentType) {
    case 'image/jpeg':
      matches = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      break;
    case 'image/png':
      matches = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
      break;
    case 'image/webp':
      matches = bytes.length >= 16 && bytes.toString('latin1', 0, 4) === 'RIFF' &&
        bytes.toString('latin1', 8, 12) === 'WEBP' &&
        ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('latin1', 12, 16));
      break;
  }
  if (!matches) throw fail(400, 'Image bytes do not match the declared content type.');
  return bytes;
}

async function upload(input) {
  const bytes = decodeImage(input);
  try {
    const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = (process.env.SUPABASE_SERVICE_KEY || '').trim();
    if (!key || !isHttpsUrl(url) || /[?#]/.test(url)) {
      throw new Error('Invalid storage configuration');
    }
    const filename = crypto.randomBytes(24).toString('hex') + '.' + IMAGE_TYPES.get(input.contentType);
    const objectPath = 'product-images/' + filename;
    const response = await fetch(url + '/storage/v1/object/' + objectPath, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': input.contentType,
        'x-upsert': 'false'
      },
      body: bytes,
      redirect: 'error',
      signal: AbortSignal.timeout(15000)
    });
    await response.text();
    if (!response.ok) throw new Error('Storage upload failed');
    return { url: url + '/storage/v1/object/public/' + objectPath };
  } catch (_) {
    throw fail(502, 'Image storage is unavailable.');
  }
}

module.exports = { list: list, create: create, update: update, upload: upload };
