// ============================================================================
// api.js — runs the Express backend as a Netlify Function
// ----------------------------------------------------------------------------
// Netlify serves the static site from dist/ and forwards /api/* and /health
// here (see netlify.toml). serverless-http turns the Lambda-style event into
// a normal Node request, so server.js runs unchanged.
// ============================================================================

const serverless = require('serverless-http');
const { app } = require('../../assets/server/server.js');

const handle = serverless(app);

// Depending on how Netlify rewrites the URL, the function may see the original
// path (/api/orders) or its own path (/.netlify/functions/api/orders). Express
// routes are written against the original, so normalise both cases.
const FN_PREFIX = '/.netlify/functions/api';

function originalPath(path) {
  if (path.indexOf(FN_PREFIX) !== 0) return path;

  const rest = path.slice(FN_PREFIX.length);
  if (rest === '/health') return '/health';
  return '/api' + rest;
}

exports.handler = async function (event, context) {
  if (typeof event.path === 'string') {
    const path = originalPath(event.path);
    if (path !== event.path) {
      event.path = path;
      if (typeof event.rawUrl === 'string') {
        try {
          const u = new URL(event.rawUrl);
          u.pathname = path;
          event.rawUrl = u.toString();
        } catch (e) {
          // leave rawUrl alone
        }
      }
    }
  }
  return handle(event, context);
};
