// ============================================================================
// api/index.js — Vercel function entry
// ----------------------------------------------------------------------------
// Vercel serves the static site from dist/ (see vercel.json) and rewrites
// /api/* and /health to this function. Exporting the Express app directly is
// supported by Vercel's Node runtime, so every route in server.js works
// unchanged. The original request path is preserved through the rewrite.
// ============================================================================

const { app } = require('../assets/server/server.js');

module.exports = app;
