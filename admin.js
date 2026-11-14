(function () {
  'use strict';

  var identity = null;
  var sessionVersion = 0;
  var pendingEmail = '';
  var authBusy = false;
  var loggingOut = false;
  var activeTab = 'orders';
  var allOrders = [];
  var allContacts = [];
  var allStaff = [];
  var allProducts = [];
  var categories = [];
  var lastStats = null;
  var dashboardRequest = 0;
  var productRequest = 0;
  var loadingCount = 0;
  var mutationCount = 0;
  var editorVersion = 0;
  var editingProductId = null;
  var editingProductVersion = null;
  var savingProduct = false;
  var editorMode = 'edit';
  var siteContent = {};
  var siteContentVersion = 0;
  var savingChanges = false;

  function canEdit() { return !!identity && ['owner', 'admin'].includes(identity.role); }
  function isOwner() { return !!identity && identity.role === 'owner'; }

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

  ['verifyForm', 'loginCode', 'verifyEmail', 'verifyErr', 'restartLogin',
    'orderTotalHeading', 'orderActionsHeading', 'emailAlert', 'emailAlertText',
    'staffForm', 'staffName', 'staffEmail', 'staffRole', 'staffBody', 'staffActionsHeading', 'staffRefresh',
    'productsTab', 'productsBody', 'productSearch', 'productsRefresh', 'addProduct', 'productDialog', 'productForm',
    'productName', 'productPrice', 'productOriginalPrice', 'productCategory', 'productDescription', 'productImage', 'productHoverImage',
    'productImageFile', 'productHoverFile', 'productAvailable', 'productImagePreview', 'productHoverPreview',
    'productEditorTitle', 'productIdText', 'productError', 'saveProduct', 'cancelProduct',
    'changesTab', 'panelChanges', 'changesRefresh', 'carouselRows', 'addCarouselSlide',
    'storyEyebrow', 'storyTitle', 'storyEmphasis', 'storyDesc', 'storyPoints', 'storyBtn1Label', 'storyBtn1Href', 'storyBtn2Label', 'storyBtn2Href',
    'footerTagline', 'footerContactHeading', 'footerPhone', 'footerPhoneHref', 'footerAddress', 'footerFollowHeading', 'footerFbHref', 'footerIgHref',
    'footerHelpHeading', 'footerLinks', 'addFooterLink', 'footerPoweredText', 'footerPoweredHref', 'footerBottomLinks', 'addFooterBottomLink',
    'saveChanges', 'changesVersion', 'changesError'
  ].forEach(function (id) { els[id] = document.getElementById(id); });

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

  function formError(box, message) {
    box.textContent = message || '';
    box.style.display = message ? '' : 'none';
  }

  function setAuthBusy(busy) {
    authBusy = busy;
    [els.emailForm, els.loginForm, els.verifyForm].forEach(function (form) {
      form.querySelectorAll('input, button').forEach(function (control) { control.disabled = busy; });
    });
  }

  function showGateStep(step) {
    els.emailForm.style.display = step === 1 ? '' : 'none';
    els.loginForm.style.display = step === 2 ? '' : 'none';
    els.verifyForm.style.display = step === 3 ? '' : 'none';
    els.emailChip.textContent = pendingEmail;
    els.verifyEmail.textContent = pendingEmail;
    [els.emailErr, els.loginErr, els.verifyErr].forEach(function (box) { formError(box, ''); });
  }

  function clearCachedRows() {
    allOrders = [];
    allContacts = [];
    allStaff = [];
    allProducts = [];
    categories = [];
    lastStats = null;
    dashboardRequest++;
    productRequest++;
    ['ordersBody', 'contactsBody', 'staffBody', 'productsBody', 'statsRow', 'emailAlertText'].forEach(function (id) {
      els[id].textContent = '';
    });
    els.ordersBadge.style.display = 'none';
    els.contactsBadge.style.display = 'none';
    els.emailAlert.style.display = 'none';
    siteContent = {};
    closeProductEditor();
  }

  function showGate(message) {
    sessionVersion++;
    identity = null;
    pendingEmail = '';
    clearCachedRows();
    els.apiKey.value = '';
    els.loginCode.value = '';
    els.adminEmail.value = '';
    els.rememberMe.checked = false;
    els.staffForm.reset();
    els.productSearch.value = '';
    els.searchInput.value = '';
    els.statusFilter.value = '';
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
    ['accountEmail', 'accountAvatar', 'menuName', 'menuEmail', 'menuRole'].forEach(function (id) { els[id].textContent = ''; });
    els.dashboard.style.display = 'none';
    els.accountWrap.style.display = 'none';
    els.gate.style.display = '';
    els.productsTab.hidden = true;
    els.staffForm.hidden = true;
    switchTab('orders');
    showGateStep(1);
    formError(els.emailErr, message);
    els.status.textContent = 'Signed out';
    els.status.style.color = '';
    els.toast.classList.remove('show');
  }

  function applyIdentity(member) {
    if (!member || !member.email || !['owner', 'admin', 'viewer'].includes(member.role)) {
      throw new Error('The server returned an invalid account. Please sign in again.');
    }
    if (identity && (identity.email !== member.email || identity.role !== member.role)) {
      sessionVersion++;
      clearCachedRows();
      els.staffForm.reset();
    }
    identity = member;
    var name = member.name || member.email;
    els.accountAvatar.textContent = (name.charAt(0) || '?').toUpperCase();
    els.accountEmail.textContent = name;
    els.menuName.textContent = name;
    els.menuEmail.textContent = member.email;
    els.menuRole.textContent = member.role.charAt(0).toUpperCase() + member.role.slice(1);
    els.orderTotalHeading.hidden = !canEdit();
    els.orderActionsHeading.hidden = !canEdit();
    els.staffActionsHeading.hidden = !isOwner();
    els.staffForm.hidden = !isOwner();
    els.productsTab.hidden = !canEdit();
    els.changesTab.hidden = !canEdit();
    if (!canEdit()) {
      els.emailAlert.style.display = 'none';
      closeProductEditor();
      if (activeTab === 'products') switchTab('orders');
    }
  }

  function enterDashboard(member) {
    sessionVersion++;
    applyIdentity(member);
    pendingEmail = '';
    els.apiKey.value = '';
    els.loginCode.value = '';
    els.adminEmail.value = '';
    els.emailChip.textContent = '';
    els.verifyEmail.textContent = '';
    els.gate.style.display = 'none';
    els.dashboard.style.display = '';
    els.accountWrap.style.display = '';
    loadAll();
  }

  async function request(path, opts) {
    opts = opts || {};
    var response = await fetch(path, Object.assign({}, opts, {
      credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {}
    }));
    var body = await response.json().catch(function () { return null; });
    if (!response.ok) {
      var error = new Error((body && body.error) || ('Request failed: ' + response.status));
      error.status = response.status;
      throw error;
    }
    if (body === null && response.status !== 204) throw new Error('Invalid server response. Open the dashboard through the Evora backend.');
    return body;
  }

  function staleError() { return Object.assign(new Error('Request no longer applies.'), { stale: true }); }

  async function api(path, opts) {
    var version = sessionVersion;
    if (loggingOut) throw staleError();
    try {
      var result = await request(path, opts);
      if (version !== sessionVersion || loggingOut) throw staleError();
      return result;
    } catch (err) {
      if (version !== sessionVersion || loggingOut) throw staleError();
      if (err.status === 401) showGate(err.message || 'Session expired — please sign in again.');
      throw err;
    }
  }

  async function refreshIdentity() {
    if (!identity || loggingOut) throw staleError();
    applyIdentity(await api('/api/admin/me'));
  }

  function reportError(err) {
    if (err.stale || err.status === 401) return;
    toast(err.message || 'Could not reach the server. Please try again.', 'error');
    if (err.status === 403 && identity) refreshIdentity().catch(function (error) {
      if (!error.stale && error.status !== 401) toast(error.message, 'error');
    });
  }

  els.emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (authBusy || !els.emailForm.reportValidity()) return;
    var email = els.adminEmail.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formError(els.emailErr, 'Enter a valid email address.');
      return;
    }
    pendingEmail = email;
    showGateStep(2);
    els.apiKey.focus();
  });

  function restartLogin() {
    if (authBusy) return;
    pendingEmail = '';
    els.apiKey.value = '';
    els.loginCode.value = '';
    showGateStep(1);
    els.adminEmail.focus();
  }
  els.changeEmail.addEventListener('click', restartLogin);
  els.restartLogin.addEventListener('click', restartLogin);

  els.loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (authBusy || !pendingEmail || !els.loginForm.reportValidity()) return;
    setAuthBusy(true);
    formError(els.loginErr, '');
    var operation = request('/api/admin/login', {
      method: 'POST', body: JSON.stringify({ email: pendingEmail, key: els.apiKey.value })
    });
    els.apiKey.value = '';
    try {
      await operation;
      showGateStep(3);
    } catch (err) {
      formError(els.loginErr, err.message);
    } finally {
      setAuthBusy(false);
      if (els.verifyForm.style.display !== 'none') els.loginCode.focus();
      else els.apiKey.focus();
    }
  });

  els.verifyForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (authBusy || !pendingEmail || !els.verifyForm.reportValidity()) return;
    setAuthBusy(true);
    formError(els.verifyErr, '');
    try {
      var member = await request('/api/admin/verify', {
        method: 'POST', body: JSON.stringify({ email: pendingEmail, code: els.loginCode.value.trim(), remember: els.rememberMe.checked })
      });
      enterDashboard(member);
    } catch (err) {
      formError(els.verifyErr, err.message);
    } finally {
      els.loginCode.value = '';
      setAuthBusy(false);
    }
  });

  els.accountBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    els.accountMenu.hidden = !els.accountMenu.hidden;
    els.accountBtn.setAttribute('aria-expanded', String(!els.accountMenu.hidden));
  });
  document.addEventListener('click', function () {
    els.accountMenu.hidden = true;
    els.accountBtn.setAttribute('aria-expanded', 'false');
  });
  els.logoutBtn.addEventListener('click', async function () {
    if (loggingOut) return;
    loggingOut = true;
    sessionVersion++;
    clearCachedRows();
    els.logoutBtn.disabled = true;
    try {
      await request('/api/admin/logout', { method: 'POST' });
      showGate();
    } catch (err) {
      if (err.status === 401) showGate();
      else toast('Could not sign out. Please try again. ' + err.message, 'error');
    } finally {
      loggingOut = false;
      els.logoutBtn.disabled = false;
      if (identity) loadAll();
    }
  });

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
    if (canEdit()) {
      html += '<div class="stat"><div class="label">Total orders</div><div class="value">' +
              escapeHtml(o.total || 0) + '</div><div class="sub">all time</div></div>';
      html += '<div class="stat revenue"><div class="label">Revenue</div><div class="value">' +
              formatMoney(o.revenue || 0) + '</div><div class="sub">excl. cancelled</div></div>';
    }
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
  function renderOrders() {
    if (!identity) return;
    var editable = canEdit();
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
      els.ordersBody.innerHTML = '<tr><td colspan="' + (editable ? 6 : 4) + '" class="empty">No orders match.</td></tr>';
      return;
    }

    var html = rows.map(function (o) {
      var items = (o.items || []).map(function (it) {
        return '<span class="item-line">' + escapeHtml(it.qty) + '× ' + escapeHtml(it.name) + '</span>';
      }).join('');
      var c = o.customer || {};
      return '<tr data-id="' + escapeHtml(o.orderId) + '">' +
        '<td>' +
          '<div class="order-id">' + escapeHtml(o.orderId) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(formatDate(o.receivedAt)) + '</div>' +
        '</td>' +
        '<td>' +
          '<div class="customer-name">' + escapeHtml(c.name) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.email) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.phone) + '</div>' +
          (editable ? '<a class="reply-link" target="_blank" rel="noopener" href="' +
            escapeHtml(replyMailto(c.email, 'Your Evora order ' + o.orderId)) + '">Reply by email</a>' : '') +
        '</td>' +
        '<td class="items-cell">' + items + '</td>' +
        (editable ? '<td class="total">' + formatMoney(o.totals && o.totals.total) + '<br>' +
          '<span class="customer-meta">' + escapeHtml((o.payment && o.payment.methodLabel) || '') + '</span>' +
        '</td>' : '') +
        '<td>' + statusPill(o.status) + '</td>' +
        (editable ? '<td>' +
          '<div class="row-actions">' +
            '<select aria-label="Status for ' + escapeHtml(o.orderId) + '" data-id="' + escapeHtml(o.orderId) + '">' +
              ['received','preparing','out_for_delivery','delivered','cancelled'].map(function (s) {
                return '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' +
                       s.replace(/_/g, ' ') + '</option>';
              }).join('') +
            '</select>' +
            '<button type="button" data-save="' + escapeHtml(o.orderId) + '">Save</button>' +
          '</div>' +
        '</td>' : '') +
      '</tr>';
    }).join('');
    els.ordersBody.innerHTML = html;

    els.ordersBody.querySelectorAll('button[data-save]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!canEdit() || mutationCount || loggingOut) return;
        var id = btn.getAttribute('data-save');
        var sel = btn.closest('tr').querySelector('select');
        btn.disabled = true;
        sel.disabled = true;
        btn.textContent = 'Saving…';
        mutationCount++;
        dashboardRequest++;
        try {
          await api('/api/orders/' + encodeURIComponent(id) + '/status', {
            method: 'PATCH', body: JSON.stringify({ status: sel.value })
          });
          toast('Status updated for ' + id, 'success');
          await loadAll();
        } catch (err) {
          reportError(err);
        } finally {
          mutationCount--;
          btn.disabled = false;
          sel.disabled = false;
          btn.textContent = 'Save';
        }
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

    if (!canEdit() || !email) {
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
      var when = email.lastFailureAt ? ' (last failure ' + escapeHtml(formatDate(email.lastFailureAt)) + ')' : '';
      text.innerHTML = '<strong>' + escapeHtml(email.failed) + ' email' + (email.failed === 1 ? '' : 's') + ' could not be sent</strong>' + when +
        '. Some complaints or order confirmations were never delivered — check your inbox and send them again. ' +
        'Server said: <code>' + escapeHtml(email.lastError || 'unknown error') + '</code>';
      box.style.display = '';
      return;
    }

    box.style.display = 'none';
  }

  // -------- Contacts --------
  function renderContacts(contacts) {
    if (!identity) return;
    if (!contacts.length) {
      els.contactsBody.innerHTML = '<tr><td colspan="4" class="empty">No contact messages yet.</td></tr>';
      return;
    }
    var html = contacts.map(function (c) {
      return '<tr>' +
        '<td><div>' + escapeHtml(formatDate(c.receivedAt)) + '</div>' +
            '<div class="customer-meta">' + escapeHtml(c.contactId) + '</div></td>' +
        '<td>' +
          '<div class="customer-name">' + escapeHtml(c.name) + '</div>' +
          '<div class="customer-meta">' + escapeHtml(c.email) + '</div>' +
          (c.phone ? '<div class="customer-meta">' + escapeHtml(c.phone) + '</div>' : '') +
        '</td>' +
        '<td><strong>' + escapeHtml(contactSubjectLabel(c.subject)) + '</strong>' +
          (canEdit() ? '<a class="reply-link" target="_blank" rel="noopener" href="' +
            escapeHtml(replyMailto(c.email, 'Your Evora ' + contactSubjectLabel(c.subject) + ' (' + c.contactId + ')')) + '">Reply by email</a>' : '') + '</td>' +
        '<td><div style="white-space:pre-wrap; max-width:520px;">' + escapeHtml(c.message) + '</div></td>' +
      '</tr>';
    }).join('');
    els.contactsBody.innerHTML = html;
  }

  // -------- Staff --------
  function renderStaff() {
    if (!identity) return;
    var owner = isOwner();
    els.staffBody.innerHTML = allStaff.map(function (member, index) {
      var immutable = member.role === 'owner' || member.email.toLowerCase() === 'evora.reply@gmail.com';
      var role = immutable ? 'owner' : member.role;
      return '<tr><td>' + escapeHtml(member.name) + '</td><td>' + escapeHtml(member.email) + '</td>' +
        '<td><span class="role-pill role-' + escapeHtml(role) + '">' + escapeHtml(role) + '</span></td>' +
        (owner ? '<td>' + (immutable ? 'Owner account' : '<div class="row-actions">' +
          '<select aria-label="Role for ' + escapeHtml(member.name || member.email) + '">' +
          ['admin', 'viewer'].map(function (value) {
            return '<option value="' + value + '"' + (value === role ? ' selected' : '') + '>' +
              (value === 'admin' ? 'Admin' : 'Viewer / staff') + '</option>';
          }).join('') + '</select><button type="button" data-staff-save="' + index + '">Save role</button>' +
          '<button type="button" data-staff-remove="' + index + '">Remove</button></div>') + '</td>' : '') + '</tr>';
    }).join('') || '<tr><td colspan="' + (owner ? 4 : 3) + '" class="empty">No staff members.</td></tr>';
  }

  async function changeStaff(method, email, body, controls, onSuccess) {
    if (!isOwner() || mutationCount || loggingOut) return;
    mutationCount++;
    dashboardRequest++;
    controls.forEach(function (control) { control.disabled = true; });
    try {
      await api('/api/admin/staff' + (email ? '/' + encodeURIComponent(email) : ''), {
        method: method, body: body ? JSON.stringify(body) : undefined
      });
      if (onSuccess) onSuccess();
      toast(method === 'DELETE' ? 'Staff member removed.' : 'Staff saved.', 'success');
      await loadAll();
    } catch (err) {
      reportError(err);
    } finally {
      mutationCount--;
      controls.forEach(function (control) { control.disabled = false; });
    }
  }

  els.staffForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!els.staffForm.reportValidity()) return;
    var name = els.staffName.value.trim();
    if (!name) { toast('Enter a name.', 'error'); return; }
    changeStaff('POST', '', {
      name: name, email: els.staffEmail.value.trim().toLowerCase(), role: els.staffRole.value
    }, els.staffForm.querySelectorAll('input, select, button'), function () { els.staffForm.reset(); });
  });

  els.staffBody.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-staff-save], button[data-staff-remove]');
    if (!button || button.disabled || !isOwner() || mutationCount) return;
    var removing = button.hasAttribute('data-staff-remove');
    var member = allStaff[Number(button.getAttribute(removing ? 'data-staff-remove' : 'data-staff-save'))];
    if (!member || member.role === 'owner' || member.email.toLowerCase() === 'evora.reply@gmail.com') return;
    if (removing && !window.confirm('Remove ' + (member.name || member.email) + ' (' + member.email + ') from staff? Their dashboard access will be revoked.')) return;
    var row = button.closest('tr');
    changeStaff(removing ? 'DELETE' : 'PATCH', member.email,
      removing ? null : { role: row.querySelector('select').value }, row.querySelectorAll('button, select'));
  });

  // -------- Products --------
  var imageSlots = [
    { input: els.productImageFile, url: els.productImage, preview: els.productImagePreview, ticket: 0 },
    { input: els.productHoverFile, url: els.productHoverImage, preview: els.productHoverPreview, ticket: 0 }
  ];

  function safeImageUrl(value) {
    if (typeof value !== 'string' || !value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return '';
    if (/^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(value)) {
      try {
        var url = new URL(value);
        return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? value : '';
      } catch (_) { return ''; }
    }
    if (!/^(?:\/?assets\/products\/|\/api\/product-images\/)/.test(value) || /[^A-Za-z0-9/_.-]/.test(value)) return '';
    return value.replace(/^\//, '').split('/').every(function (part) { return part && part !== '.' && part !== '..'; }) &&
      /\.(?:jpe?g|png|webp|gif|avif)$/i.test(value) ? value : '';
  }

  function previewImage(slot, source) {
    slot.preview.hidden = !source;
    if (source) slot.preview.src = source;
    else slot.preview.removeAttribute('src');
  }

  function validateImageFile(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.');
    if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('Each image must be nonempty and no larger than 2 MiB.');
  }

  function readImageFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Could not read the image. Please select it again.')); };
      reader.onabort = function () { reject(new Error('Image reading was cancelled.')); };
      reader.readAsDataURL(file);
    });
  }

  function setProductBusy(busy) {
    savingProduct = busy;
    els.productForm.querySelectorAll('input, select, textarea, button').forEach(function (control) { control.disabled = busy; });
    els.saveProduct.textContent = busy ? (editorMode === 'add' ? 'Adding…' : 'Saving…') : (editorMode === 'add' ? 'Add product' : 'Save changes');
  }

  function closeProductEditor() {
    editorVersion++;
    editorMode = 'edit';
    editingProductId = null;
    editingProductVersion = null;
    if (els.productDialog.open) els.productDialog.close();
    els.productForm.reset();
    els.productCategory.textContent = '';
    els.productError.textContent = '';
    els.productIdText.textContent = '';
    els.productEditorTitle.textContent = 'Edit product';
    els.productImage.required = true;
    imageSlots.forEach(function (slot) { slot.ticket++; previewImage(slot, ''); });
    setProductBusy(false);
  }

  function renderProducts() {
    if (!canEdit()) { els.productsBody.textContent = ''; return; }
    var search = els.productSearch.value.trim().toLowerCase();
    var rows = allProducts.filter(function (item) {
      return [item.id, item.name, item.category, item.categoryLabel, item.description].join(' ').toLowerCase().includes(search);
    });
    els.productsBody.innerHTML = rows.map(function (item) {
      var image = safeImageUrl(item.image);
      var category = categories.find(function (entry) { return entry.id === item.category; });
      return '<tr><td>' + (image ? '<img class="product-thumb" loading="lazy" src="' + escapeHtml(image) + '" alt="' + escapeHtml(item.name) + '">' : '—') + '</td>' +
        '<td><div class="customer-name">' + escapeHtml(item.name) + '</div><div class="customer-meta">' + escapeHtml(item.id) + '</div></td>' +
        '<td>' + escapeHtml(category ? category.label : item.category) + '</td><td class="total">' + formatMoney(item.price) +
        (Number.isSafeInteger(item.originalPrice) && item.originalPrice > item.price ? '<span class="price-original">' + formatMoney(item.originalPrice) + '</span>' : '') + '</td>' +
        '<td>' + (item.available ? 'Visible' : 'Hidden') + '</td><td><div class="row-actions"><button type="button" data-product="' +
        escapeHtml(item.id) + '">Edit</button></div></td></tr>';
    }).join('') || '<tr><td colspan="6" class="empty">No products match.</td></tr>';
  }

  function openProductEditor(id) {
    if (!canEdit() || mutationCount || loggingOut) return;
    var item = allProducts.find(function (product) { return product.id === id; });
    if (!item) return;
    closeProductEditor();
    editingProductId = item.id;
    editingProductVersion = item.version;
    els.productEditorTitle.textContent = 'Edit ' + item.name;
    els.productIdText.textContent = 'Product ID: ' + item.id;
    els.productName.value = item.name || '';
    els.productPrice.value = item.price;
    els.productOriginalPrice.value = Number.isSafeInteger(item.originalPrice) ? item.originalPrice : '';
    els.productCategory.innerHTML = categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + '</option>';
    }).join('');
    els.productCategory.value = item.category;
    els.productDescription.value = item.description || '';
    els.productImage.value = item.image || '';
    els.productHoverImage.value = item.hoverImage || '';
    els.productAvailable.checked = !!item.available;
    imageSlots.forEach(function (slot) { previewImage(slot, safeImageUrl(slot.url.value)); });
    els.productDialog.showModal();
    els.productName.focus();
  }

  function openAddProduct() {
    if (!canEdit() || mutationCount || loggingOut) return;
    closeProductEditor();
    editorMode = 'add';
    els.productEditorTitle.textContent = 'Add product';
    els.productIdText.textContent = 'The product link is generated from the name automatically. It appears on the storefront as soon as you save.';
    els.productCategory.innerHTML = categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.label) + '</option>';
    }).join('');
    els.productAvailable.checked = true;
    setProductBusy(false);
    els.productDialog.showModal();
    els.productName.focus();
  }

  imageSlots.forEach(function (slot) {
    slot.preview.addEventListener('error', function () { slot.preview.hidden = true; });
    slot.url.addEventListener('input', function () {
      slot.ticket++;
      slot.input.value = '';
      els.productImage.required = !els.productImageFile.files.length;
      previewImage(slot, safeImageUrl(slot.url.value.trim()));
    });
    slot.input.addEventListener('change', async function () {
      var ticket = ++slot.ticket;
      var editor = editorVersion;
      var file = slot.input.files[0];
      els.productError.textContent = '';
      els.productImage.required = !els.productImageFile.files.length;
      if (!file) { previewImage(slot, safeImageUrl(slot.url.value.trim())); return; }
      try {
        validateImageFile(file);
        var data = await readImageFile(file);
        if (editor === editorVersion && ticket === slot.ticket) previewImage(slot, data);
      } catch (err) {
        if (editor !== editorVersion || ticket !== slot.ticket) return;
        slot.input.value = '';
        els.productImage.required = !els.productImageFile.files.length;
        previewImage(slot, safeImageUrl(slot.url.value.trim()));
        els.productError.textContent = err.message;
      }
    });
  });

  els.productsBody.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-product]');
    if (button) openProductEditor(button.getAttribute('data-product'));
  });
  els.addProduct.addEventListener('click', openAddProduct);
  els.cancelProduct.addEventListener('click', function () { if (!savingProduct) closeProductEditor(); });
  els.productDialog.addEventListener('cancel', function (event) {
    event.preventDefault();
    if (!savingProduct) closeProductEditor();
  });

  els.productForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!canEdit() || savingProduct || mutationCount || (editorMode !== 'add' && !editingProductId) || !els.productForm.reportValidity()) return;
    var adding = editorMode === 'add';
    var id = editingProductId;
    var editor = editorVersion;
    var version = sessionVersion;
    var originalRaw = els.productOriginalPrice.value.trim();
    var payload = {
      name: els.productName.value.trim(), price: Number(els.productPrice.value),
      originalPrice: originalRaw === '' ? null : Number(originalRaw), category: els.productCategory.value,
      description: els.productDescription.value, image: els.productImage.value.trim(),
      hoverImage: els.productHoverImage.value.trim(), available: els.productAvailable.checked
    };
    if (!adding) payload.version = editingProductVersion;
    els.productError.textContent = '';
    try {
      if (!payload.name) throw new Error('Enter a product name.');
      if (!Number.isSafeInteger(payload.price) || payload.price < 1 || payload.price > 1000000) throw new Error('Selling price must be a whole number between 1 and 1000000.');
      if (payload.originalPrice !== null && (!Number.isSafeInteger(payload.originalPrice) || payload.originalPrice < payload.price || payload.originalPrice > 1000000)) throw new Error('Original price must be a whole number at least the selling price (max 1000000).');
      imageSlots.forEach(function (slot, index) {
        var file = slot.input.files[0];
        if (file) validateImageFile(file);
        else if ((index === 0 || slot.url.value.trim()) && !safeImageUrl(slot.url.value.trim())) {
          throw new Error('Use a valid product image path or HTTPS URL.');
        }
      });
    } catch (err) { els.productError.textContent = err.message; return; }
    function ensureCurrentEditor() {
      if (editor !== editorVersion || version !== sessionVersion || !canEdit() || loggingOut) throw staleError();
    }
    setProductBusy(true);
    mutationCount++;
    productRequest++;
    try {
      for (var index = 0; index < imageSlots.length; index++) {
        var slot = imageSlots[index];
        var file = slot.input.files[0];
        if (!file) continue;
        var data = await readImageFile(file);
        ensureCurrentEditor();
        var uploaded = await api('/api/admin/product-images', {
          method: 'POST', body: JSON.stringify({ data: data.slice(data.indexOf(',') + 1), contentType: file.type })
        });
        ensureCurrentEditor();
        if (!uploaded || !safeImageUrl(uploaded.url)) throw new Error('The upload returned an invalid image URL. Please try again.');
        slot.url.value = uploaded.url;
        slot.input.value = '';
        slot.ticket++;
        previewImage(slot, uploaded.url);
        els.productImage.required = !els.productImageFile.files.length;
      }
      ensureCurrentEditor();
      payload.image = els.productImage.value.trim();
      payload.hoverImage = els.productHoverImage.value.trim();
      var saved = adding
        ? await api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
        : await api('/api/admin/products/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(payload) });
      ensureCurrentEditor();
      if (!saved || !saved.id || (!adding && saved.id !== id)) throw new Error('The server returned an unexpected product. Refresh before trying again.');
      productRequest++;
      if (adding) {
        allProducts.push(saved);
        els.productSearch.value = '';
      } else {
        allProducts = allProducts.map(function (item) { return item.id === id ? saved : item; });
      }
      renderProducts();
      closeProductEditor();
      toast(adding ? 'Product added. It appears on the storefront on its next reload.' : 'Product saved. Changes appear on the next storefront reload.', 'success');
    } catch (err) {
      if (editor === editorVersion && version === sessionVersion && !err.stale && err.status !== 401) els.productError.textContent = err.message;
      if (err.status === 403) reportError(err);
    } finally {
      mutationCount--;
      if (editor === editorVersion) setProductBusy(false);
    }
  });

  // -------- Load everything --------
  function isEditing() {
    var active = document.activeElement;
    return els.productDialog.open || !!(active && active.closest && active.closest('input, select, textarea, [contenteditable="true"]'));
  }

  async function loadProducts(checkIdentity, automatic) {
    if (!identity || loggingOut) return;
    loadingCount++;
    var ticket;
    try {
      if (checkIdentity) await refreshIdentity();
      if (!canEdit()) return;
      ticket = ++productRequest;
      var version = sessionVersion;
      var result = await api('/api/admin/products');
      if (version !== sessionVersion || ticket !== productRequest || !canEdit() || (automatic && isEditing())) return;
      if (!result || !Array.isArray(result.items) || !Array.isArray(result.categories)) throw new Error('Invalid product list returned by the server.');
      allProducts = result.items;
      categories = result.categories;
      renderProducts();
    } catch (err) {
      if (ticket === undefined || ticket === productRequest) reportError(err);
    } finally { loadingCount--; }
  }

  // -------- Site Content (Changes tab) --------
  async function loadSiteContent(checkIdentity) {
    if (!identity || loggingOut) return;
    try {
      if (checkIdentity) await refreshIdentity();
      if (!canEdit()) return;
      var rows = await api('/api/site-content');
      siteContent = {};
      siteContentVersion = 0;

      if (Array.isArray(rows)) {
        rows.forEach(function (row) {
          siteContent[row.key] = row.data;
        });
      }

      var carousel = siteContent['carousel'] || [];
      renderCarouselRows(Array.isArray(carousel) ? carousel : []);

      var story = siteContent['our-story'] || {};
      els.storyEyebrow.value = story.eyebrow || '';
      els.storyTitle.value = story.title || '';
      els.storyEmphasis.value = story.emphasis || '';
      els.storyDesc.value = story.description || '';
      els.storyPoints.value = Array.isArray(story.points) ? story.points.join('\n') : '';
      var b1 = (story.buttons && story.buttons[0]) || {};
      var b2 = (story.buttons && story.buttons[1]) || {};
      els.storyBtn1Label.value = b1.label || '';
      els.storyBtn1Href.value = b1.href || '';
      els.storyBtn2Label.value = b2.label || '';
      els.storyBtn2Href.value = b2.href || '';

      var footer = siteContent['footer'] || {};
      els.footerTagline.value = footer.tagline || '';
      els.footerContactHeading.value = footer.contactHeading || '';
      els.footerPhone.value = footer.phone || '';
      els.footerPhoneHref.value = footer.phoneHref || '';
      els.footerAddress.value = footer.address || '';
      els.footerFollowHeading.value = footer.followHeading || '';
      els.footerFbHref.value = footer.facebookHref || '';
      els.footerIgHref.value = footer.instagramHref || '';
      els.footerHelpHeading.value = footer.helpHeading || '';
      renderFooterLinks(Array.isArray(footer.helpLinks) ? footer.helpLinks : []);
      els.footerPoweredText.value = footer.poweredText || '';
      els.footerPoweredHref.value = footer.poweredHref || '';
      renderFooterBottomLinks(Array.isArray(footer.bottomLinks) ? footer.bottomLinks : []);

      var maxVer = 1;
      rows.forEach(function (r) {
        if (r.version && r.version > maxVer) maxVer = r.version;
      });
      siteContentVersion = maxVer;
      els.changesVersion.textContent = 'Version: ' + siteContentVersion;
      els.changesError.textContent = '';
    } catch (err) {
      reportError(err);
    }
  }

  function renderCarouselRows(slides) {
    els.carouselRows.innerHTML = '';
    slides.forEach(function (slide, idx) {
      var div = document.createElement('div');
      div.className = 'changes-row';
      div.style.cssText = 'flex-direction:column; background:var(--bg-sub, #f9fafb); padding:12px; border-radius:6px; margin-bottom:8px; gap:8px;';
      div.innerHTML =
        '<div style="display:flex; justify-content:space-between; align-items:center;"><strong>Slide ' + (idx + 1) + '</strong><button type="button" class="ghost text-danger remove-slide" style="padding:2px 6px;">Remove</button></div>' +
        '<div style="display:flex; gap:8px;"><label style="flex:1;">Image URL<input type="text" class="slide-image" value="' + escapeHtml(slide.image || '') + '" style="width:100%;"></label>' +
        '<label style="flex:1;">Badge<input type="text" class="slide-badge" value="' + escapeHtml(slide.badge || '') + '" style="width:100%;"></label></div>' +
        '<div style="display:flex; gap:8px;"><label style="flex:1;">Title<input type="text" class="slide-title" value="' + escapeHtml(slide.title || '') + '" style="width:100%;"></label>' +
        '<label style="flex:1;">Subtitle<input type="text" class="slide-subtitle" value="' + escapeHtml(slide.subtitle || '') + '" style="width:100%;"></label></div>' +
        '<div style="display:flex; gap:8px;"><label style="flex:1;">Button Label<input type="text" class="slide-btnlabel" value="' + escapeHtml(slide.buttonLabel || '') + '" style="width:100%;"></label>' +
        '<label style="flex:1;">Button URL<input type="text" class="slide-btnhref" value="' + escapeHtml(slide.buttonHref || '') + '" style="width:100%;"></label></div>';

      div.querySelector('.remove-slide').addEventListener('click', function () {
        div.remove();
      });
      els.carouselRows.appendChild(div);
    });
  }

  function renderFooterLinks(links) {
    els.footerLinks.innerHTML = '';
    links.forEach(function (link, idx) {
      var div = document.createElement('div');
      div.className = 'changes-row';
      div.style.cssText = 'gap:8px; align-items:center; margin-bottom:6px;';
      div.innerHTML =
        '<input type="text" class="footer-link-label" placeholder="Label" value="' + escapeHtml(link.label || '') + '" style="flex:1;">' +
        '<input type="text" class="footer-link-href" placeholder="URL" value="' + escapeHtml(link.href || '') + '" style="flex:1;">' +
        '<button type="button" class="ghost text-danger remove-footer-link" style="padding:4px 8px;">✕</button>';
      div.querySelector('.remove-footer-link').addEventListener('click', function () { div.remove(); });
      els.footerLinks.appendChild(div);
    });
  }

  function renderFooterBottomLinks(links) {
    els.footerBottomLinks.innerHTML = '';
    links.forEach(function (link, idx) {
      var div = document.createElement('div');
      div.className = 'changes-row';
      div.style.cssText = 'gap:8px; align-items:center; margin-bottom:6px;';
      div.innerHTML =
        '<input type="text" class="footer-bottom-label" placeholder="Label" value="' + escapeHtml(link.label || '') + '" style="flex:1;">' +
        '<input type="text" class="footer-bottom-href" placeholder="URL" value="' + escapeHtml(link.href || '') + '" style="flex:1;">' +
        '<button type="button" class="ghost text-danger remove-footer-bottom" style="padding:4px 8px;">✕</button>';
      div.querySelector('.remove-footer-bottom').addEventListener('click', function () { div.remove(); });
      els.footerBottomLinks.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  if (els.addCarouselSlide) {
    els.addCarouselSlide.addEventListener('click', function () {
      var slides = [];
      els.carouselRows.querySelectorAll('.changes-row').forEach(function (row) {
        slides.push({
          image: row.querySelector('.slide-image').value,
          badge: row.querySelector('.slide-badge').value,
          title: row.querySelector('.slide-title').value,
          subtitle: row.querySelector('.slide-subtitle').value,
          buttonLabel: row.querySelector('.slide-btnlabel').value,
          buttonHref: row.querySelector('.slide-btnhref').value
        });
      });
      slides.push({ image: '', badge: '', title: '', subtitle: '', buttonLabel: '', buttonHref: '' });
      renderCarouselRows(slides);
    });
  }

  if (els.addFooterLink) {
    els.addFooterLink.addEventListener('click', function () {
      var links = [];
      els.footerLinks.querySelectorAll('.changes-row').forEach(function (row) {
        links.push({
          label: row.querySelector('.footer-link-label').value,
          href: row.querySelector('.footer-link-href').value
        });
      });
      links.push({ label: '', href: '' });
      renderFooterLinks(links);
    });
  }

  if (els.addFooterBottomLink) {
    els.addFooterBottomLink.addEventListener('click', function () {
      var links = [];
      els.footerBottomLinks.querySelectorAll('.changes-row').forEach(function (row) {
        links.push({
          label: row.querySelector('.footer-bottom-label').value,
          href: row.querySelector('.footer-bottom-href').value
        });
      });
      links.push({ label: '', href: '' });
      renderFooterBottomLinks(links);
    });
  }

  if (els.changesRefresh) {
    els.changesRefresh.addEventListener('click', function () {
      loadSiteContent(true);
    });
  }

  if (els.saveChanges) {
    els.saveChanges.addEventListener('click', async function () {
      if (!canEdit()) return;
      els.changesError.textContent = '';
      els.saveChanges.textContent = 'Saving…';
      els.saveChanges.disabled = true;

      try {
        var carouselSlides = [];
        els.carouselRows.querySelectorAll('div').forEach(function (row) {
          var img = row.querySelector('.slide-image');
          if (img) {
            carouselSlides.push({
              image: img.value,
              badge: row.querySelector('.slide-badge').value,
              title: row.querySelector('.slide-title').value,
              subtitle: row.querySelector('.slide-subtitle').value,
              buttonLabel: row.querySelector('.slide-btnlabel').value,
              buttonHref: row.querySelector('.slide-btnhref').value
            });
          }
        });

        var storyData = {
          eyebrow: els.storyEyebrow.value,
          title: els.storyTitle.value,
          emphasis: els.storyEmphasis.value,
          description: els.storyDesc.value,
          points: els.storyPoints.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
          buttons: [
            { label: els.storyBtn1Label.value, href: els.storyBtn1Href.value },
            { label: els.storyBtn2Label.value, href: els.storyBtn2Href.value }
          ]
        };

        var footerHelpLinks = [];
        els.footerLinks.querySelectorAll('.changes-row').forEach(function (row) {
          var lbl = row.querySelector('.footer-link-label');
          if (lbl) {
            footerHelpLinks.push({ label: lbl.value, href: row.querySelector('.footer-link-href').value });
          }
        });

        var footerBottomLinks = [];
        els.footerBottomLinks.querySelectorAll('.changes-row').forEach(function (row) {
          var lbl = row.querySelector('.footer-bottom-label');
          if (lbl) {
            footerBottomLinks.push({ label: lbl.value, href: row.querySelector('.footer-bottom-href').value });
          }
        });

        var footerData = {
          tagline: els.footerTagline.value,
          contactHeading: els.footerContactHeading.value,
          phone: els.footerPhone.value,
          phoneHref: els.footerPhoneHref.value,
          address: els.footerAddress.value,
          followHeading: els.footerFollowHeading.value,
          facebookHref: els.footerFbHref.value,
          instagramHref: els.footerIgHref.value,
          helpHeading: els.footerHelpHeading.value,
          helpLinks: footerHelpLinks,
          poweredText: els.footerPoweredText.value,
          poweredHref: els.footerPoweredHref.value,
          bottomLinks: footerBottomLinks
        };

        var keysToSave = [
          { key: 'carousel', data: carouselSlides },
          { key: 'our-story', data: storyData },
          { key: 'footer', data: footerData }
        ];

        for (var i = 0; i < keysToSave.length; i++) {
          var item = keysToSave[i];
          var existingVersion = siteContentVersion || 1;
          try {
            await api('/api/site-content/' + item.key, {
              method: 'PATCH',
              body: {
                version: existingVersion,
                data: item.data
              }
            });
          } catch (err) {
            if (err.status === 404) {
              await api('/api/site-content', {
                method: 'POST',
                body: {
                  key: item.key,
                  version: 1,
                  data: item.data
                }
              });
            } else {
              throw err;
            }
          }
        }

        toast('Changes saved successfully!', 'success');
        await loadSiteContent(true);
      } catch (err) {
        els.changesError.textContent = err.message || 'Failed to save changes.';
      } finally {
        els.saveChanges.textContent = 'Save changes';
        els.saveChanges.disabled = false;
      }
    });
  }

  async function loadProducts(checkIdentity, automatic) {
    if (!identity || loggingOut) return;
    loadingCount++;
    var ticket;
    try {
      if (checkIdentity) await refreshIdentity();
      if (!canEdit()) return;
      ticket = ++productRequest;
      var version = sessionVersion;
      var result = await api('/api/admin/products');
      if (version !== sessionVersion || ticket !== productRequest || !canEdit() || (automatic && isEditing())) return;
      if (!result || !Array.isArray(result.items) || !Array.isArray(result.categories)) throw new Error('Invalid product list returned by the server.');
      allProducts = result.items;
      categories = result.categories;
      renderProducts();
    } catch (err) {
      if (ticket === undefined || ticket === productRequest) reportError(err);
    } finally { loadingCount--; }
  }

  async function loadAll(automatic) {
    if (!identity || loggingOut) return;
    loadingCount++;
    var ticket;
    try {
      await refreshIdentity();
      ticket = ++dashboardRequest;
      var version = sessionVersion;
      var results = await Promise.all([api('/api/stats'), api('/api/orders'), api('/api/contacts'), api('/api/admin/staff')]);
      if (version !== sessionVersion || ticket !== dashboardRequest || !identity || (automatic && isEditing())) return;
      lastStats = results[0];
      allOrders = results[1];
      allContacts = results[2];
      allStaff = results[3];
      renderStats(lastStats);
      renderOrders();
      renderContacts(allContacts);
      renderStaff();
      renderEmailStatus(lastStats.email);
      var newOrders = (lastStats.orders && lastStats.orders.byStatus && lastStats.orders.byStatus.received) || 0;
      els.ordersBadge.textContent = newOrders;
      els.ordersBadge.style.display = newOrders > 0 ? '' : 'none';
      var cTotal = (lastStats.contacts && lastStats.contacts.total) || allContacts.length;
      els.contactsBadge.textContent = cTotal;
      els.contactsBadge.style.display = cTotal > 0 ? '' : 'none';
      els.status.textContent = '● Live';
      els.status.style.color = '#34d399';
      if (activeTab === 'products' && canEdit() && !els.productDialog.open) await loadProducts(false, automatic);
    } catch (err) {
      if (err.stale || err.status === 401 || (ticket !== undefined && ticket !== dashboardRequest)) return;
      els.status.textContent = '● Error';
      els.status.style.color = '#fca5a5';
      reportError(err);
    } finally { loadingCount--; }
  }

  function switchTab(which) {
    if (!['orders', 'contacts', 'staff', 'products', 'changes'].includes(which) || (which === 'products' && !canEdit()) || (which === 'changes' && !canEdit())) return;
    activeTab = which;
    document.querySelectorAll('.tab').forEach(function (tab) {
      var selected = tab.getAttribute('data-tab') === which;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-pressed', String(selected));
    });
    ['orders', 'contacts', 'staff', 'products', 'changes'].forEach(function (name) {
      document.getElementById('panel-' + name).style.display = which === name ? '' : 'none';
    });
    if (which === 'changes') loadSiteContent(true);
  }

  els.statusFilter.addEventListener('change', renderOrders);
  els.searchInput.addEventListener('input', renderOrders);
  els.productSearch.addEventListener('input', renderProducts);
  els.refreshBtn.addEventListener('click', function () { if (!mutationCount) loadAll(); });
  els.staffRefresh.addEventListener('click', function () { if (!mutationCount) loadAll(); });
  els.productsRefresh.addEventListener('click', function () { if (!mutationCount) loadProducts(true); });
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      if (!identity || loggingOut || mutationCount) return;
      var which = tab.getAttribute('data-tab');
      switchTab(which);
      if (which === 'products') loadProducts(true);
      else if (which === 'staff') loadAll();
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

  setInterval(function () {
    if (!identity || loggingOut || loadingCount || mutationCount || isEditing()) return;
    loadAll(true);
  }, 15000);

  ['sessionStorage', 'localStorage'].forEach(function (name) {
    try {
      window[name].removeItem('evoraAdminSession');
      window[name].removeItem('kbAdminKey');
    } catch (_) { /* Storage may be unavailable in private browsing. */ }
  });
  showGate();
  setAuthBusy(true);
  request('/api/admin/me').then(function (member) {
    enterDashboard(member);
  }).catch(function (err) {
    showGate(err.status === 401 ? '' : err.message);
  }).finally(function () { setAuthBusy(false); });
})();
