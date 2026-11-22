// ============================================================================
// visitor-track.js — counts REAL website visitors, no assumptions.
// ----------------------------------------------------------------------------
// The old analytics guessed "15 visitors per order". That is a made-up number
// that has nothing to do with who actually opens the site. This script fixes
// that: every unique browser session that loads a public page is counted
// exactly once per day.
//
// How dedupe works:
//   * The server sets an httpOnly cookie `evora_session` with the day it first
//     saw this browser (e.g. {"day":"2026-11-18"}).
//   * On every subsequent request the server reads the cookie. If the cookie's
//     day matches today, the request is a refresh/back-forward/tab-switch and
//     is NOT counted.
//   * Only the first load of the day for that browser increments the counter.
//
// Nothing here invents data. If a visitor never shows up, they never show up
// in the graph. Refreshing the page does not inflate the count.
//
// Load AFTER api-client.js so EVORA_API.fetch is available.
// ============================================================================
(function (global) {
  'use strict';

  if (global.__evoraVisitorTracker) return;
  global.__evoraVisitorTracker = true;

  function track() {
    var path = (global.location && global.location.pathname) || '';

    function send() {
      var body = JSON.stringify({ path: path });
      var init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body };

      // Prefer the shared API client so the request goes to the right server
      // even when the page is opened from a preview port. Fall back to a plain
      // relative fetch if the client hasn't resolved yet.
      if (global.EVORA_API && typeof global.EVORA_API.fetch === 'function') {
        global.EVORA_API.fetch('/api/visit', init).then(function (res) {
          return res && res.json ? res.json() : null;
        }).catch(function () { /* silent: a lost ping is not an error */ });
      } else {
        fetch('/api/visit', init).catch(function () { /* silent */ });
      }
    }

    if (global.EVORA_API && typeof global.EVORA_API.fetch === 'function') {
      // Wait for the client to find the backend, then fire. If it can't, the
      // relative fetch fallback below still runs.
      Promise.resolve(global.EVORA_API.resolve && global.EVORA_API.resolve()).then(send, send);
    } else {
      send();
    }
  }

  // Fire after the page is interactive so a fast exit doesn't get counted,
  // and so the DOM is stable. 'DOMContentLoaded' is the right moment.
  if (global.document.readyState === 'complete' || global.document.readyState === 'interactive') {
    setTimeout(track, 1);
  } else {
    global.document.addEventListener('DOMContentLoaded', function () { setTimeout(track, 1); });
  }
})(typeof window !== 'undefined' ? window : this);