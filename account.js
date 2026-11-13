// ============================================================================
// account.js — customer accounts: Google + email/password sign-in, and an
// Orders tab that lists every order placed with the signed-in email.
// ----------------------------------------------------------------------------
// Sign-in runs entirely in the browser through supabase-js (loaded from a
// pinned CDN). The server only ever sees a short-lived access token, which it
// verifies against Supabase Auth before returning that customer's orders
// (GET /api/account/orders). Clicking an order opens track.html?id=… for the
// live status timeline. RLS stays locked; the anon key can read no shop data.
// ============================================================================
(function () {
  'use strict';

  var SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  var $ = function (id) { return document.getElementById(id); };

  var STATUS = {
    received:         { label: 'Received',         cls: 's-received',   step: 0 },
    preparing:        { label: 'Preparing',        cls: 's-preparing',  step: 1 },
    out_for_delivery: { label: 'Out for delivery', cls: 's-out',        step: 2 },
    delivered:        { label: 'Delivered',        cls: 's-delivered',  step: 3 },
    cancelled:        { label: 'Cancelled',        cls: 's-cancelled',  step: -1 }
  };

  var client = null;
  var session = null;
  var mode = 'signin';
  var toastTimer = null;

  // ---------- small helpers ----------
  function apiFetch(path, options) {
    return window.EVORA_API ? window.EVORA_API.fetch(path, options) : fetch(path, options);
  }
  function money(n) { return 'Rs. ' + Number(n || 0).toLocaleString('en-PK'); }
  function fmtDate(d) {
    var dt = new Date(d);
    if (isNaN(dt)) return '—';
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function validEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function redirectUrl() { return window.location.origin + window.location.pathname; }
  function showToast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').classList.remove('show'); }, 4000);
  }
  function show(which) {
    ['boot', 'noticeView', 'authView', 'recoveryView', 'accountView'].forEach(function (id) {
      $(id).hidden = (id !== which);
    });
  }

  // ---------- supabase loader (prefer a preloaded bundle, else the CDN) ----------
  function ensureSupabase() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = SUPABASE_CDN;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('cdn-failed')); };
      document.head.appendChild(s);
    });
  }

  // ---------- auth messages ----------
  function clearMsgs() {
    $('authError').hidden = true; $('authError').textContent = '';
    $('authInfo').hidden = true; $('authInfo').textContent = '';
  }
  function authError(msg) { $('authInfo').hidden = true; $('authError').textContent = msg; $('authError').hidden = false; }
  function authInfo(msg) { $('authError').hidden = true; $('authInfo').textContent = msg; $('authInfo').hidden = false; }
  function friendlyAuthError(err) {
    var m = String((err && err.message) || '').toLowerCase();
    if (m.indexOf('invalid login') > -1) return 'Email or password is incorrect.';
    if (m.indexOf('already registered') > -1 || m.indexOf('already exists') > -1) return 'An account with this email already exists. Try signing in instead.';
    if (m.indexOf('email not confirmed') > -1) return 'Please confirm your email first — check your inbox for the link.';
    if (m.indexOf('password') > -1 && (m.indexOf('short') > -1 || m.indexOf('least') > -1)) return 'Password is too short. Use at least 6 characters.';
    if (m.indexOf('rate') > -1 || m.indexOf('too many') > -1 || m.indexOf('seconds') > -1) return 'Too many attempts. Please wait a moment and try again.';
    if (m.indexOf('provider') > -1 || m.indexOf('not enabled') > -1) return 'That sign-in method isn’t available right now. Please use email and password.';
    return (err && err.message) || 'Something went wrong. Please try again.';
  }

  // ---------- sign-in / sign-up mode ----------
  function setMode(next) {
    mode = next;
    var signup = mode === 'signup';
    $('tabSignin').classList.toggle('active', !signup);
    $('tabSignup').classList.toggle('active', signup);
    $('tabSignin').setAttribute('aria-selected', String(!signup));
    $('tabSignup').setAttribute('aria-selected', String(signup));
    $('confirmWrap').hidden = !signup;
    $('emailSubmit').textContent = signup ? 'Create account' : 'Sign in';
    $('googleBtnText').textContent = signup ? 'Sign up with Google' : 'Continue with Google';
    $('forgotBtn').hidden = signup;
    $('switchText').textContent = signup ? 'Already have an account?' : 'New to Evora?';
    $('switchLink').textContent = signup ? 'Sign in' : 'Create an account';
    $('authTitle').textContent = signup ? 'Create your account' : 'Welcome back';
    $('authSubtitle').textContent = signup
      ? 'Join Evora to keep all your orders in one place.'
      : 'Sign in to see your orders and their live progress.';
    $('passwordInput').setAttribute('autocomplete', signup ? 'new-password' : 'current-password');
    clearMsgs();
  }

  // ---------- signed-in rendering ----------
  function setAccTab(tab) {
    var orders = tab === 'orders';
    $('ordersTab').classList.toggle('active', orders);
    $('profileTab').classList.toggle('active', !orders);
    $('ordersTab').setAttribute('aria-selected', String(orders));
    $('profileTab').setAttribute('aria-selected', String(!orders));
    $('ordersPanel').hidden = !orders;
    $('profilePanel').hidden = orders;
  }

  function setOrdersState(state, msg) {
    $('ordersLoading').hidden = state !== 'loading';
    $('ordersError').hidden = state !== 'error';
    $('ordersUnconfirmed').hidden = state !== 'unconfirmed';
    $('ordersEmpty').hidden = state !== 'empty';
    $('ordersList').hidden = state !== 'list';
    if (state === 'error' && msg) $('ordersErrorMsg').textContent = msg;
    if (state === 'unconfirmed' && msg) $('unconfirmedMsg').textContent = msg;
    if (state !== 'list') $('ordersCount').textContent = '';
  }

  function orderCard(o) {
    var st = STATUS[o.status] || STATUS.received;
    var card = document.createElement('a');
    card.className = 'order-card';
    card.href = 'track.html?id=' + encodeURIComponent(o.orderId);
    card.setAttribute('aria-label', 'Order ' + o.orderId + ', ' + st.label + '. View progress.');

    var top = document.createElement('div'); top.className = 'oc-top';
    var id = document.createElement('span'); id.className = 'oc-id'; id.textContent = o.orderId;
    var pill = document.createElement('span'); pill.className = 'status-pill ' + st.cls; pill.textContent = st.label;
    top.appendChild(id); top.appendChild(pill);

    var date = document.createElement('div'); date.className = 'oc-date';
    date.textContent = 'Placed ' + fmtDate(o.receivedAt);

    var items = document.createElement('div'); items.className = 'oc-items';
    var list = o.items || [];
    var count = list.reduce(function (n, it) { return n + (Number(it.qty) || 0); }, 0);
    var first = list[0] ? list[0].name : 'Order';
    items.textContent = count + (count === 1 ? ' item' : ' items') + ' · ' + first;
    if (list.length > 1) {
      var more = document.createElement('span'); more.className = 'more';
      more.textContent = ' +' + (list.length - 1) + ' more';
      items.appendChild(more);
    }

    var bottom = document.createElement('div'); bottom.className = 'oc-bottom';
    var total = document.createElement('span'); total.className = 'oc-total';
    total.textContent = money(o.totals && o.totals.total);
    var cta = document.createElement('span'); cta.className = 'oc-cta';
    cta.textContent = 'View progress';
    var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('viewBox', '0 0 24 24'); arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'currentColor'); arrow.setAttribute('stroke-width', '2');
    arrow.setAttribute('stroke-linecap', 'round'); arrow.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 12h14M12 5l7 7-7 7');
    arrow.appendChild(path); cta.appendChild(arrow);
    bottom.appendChild(total); bottom.appendChild(cta);

    var prog = document.createElement('div'); prog.className = 'oc-progress';
    var bar = document.createElement('div'); bar.className = 'oc-progress-bar';
    var pct = st.step < 0 ? 100 : (st.step / 3) * 100;
    bar.style.width = pct + '%';
    if (st.step < 0) bar.classList.add('cancelled');
    prog.appendChild(bar);

    card.appendChild(top); card.appendChild(date); card.appendChild(items);
    card.appendChild(bottom); card.appendChild(prog);
    return card;
  }

  function renderOrders(orders) {
    if (!orders.length) { setOrdersState('empty'); return; }
    var list = $('ordersList');
    list.textContent = '';
    orders.forEach(function (o) { list.appendChild(orderCard(o)); });
    $('ordersCount').textContent = orders.length + (orders.length === 1 ? ' order' : ' orders');
    setOrdersState('list');
  }

  function loadOrders() {
    if (!session) return;
    setOrdersState('loading');
    apiFetch('/api/account/orders', { headers: { Authorization: 'Bearer ' + session.access_token } })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
      })
      .then(function (res) {
        if (!res.ok) {
          if (res.status === 401) {
            showToast('Your session expired. Please sign in again.');
            if (client) client.auth.signOut();
            return;
          }
          if (res.status === 403) { setOrdersState('unconfirmed', res.data.error); return; }
          setOrdersState('error', res.data.error);
          return;
        }
        renderOrders(res.data.orders || []);
      })
      .catch(function () { setOrdersState('error'); });
  }

  function onSignedIn(sess) {
    var prev = session;
    var sameUser = prev && prev.user && sess.user && prev.user.id === sess.user.id;
    session = sess;
    var user = sess.user || {};
    var email = user.email || '';
    var meta = user.user_metadata || {};
    var name = meta.full_name || meta.name || '';
    $('accEmail').textContent = email;
    $('accGreeting').textContent = name ? ('Hi, ' + String(name).split(' ')[0]) : 'Your account';
    $('accAvatar').textContent = String(name || email || 'E').trim().charAt(0).toUpperCase();

    $('profEmail').textContent = email;
    var confirmed = !!(user.email_confirmed_at || user.confirmed_at);
    var statusEl = $('profStatus');
    statusEl.textContent = '';
    var badge = document.createElement('span');
    badge.className = confirmed ? 'badge-ok' : 'badge-warn';
    badge.textContent = confirmed ? 'Confirmed' : 'Not confirmed';
    statusEl.appendChild(badge);
    $('profSince').textContent = user.created_at ? fmtDate(user.created_at) : '—';

    var wasHidden = $('accountView').hidden;
    show('accountView');
    if (wasHidden) setAccTab('orders');
    if (!sameUser || wasHidden) loadOrders();
  }

  function showNotice(title, msg, canRetry) {
    $('noticeTitle').textContent = title;
    $('noticeMsg').textContent = msg;
    $('noticeRetry').hidden = !canRetry;
    show('noticeView');
  }

  // ---------- auth event wiring (per client) ----------
  function wireAuthEvents() {
    client.auth.onAuthStateChange(function (event, sess) {
      if (event === 'PASSWORD_RECOVERY') { show('recoveryView'); return; }
      if (event === 'SIGNED_OUT') { session = null; show('authView'); setMode('signin'); return; }
      if (!sess) return;
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') { onSignedIn(sess); return; }
      // INITIAL_SESSION / TOKEN_REFRESHED: keep the access token current
      // without re-fetching orders the customer is already looking at.
      session = sess;
    });
  }

  // ---------- init ----------
  function init() {
    show('boot');
    apiFetch('/api/account/config')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (!cfg || !cfg.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          showNotice('Accounts coming soon', 'Customer accounts aren’t switched on yet. You can still track any order with its ID.', false);
          return;
        }
        return ensureSupabase().then(function () {
          client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          });
          wireAuthEvents();
          return client.auth.getSession().then(function (res) {
            var sess = res && res.data && res.data.session;
            if (sess) onSignedIn(sess);
            else { show('authView'); setMode('signin'); }
          });
        });
      })
      .catch(function () {
        showNotice('Couldn’t load accounts', 'We couldn’t reach the sign-in service. Check your connection and try again.', true);
      });
  }

  // ---------- DOM event wiring (once) ----------
  function bind() {
    $('tabSignin').addEventListener('click', function () { setMode('signin'); });
    $('tabSignup').addEventListener('click', function () { setMode('signup'); });
    $('switchLink').addEventListener('click', function () { setMode(mode === 'signup' ? 'signin' : 'signup'); });
    $('noticeRetry').addEventListener('click', init);

    $('googleBtn').addEventListener('click', function () {
      if (!client) return;
      clearMsgs();
      var btn = $('googleBtn'); btn.disabled = true;
      client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } })
        .then(function (res) {
          if (res.error) { authError(friendlyAuthError(res.error)); btn.disabled = false; }
          // On success the browser redirects to Google; nothing else to do.
        })
        .catch(function () { authError('Could not start Google sign-in. Please try again.'); btn.disabled = false; });
    });

    $('emailForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!client) return;
      clearMsgs();
      var email = $('emailInput').value.trim();
      var pass = $('passwordInput').value;
      if (!validEmail(email)) { authError('Enter a valid email address.'); $('emailInput').focus(); return; }
      if (pass.length < 6) { authError('Password must be at least 6 characters.'); $('passwordInput').focus(); return; }
      if (mode === 'signup' && pass !== $('confirmInput').value) {
        authError('Passwords do not match.'); $('confirmInput').focus(); return;
      }
      var btn = $('emailSubmit'); btn.disabled = true;
      btn.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';
      var signup = mode === 'signup';
      var p = signup
        ? client.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: redirectUrl() } })
        : client.auth.signInWithPassword({ email: email, password: pass });
      p.then(function (res) {
        if (res.error) { authError(friendlyAuthError(res.error)); return; }
        if (signup) {
          if (res.data && res.data.session) { onSignedIn(res.data.session); }
          else {
            setMode('signin');
            $('emailInput').value = email;
            authInfo('Almost there! We sent a confirmation link to ' + email + '. Click it, then sign in.');
          }
        } else if (res.data && res.data.session) {
          onSignedIn(res.data.session);
        }
      }).catch(function () {
        authError('Could not reach the sign-in service. Check your connection and try again.');
      }).finally(function () {
        btn.disabled = false;
        btn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
      });
    });

    $('forgotBtn').addEventListener('click', function () {
      if (!client) return;
      clearMsgs();
      var email = $('emailInput').value.trim();
      if (!validEmail(email)) { authError('Enter your email above first, then tap “Forgot password”.'); $('emailInput').focus(); return; }
      client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() })
        .then(function (res) {
          if (res.error) authError(friendlyAuthError(res.error));
          else authInfo('If an account exists for ' + email + ', a password-reset link is on its way.');
        })
        .catch(function () { authError('Could not send the reset email. Please try again.'); });
    });

    $('recoveryForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!client) return;
      var pass = $('recoveryPass').value;
      $('recoveryError').hidden = true;
      if (pass.length < 6) { $('recoveryError').textContent = 'Password must be at least 6 characters.'; $('recoveryError').hidden = false; return; }
      var btn = $('recoverySubmit'); btn.disabled = true; btn.textContent = 'Updating…';
      client.auth.updateUser({ password: pass })
        .then(function (res) {
          if (res.error) { $('recoveryError').textContent = friendlyAuthError(res.error); $('recoveryError').hidden = false; return; }
          showToast('Password updated.');
          return client.auth.getSession().then(function (r) {
            var s = r.data && r.data.session;
            if (s) onSignedIn(s);
            else { show('authView'); setMode('signin'); }
          });
        })
        .catch(function () { $('recoveryError').textContent = 'Could not update your password. Please try again.'; $('recoveryError').hidden = false; })
        .finally(function () { btn.disabled = false; btn.textContent = 'Update password'; });
    });

    $('ordersTab').addEventListener('click', function () { setAccTab('orders'); });
    $('profileTab').addEventListener('click', function () { setAccTab('profile'); });
    $('ordersRetry').addEventListener('click', loadOrders);

    $('resendBtn').addEventListener('click', function () {
      if (!client || !session) return;
      var btn = $('resendBtn'); btn.disabled = true; btn.textContent = 'Sending…';
      client.auth.resend({ type: 'signup', email: session.user.email })
        .then(function (res) {
          if (res.error) showToast(friendlyAuthError(res.error));
          else showToast('Confirmation email sent. Check your inbox.');
        })
        .catch(function () { showToast('Could not send the email. Please try again.'); })
        .finally(function () { btn.disabled = false; btn.textContent = 'Resend confirmation email'; });
    });

    function doSignOut() {
      if (!client) return;
      client.auth.signOut().then(function () {
        session = null;
        showToast('Signed out.');
        show('authView');
        setMode('signin');
      }).catch(function () { showToast('Could not sign out. Please try again.'); });
    }
    $('signOutBtn').addEventListener('click', doSignOut);
    $('signOutBtn2').addEventListener('click', doSignOut);
  }

  // Expose the controller so the page can be re-initialised (e.g. after a
  // configuration change) without a full reload.
  window.EVORA_ACCOUNT = { init: init };

  function start() { bind(); init(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();