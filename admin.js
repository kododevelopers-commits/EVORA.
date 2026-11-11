// ============================================================================
// admin.js — small dashboard for viewing orders and contact submissions
// ----------------------------------------------------------------------------
// Runs on /admin.html. Sign-in is two steps: an allowed account email, then
// the admin API key as the password. The pair is kept as a session object in
// sessionStorage (or localStorage with "Remember me"), and sent on every
// protected request as x-admin-email + x-admin-key.
// ============================================================================

(function () {
  var SESSION_KEY = 'evoraAdminSession';
  var OWNER_EMAIL = 'evora.reply@gmail.com';

  // Friendly names shown on the account button and menu instead of the raw
  // email address.
  var ACCOUNT_NAMES = {
    'evora.reply@gmail.com': 'EVORA',
    'kododevelopers@gmail.com': 'KODO',
    'muhammadammarsheikh11@gmail.com': 'Ammar Sheikh'
  };
  function displayName(email) {
    return ACCOUNT_NAMES[email] || email;
  }

  var els = {
    gate:        document.getElementById('gate'),
    emailForm:   document.getElementById('emailForm'),
    adminEmail:  document.getElementById('adminEmail'),
    emailErr:    document.getElementById('emailErr'),
    loginForm:   document.getElementById('loginForm'),
    emailChip:   document.getElementById('emailChip'),
    changeEmail: document.getElementById('changeEmail'),
    apiKey:      document.getElementById('apiKey'),
    rememberMe:  document.getElementById('rememberMe'),
    loginErr:    document.getElementById('loginErr'),
    dashboard:   document.getElementById('dashboard'),
    status:      document.getElementById('statusIndicator'),
    now:         document.getElementById('now'),
    statsRow:    document.getElementById('statsRow'),
    ordersBadge: document.getElementById('ordersBadge'),
    contactsBadge: document.getElementById('contactsBadge'),
    statusFilter: document.getElementById('statusFilter'),
    searchInput: document.getElementById('searchInput'),
    refreshBtn:  document.getElementById('refreshBtn'),
    ordersBody:  document.getElementById('ordersBody'),
    contactsBody: document.getElementById('contactsBody'),
    toast:       document.getElementById('toast'),
    accountWrap:  document.getElementById('accountWrap'),
    accountBtn:   document.getElementById('accountBtn'),
    accountAvatar: document.getElementById('accountAvatar'),
    accountEmail: document.getElementById('accountEmail'),
    accountMenu:  document.getElementById('accountMenu'),
    menuName:     document.getElementById('menuName'),
    menuEmail:    document.getElementById('menuEmail'),
    menuRole:     document.getElementById('menuRole'),
    logoutBtn:    document.getElementById('logoutBtn')
  };

  // -------- Toast --------
  var toastTimer = null;
  function toast(msg, kind) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + (kind || '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.remove('show');
    }, 2400);
  }

  // -------- Auth --------
  // A session is { email, key }. "Remember me" stores it in localStorage so
  // the next visit on this device skips the gate; otherwise sessionStorage,
  // which dies with the tab.
  function readSession(store) {
    try {
      var raw = store.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && s.email && s.key) return s;
    } catch (e) { /* corrupt entry — treat as logged out */ }
    return null;
  }
  function getSession() {
    return readSession(sessionStorage) || readSession(localStorage);
  }
  function setSession(email, key, remember) {
    clearSession();
    var raw = JSON.stringify({ email: email, key: key });
    if (remember) localStorage.setItem(SESSION_KEY, raw);
    else sessionStorage.setItem(SESSION_KEY, raw);
  }
  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
  function getEmail() { var s = getSession(); return s ? s.email : ''; }
  function getKey() { var s = getSession(); return s ? s.key : ''; }

  var pendingEmail = '';

  function showGateStep(step) {
    els.emailForm.style.display = step === 1 ? '' : 'none';
    els.loginForm.style.display = step === 2 ? '' : 'none';
    if (step === 2) els.emailChip.textContent = pendingEmail;
  }

  function showGate(errorMsg, errFor) {
    els.dashboard.style.display = 'none';
    els.accountWrap.style.display = 'none';
    els.gate.style.display = '';
    showGateStep(pendingEmail ? 2 : 1);
    els.emailErr.style.display = 'none';
    els.loginErr.style.display = 'none';
    if (errorMsg) {
      var box = errFor === 'email' ? els.emailErr : els.loginErr;
      box.textContent = errorMsg;
      box.style.display = '';
    }
  }

  function renderAccount() {
    var email = getEmail();
    var name = displayName(email);
    els.accountAvatar.textContent = (name.charAt(0) || '?').toUpperCase();
    els.accountEmail.textContent = name;
    els.menuName.textContent = name;
    els.menuEmail.textContent = email;
    els.menuRole.textContent = email === OWNER_EMAIL ? 'Owner' : 'Admin';
  }

  function enterDashboard() {
    els.gate.style.display = 'none';
    els.dashboard.style.display = '';
    renderAccount();
    els.accountWrap.style.display = '';
    loadAll();
  }

  // Step 1 — collect the email. Whether it is allowed is decided by the
  // server when the password goes in with it.
  els.emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = els.adminEmail.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      els.emailErr.textContent = 'Enter a valid email address.';
      els.emailErr.style.display = '';
      return;
    }
    pendingEmail = email;
    els.emailErr.style.display = 'none';
    els.loginErr.style.display = 'none';
    showGateStep(2);
    els.apiKey.focus();
  });

  els.changeEmail.addEventListener('click', function () {
    pendingEmail = '';
    els.loginErr.style.display = 'none';
    showGateStep(1);
    els.adminEmail.focus();
  });

  // Step 2 — email + key go to the server; it decides who gets in.
  els.loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = els.apiKey.value.trim();
    if (!key || !pendingEmail) return;
    EVORA_API.fetch('/api/stats', {
      headers: { 'x-admin-key': key, 'x-admin-email': pendingEmail }
    })
      .then(function (r) {
        if (r.status === 403) throw new Error('This email is not allowed to access the admin panel.');
        if (r.status === 401) throw new Error('Wrong password — try again.');
        if (r.status === 503) throw new Error('Server has no ADMIN_API_KEY configured.');
        if (!r.ok) throw new Error('Server returned ' + r.status);
        setSession(pendingEmail, key, els.rememberMe.checked);
        enterDashboard();
      })
      .catch(function (err) {
        clearSession();
        var msg = (err && err.message === 'backend-not-found')
          ? "The Evora backend isn't running. Start it by double-clicking start-evora.cmd in the project folder, then try again."
          : err.message;
        showGate(msg, 'password');
      });
  });

  // -------- Account menu --------
  els.accountBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    els.accountMenu.hidden = !els.accountMenu.hidden;
    els.accountBtn.setAttribute('aria-expanded', String(!els.accountMenu.hidden));
  });
  document.addEventListener('click', function () {
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
  });
  els.logoutBtn.addEventListener('click', function () {
    clearSession();
    pendingEmail = '';
    els.apiKey.value = '';
    els.rememberMe.checked = false;
    els.accountMenu.hidden = true;
    allOrders = [];
    showGate();
  });

  // -------- API --------
  function api(path, opts) {
    opts = opts || {};
    var headers = Object.assign({ 'x-admin-key': getKey(), 'x-admin-email': getEmail() }, opts.headers || {});
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return EVORA_API.fetch(path, Object.assign({}, opts, { headers: headers })).then(function (r) {
      if (r.status === 401 || r.status === 403) {
        pendingEmail = getEmail();
        clearSession();
        showGate(r.status === 403
          ? 'This email is not allowed to access the admin panel.'
          : 'Session expired — please sign in again.', 'password');
        throw new Error('Unauthorized');
      }
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          throw new Error(body.error || ('Request failed: ' + r.status));
        });
      }
      return r.json();
    });
  }

  // -------- Render helpers --------
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMoney(n) {
    var v = Number(n) || 0;
    return 'Rs. ' + v.toLocaleString('en-US');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var pad = function (x) { return String(x).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // Labels for the contact form's subject dropdown — kept in sync with the
  // backend so the dashboard reads the same way the customer wrote it.
  var CONTACT_SUBJECT_LABELS = {
    general: 'General Inquiry',
    order: 'Order Question',
    complaint: 'Complaint',
    feedback: 'Feedback',
    partnership: 'Partnership / Wholesale'
  };

  function contactSubjectLabel(subject) {
    return CONTACT_SUBJECT_LABELS[subject] || 'Message';
  }

  // A mailto: link that opens the shop's mail client with the customer's
  // address pre-filled, so answering a complaint takes one click.
  function replyMailto(email, subject) {
    if (!email) return '#';
    return 'mailto:' + encodeURIComponent(email) +
           '?subject=' + encodeURIComponent('Re: ' + (subject || 'your Evora message'));
  }

  function statusPill(status) {
    var label = (status || 'received').replace(/_/g, ' ');
    return '<span class="status status-' + escapeHtml(status || 'received') + '">' +
           escapeHtml(label) + '</span>';
  }

  // -------- Stats --------
  function renderStats(stats) {
    var o = stats.orders || {};
    var html = '';
    html += '<div class="stat"><div class="label">Total orders</div><div class="value">' +
            (o.total || 0) + '</div><div class="sub">all time</div></div>';
    html += '<div class="stat revenue"><div class="label">Revenue</div><div class="value">' +
            formatMoney(o.revenue || 0) + '</div><div class="sub">excl. cancelled</div></div>';
    var byStatus = o.byStatus || {};
    html += '<div class="stat"><div class="label">Received</div><div class="value">' +
            (byStatus.received || 0) + '</div><div class="sub">awaiting action</div></div>';
    html += '<div class="stat"><div class="label">Preparing</div><div class="value">' +
            (byStatus.preparing || 0) + '</div><div class="sub">being packed</div></div>';
    html += '<div class="stat"><div class="label">Out for delivery</div><div class="value">' +
            (byStatus.out_for_delivery || 0) + '</div><div class="sub">on the road</div></div>';
    html += '<div class="stat"><div class="label">Delivered</div><div class="value">' +
            (byStatus.delivered || 0) + '</div><div class="sub">completed</div></div>';
    els.statsRow.innerHTML = html;
  }

  // -------- Orders --------
  var allOrders = [];

  function renderOrders() {
    var statusFilter = els.statusFilter.value;
    var search = (els.searchInput.value || '').toLowerCase().trim();

    var rows = allOrders.filter(function (o) {
      if (statusFilter && o.status !== statusFilter) return false;
      if (search) {
        var hay = (o.orderId + ' ' + (o.customer && o.customer.name) + ' ' +
                   (o.customer && o.customer.email) + ' ' +
                   (o.customer && o.customer.phone)).toLowerCase();
        if (hay.indexOf(search) === -1) return false;
      }
      return true;
    });

    if (rows.length === 0) {
      els.ordersBody.innerHTML = '<tr><td colspan="6" class="empty">No orders match.</td></tr>';
      return;
    }

    var html = rows.map(function (o) {
      var items = (o.items || []).map(function (it) {
        return '<span class="item-line">' + it.qty + '× ' + escapeHtml(it.name) + '</span>';
      }).join('');
      var c = o.customer || {};
      return '<tr data-id="' + escapeHtml(o.orderId) + '">' +
        '<td>' +
          '<div class="order-id">' + escapeHtml(o.orderId) + '</div>' +
          '<div class="customer-meta">' + formatDate(o.receivedAt) + '</div>' +
        '</td>' +
        '<td>' +
          '<div class="customer-name">' + escapeHtml(c.name) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.email) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.phone) + '</div>' +
          '<a class="reply-link" target="_blank" rel="noopener" href="' +
            replyMailto(c.email, 'Your Evora order ' + o.orderId) + '">Reply by email</a>' +
        '</td>' +
        '<td class="items-cell">' + items + '</td>' +
        '<td class="total">' + formatMoney(o.totals && o.totals.total) + '<br>' +
          '<span class="customer-meta">' + escapeHtml((o.payment && o.payment.methodLabel) || '') + '</span>' +
        '</td>' +
        '<td>' + statusPill(o.status) + '</td>' +
        '<td>' +
          '<div class="row-actions">' +
            '<select data-id="' + escapeHtml(o.orderId) + '">' +
              ['received','preparing','out_for_delivery','delivered','cancelled'].map(function (s) {
                return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' +
                       s.replace(/_/g, ' ') + '</option>';
              }).join('') +
            '</select>' +
            '<button data-save="' + escapeHtml(o.orderId) + '">Save</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');
    els.ordersBody.innerHTML = html;

    // Wire up save buttons
    Array.prototype.forEach.call(els.ordersBody.querySelectorAll('button[data-save]'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-save');
        var sel = els.ordersBody.querySelector('select[data-id="' + id + '"]');
        var newStatus = sel ? sel.value : '';
        btn.disabled = true;
        btn.textContent = 'Saving…';
        api('/api/orders/' + encodeURIComponent(id) + '/status', {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        }).then(function () {
          toast('Status updated for ' + id, 'success');
          return loadAll();
        }).catch(function (err) {
          toast(err.message, 'error');
        }).then(function () {
          btn.disabled = false;
          btn.textContent = 'Save';
        });
      });
    });
  }

  // -------- Email delivery status --------
  // A complaint or an order confirmation that could not be emailed must never
  // be invisible — otherwise the shop thinks it got the message when it did
  // not. This puts a red banner at the top of the dashboard when that
  // happens, with the actual error so it can be fixed.
  function renderEmailStatus(email) {
    var box = document.getElementById('emailAlert');
    var text = document.getElementById('emailAlertText');
    if (!box || !text) return;

    if (!email) {
      box.style.display = 'none';
      return;
    }

    if (!email.configured) {
      text.innerHTML = 'Email is not set up, so notifications are only printed to the server terminal and never delivered. ' +
        'Set <code>EMAIL_PROVIDER</code> and your credentials in <code>assets/server/.env</code>.';
      box.style.display = '';
      return;
    }

    if (email.failed > 0) {
      var when = email.lastFailureAt ? ' (last failure ' + formatDate(email.lastFailureAt) + ')' : '';
      text.innerHTML = '<strong>' + email.failed + ' email' + (email.failed === 1 ? '' : 's') + ' could not be sent</strong>' + when +
        '. Some complaints or order confirmations were never delivered — check your inbox and send them again. ' +
        'Server said: <code>' + escapeHtml(email.lastError || 'unknown error') + '</code>';
      box.style.display = '';
      return;
    }

    box.style.display = 'none';
  }

  // -------- Contacts --------
  function renderContacts(contacts) {
    if (!contacts.length) {
      els.contactsBody.innerHTML = '<tr><td colspan="4" class="empty">No contact messages yet.</td></tr>';
      return;
    }
    var html = contacts.map(function (c) {
      return '<tr>' +
        '<td><div>' + formatDate(c.receivedAt) + '</div>' +
            '<div class="customer-meta">' + escapeHtml(c.contactId) + '</div></td>' +
        '<td>' +
          '<div class="customer-name">' + escapeHtml(c.name) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.email) + '</div>' +
          (c.phone ? '<div class="customer-meta">' + escapeHtml(c.phone) + '</div>' : '') +
        '</td>' +
        '<td><strong>' + escapeHtml(contactSubjectLabel(c.subject)) + '</strong>' +
          '<a class="reply-link" target="_blank" rel="noopener" href="' +
            replyMailto(c.email, 'Your Evora ' + contactSubjectLabel(c.subject) + ' (' + c.contactId + ')') + '">Reply by email</a></td>' +
        '<td><div style="white-space:pre-wrap; max-width:520px;">' + escapeHtml(c.message) + '</div></td>' +
      '</tr>';
    }).join('');
    els.contactsBody.innerHTML = html;
  }

  // -------- Load everything --------
  function loadAll() {
    return Promise.all([
      api('/api/stats'),
      api('/api/orders'),
      api('/api/contacts')
    ]).then(function (results) {
      var stats = results[0];
      var orders = results[1];
      var contacts = results[2];

      renderStats(stats);
      allOrders = orders;
      renderOrders();
      renderContacts(contacts);
      renderEmailStatus(stats.email);

      // Update badges
      var newOrders = (stats.orders && stats.orders.byStatus && stats.orders.byStatus.received) || 0;
      if (newOrders > 0) {
        els.ordersBadge.textContent = newOrders;
        els.ordersBadge.style.display = '';
      } else {
        els.ordersBadge.style.display = 'none';
      }
      var cTotal = (stats.contacts && stats.contacts.total) || contacts.length;
      if (cTotal > 0) {
        els.contactsBadge.textContent = cTotal;
        els.contactsBadge.style.display = '';
      } else {
        els.contactsBadge.style.display = 'none';
      }

      els.status.textContent = '● Live';
      els.status.style.color = '#34d399';
    }).catch(function (err) {
      els.status.textContent = '● Error';
      els.status.style.color = '#fca5a5';
      // If it's an auth error, showGate was already called by api()
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    });
  }

  // -------- Wiring --------
  els.statusFilter.addEventListener('change', renderOrders);
  els.searchInput.addEventListener('input', renderOrders);
  els.refreshBtn.addEventListener('click', loadAll);

  // Tabs
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
    tab.addEventListener('click', function () {
      var which = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.getElementById('panel-orders').style.display = which === 'orders' ? '' : 'none';
      document.getElementById('panel-contacts').style.display = which === 'contacts' ? '' : 'none';
    });
  });

  // Live clock in the topbar
  function tickClock() {
    var d = new Date();
    var pad = function (x) { return String(x).padStart(2, '0'); };
    els.now.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Auto-refresh every 15 seconds (orders/contacts only — stats are pulled in loadAll)
  setInterval(function () {
    if (els.dashboard.style.display === 'none') return;
    if (!getKey()) return;
    // Don't clobber the table while the admin is working in it: re-rendering
    // would close an open status dropdown and discard a half-typed search.
    var active = document.activeElement;
    if (active && active.closest &&
        (active.closest('#panel-orders') || active.closest('.orders-toolbar'))) return;
    Promise.all([api('/api/orders'), api('/api/contacts')]).then(function (results) {
      allOrders = results[0];
      renderOrders();
      renderContacts(results[1]);
    }).catch(function () { /* api() will surface auth errors */ });
  }, 15000);

  // -------- Boot --------
  if (getSession()) {
    pendingEmail = getEmail();
    enterDashboard();
  } else {
    showGate();
  }
})();
