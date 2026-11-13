// ============================================================================
// api-client.js — finds the Evora backend, wherever the page was opened from.
// ----------------------------------------------------------------------------
// The pages talk to the backend with relative URLs (/api/orders). That only
// works when the page is served BY the Evora backend itself.
//
// If you open the site any other way it silently breaks:
//   * VS Code Live Server  -> http://localhost:5500  -> 405 Method Not Allowed
//   * any other static server                         -> 404 / 405
//   * double-clicking an .html file (file://)         -> CORS / network error
//
// So instead of assuming, this file asks around and remembers which server
// actually answers. It tries, in order:
//   1. window.EVORA_API_URL          (force one specific backend)
//   2. the origin this page came from (the normal case: the backend itself)
//   3. http://localhost:3000          (the local backend)
//   4. http://127.0.0.1:3000          (same thing, other spelling)
//
// Then every request goes through EVORA_API.fetch(path, options), which
// resolves the base URL first and prefixes it.
//
// Load this file BEFORE script.js and admin.js.
// ============================================================================
(function (global) {
  'use strict';

  var PROBE_PATH = '/api/menu';
  var candidates = [];
  var pending = null;   // promise for the base URL
  var base = '';        // the base URL that worked ('' until resolved)

  function push(url) {
    if (url && candidates.indexOf(url) === -1) candidates.push(url);
  }

  var forced = global.EVORA_API_URL;
  if (forced) {
    push(String(forced).trim().replace(/\/+$/, ''));
  } else {
    var here = (global.location && /^https?:$/.test(global.location.protocol))
      ? global.location.origin
      : '';
    var port = global.location ? String(global.location.port || '') : '';
    var isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(here);

    if (isLoopback && port && port !== '3000') {
      // The page was opened from a local port that is probably a static
      // preview server (VS Code Live Server and friends). The real backend
      // runs on 3000, so try that FIRST — that way we never send a doomed
      // request to the preview server and never log a confusing 404.
      push('http://localhost:3000');
      push('http://127.0.0.1:3000');
      push(here);           // fallback: the backend really is on this port
    } else {
      // The normal case: the page was served by the backend itself.
      push(here);
      push('http://localhost:3000');
      push('http://127.0.0.1:3000');
    }
  }

  // Never expose the bundled seed as live storefront data. The successful
  // discovery request supplies the catalogue too; there is no second GET race.
  global.EVORA_CATALOG = null;

  function probe(url) {
    return fetch(url + PROBE_PATH, { method: 'GET', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (catalog) {
        if (!catalog || !Array.isArray(catalog.categories) || !Array.isArray(catalog.items)) return null;
        var ids = new Set();
        var valid = catalog.items.every(function (p) {
          if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) ||
              typeof p.name !== 'string' || !p.name ||
              typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) return false;
          ids.add(p.id);
          return true;
        });
        return valid ? catalog : null;
      })
      .catch(function () { return null; });
  }

  function resolve() {
    if (pending) return pending;

    pending = (function next(i) {
      return function () {
        if (i >= candidates.length) {
          return Promise.reject(new Error('backend-not-found'));
        }
        var url = candidates[i];
        return probe(url).then(function (catalog) {
          if (catalog) {
            base = url;
            global.EVORA_CATALOG = catalog;
            return base;
          }
          return next(i + 1)();
        });
      };
    })(0)();

    // If nothing answered, let a later call try again (the user may have
    // started the backend in the meantime).
    pending.catch(function () { pending = null; });

    return pending;
  }

  // --------------------------------------------------------------------------
  // A banner that explains, in plain words, what to do when the backend is
  // not reachable. Much friendlier than "405 Method Not Allowed".
  // --------------------------------------------------------------------------
  var banner = null;

  function showBackendDown() {
    if (banner) return;
    banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = [
      'position:fixed', 'left:0', 'right:0', 'top:0', 'z-index:99999',
      'background:#b3261e', 'color:#fff', 'padding:14px 18px',
      'font:600 14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'text-align:center', 'box-shadow:0 2px 12px rgba(0,0,0,.25)'
    ].join(';');
    banner.innerHTML =
      '<strong>The Evora order service is temporarily unavailable.</strong> ' +
      'Orders and complaints can\'t be sent right now.<br>' +
      'Please check your internet connection, then reload this page. If it keeps happening, try again in a few minutes.' +
      '<button type="button" style="margin-left:12px;background:#fff;color:#b3261e;' +
      'border:0;border-radius:6px;padding:6px 12px;font-weight:700;cursor:pointer" ' +
      'onclick="location.reload()">Reload</button>';
    document.body.appendChild(banner);
  }

  global.EVORA_API = {
    // The base URL that answered (empty until the first successful resolve).
    get base() { return base; },

    // Resolves to the working base URL, or rejects with 'backend-not-found'.
    resolve: resolve,

    // Build a full URL for a path using the known base.
    url: function (path) { return base + path; },

    // fetch() that always talks to the right server.
    fetch: function (path, options) {
      return resolve().then(function (b) {
        var opts = options || {};
        if (!opts.method) opts.method = 'GET';
        return fetch(b + path, opts);
      }).catch(function (err) {
        if (err && err.message === 'backend-not-found') {
          showBackendDown();
        }
        throw err;
      });
    }
  };

  // Publish immediately so all consumers await the same discovery response.
  // A failed catalogue stays failed for this page; reload before ordering.
  global.EVORA_API.catalogReady = resolve().then(function () {
    return global.EVORA_CATALOG;
  });
  global.EVORA_API.catalogReady.catch(function () { /* handled below / by storefront */ });

  if (global.document) {
    var start = function () {
      global.EVORA_API.catalogReady.catch(function () {
        showBackendDown();
      });
    };
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})(window);
