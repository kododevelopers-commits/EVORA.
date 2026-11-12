// ============================================================================
// location-picker.js — Pakistan delivery location picker for checkout.
// ----------------------------------------------------------------------------
// City -> Area/Town/Sector (searchable, keyboard-driven) then free-text street
// and landmark. "Use my current location" fills it from the phone/laptop GPS,
// and a keyless Google Maps preview lets the customer confirm the pin.
//
// Works with NO API key and NO card by default:
//   * GPS            -> browser Geolocation API (free)
//   * reverse/forward-> OpenStreetMap Nominatim (free, no key)
//   * map preview    -> classic Google Maps embed (free, no key)
//   * open-in-maps   -> official Google Maps link (free, no key)
// If the owner later sets window.EVORA_GOOGLE_MAPS_KEY, Google Geocoding +
// Places Autocomplete light up automatically as a progressive enhancement.
//
// The chosen pin is woven into the hidden #co-address string so it survives the
// backend (which keeps only name/email/phone/address/area). No DB change needed.
// ============================================================================
(function (global) {
  'use strict';

  var DATA = global.EVORA_LOCATIONS || { country: 'Pakistan', regions: [], cities: [] };
  var GOOGLE_KEY = (global.EVORA_GOOGLE_MAPS_KEY || '').trim();
  var MAX_ADDRESS = 500;

  // ---- small helpers -------------------------------------------------------
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function regionName(id) {
    for (var i = 0; i < DATA.regions.length; i++) {
      if (DATA.regions[i].id === id) return DATA.regions[i].name;
    }
    return '';
  }

  function findCity(name) {
    var n = norm(name);
    if (!n) return null;
    for (var i = 0; i < DATA.cities.length; i++) {
      if (norm(DATA.cities[i].name) === n) return DATA.cities[i];
    }
    // loose contains match as a fallback (e.g. "Islamabad Capital" -> Islamabad)
    for (var j = 0; j < DATA.cities.length; j++) {
      var cn = norm(DATA.cities[j].name);
      if (cn && (cn.indexOf(n) === 0 || n.indexOf(cn) === 0)) return DATA.cities[j];
    }
    return null;
  }

  function bestArea(city, guess) {
    if (!city || !guess) return '';
    var n = norm(guess);
    if (!n) return '';
    var areas = city.areas || [];
    for (var i = 0; i < areas.length; i++) {
      if (norm(areas[i]) === n) return areas[i];
    }
    for (var j = 0; j < areas.length; j++) {
      var an = norm(areas[j]);
      if (an && (an.indexOf(n) !== -1 || n.indexOf(an) !== -1)) return areas[j];
    }
    return '';
  }

  // ---- searchable combobox -------------------------------------------------
  // A reusable, accessible typeahead. options: [{value,label,sub,group}]
  function Combobox(mount, cfg) {
    var listId = 'loc-list-' + Math.random().toString(36).slice(2, 9);
    var label = el('label', null, cfg.label);
    label.setAttribute('for', listId + '-input');

    var wrap = el('div', 'loc-combo');
    var input = el('input', 'loc-combo-input');
    input.type = 'text';
    input.id = listId + '-input';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.placeholder = cfg.placeholder || 'Search…';

    var arrow = el('span', 'loc-combo-arrow');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>';

    var list = el('ul', 'loc-combo-list');
    list.id = listId;
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    wrap.appendChild(input);
    wrap.appendChild(arrow);
    wrap.appendChild(list);
    mount.appendChild(label);
    mount.appendChild(wrap);

    var options = cfg.options || [];
    var filtered = [];
    var active = -1;
    var open = false;
    var value = '';

    function optionNodes() {
      return list.querySelectorAll('.loc-combo-option');
    }

    function close() {
      open = false;
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      wrap.classList.remove('is-open');
      active = -1;
    }

    function setActive(idx) {
      var nodes = optionNodes();
      if (!nodes.length) { active = -1; return; }
      if (idx < 0) idx = nodes.length - 1;
      if (idx >= nodes.length) idx = 0;
      active = idx;
      for (var i = 0; i < nodes.length; i++) {
        var on = i === idx;
        nodes[i].classList.toggle('is-active', on);
        nodes[i].setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          input.setAttribute('aria-activedescendant', nodes[i].id);
          var r = nodes[i].getBoundingClientRect();
          var lr = list.getBoundingClientRect();
          if (r.bottom > lr.bottom) list.scrollTop += r.bottom - lr.bottom;
          else if (r.top < lr.top) list.scrollTop -= lr.top - r.top;
        }
      }
    }

    function choose(opt) {
      value = opt.value;
      input.value = opt.custom ? opt.value : opt.label;
      close();
      wrap.classList.add('has-value');
      if (cfg.onSelect) cfg.onSelect(opt.value, opt);
    }

    function render(filterText) {
      var q = norm(filterText);
      list.textContent = '';
      filtered = [];

      var scored = [];
      options.forEach(function (o) {
        if (!q) { scored.push({ o: o, score: 0 }); return; }
        var label = norm(o.label);
        var sub = o.sub ? norm(o.sub) : '';
        var score = -1;
        if (label.indexOf(q) === 0) score = 0;
        else if (label.split(' ').some(function (w) { return w.indexOf(q) === 0; })) score = 1;
        else if (label.indexOf(q) !== -1) score = 2;
        else if (sub && sub.indexOf(q) !== -1) score = 3;
        if (score >= 0) scored.push({ o: o, score: score });
      });
      // Stable sort keeps dataset order within a rank; prefix matches win.
      if (q) scored.sort(function (a, b) { return a.score - b.score; });
      var matches = scored.map(function (m) { return m.o; });

      var exact = options.some(function (o) { return norm(o.label) === q; });
      var rows = matches.slice();
      if (cfg.allowCustom && filterText && filterText.trim() && !exact) {
        rows.push({ custom: true, value: filterText.trim(), label: filterText.trim() });
      }

      if (!rows.length) {
        var empty = el('li', 'loc-combo-empty', cfg.emptyText || 'No matches');
        list.appendChild(empty);
        filtered = [];
        return;
      }

      var showGroups = cfg.grouped && !q;
      var lastGroup = null;
      rows.forEach(function (o, i) {
        if (!o.custom && showGroups && o.group && o.group !== lastGroup) {
          lastGroup = o.group;
          var head = el('li', 'loc-combo-group', regionName(o.group) || o.group);
          head.setAttribute('role', 'presentation');
          list.appendChild(head);
        }
        var li = el('li', 'loc-combo-option');
        li.id = listId + '-opt-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        if (o.custom) {
          li.classList.add('is-custom');
          li.appendChild(el('span', 'loc-combo-custom-tag', 'Use'));
          li.appendChild(el('span', 'loc-combo-main', '“' + o.label + '”'));
        } else {
          li.appendChild(el('span', 'loc-combo-main', o.label));
          if (o.sub) li.appendChild(el('span', 'loc-combo-sub', o.sub));
        }
        li.addEventListener('mousedown', function (e) {
          e.preventDefault(); // keep input focus, avoid blur-close before click
          choose(o);
        });
        li.addEventListener('mouseenter', function () {
          var nodes = optionNodes();
          for (var k = 0; k < nodes.length; k++) if (nodes[k] === li) { setActive(k); break; }
        });
        list.appendChild(li);
        filtered.push(o);
      });
    }

    function openList() {
      render(input.value === value ? '' : input.value);
      list.hidden = false;
      open = true;
      input.setAttribute('aria-expanded', 'true');
      wrap.classList.add('is-open');
      setActive(0);
    }

    input.addEventListener('focus', function () { if (!open) openList(); });
    input.addEventListener('input', function () {
      wrap.classList.remove('has-value');
      if (!open) { list.hidden = false; open = true; input.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open'); }
      render(input.value);
      setActive(0);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) openList(); else setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!open) openList(); else setActive(active - 1); }
      else if (e.key === 'Enter') {
        if (open && active >= 0 && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
      } else if (e.key === 'Escape') { if (open) { e.preventDefault(); close(); } }
      else if (e.key === 'Tab') { if (open) close(); }
    });
    input.addEventListener('blur', function () {
      // delay so an option's mousedown can run first
      setTimeout(function () {
        if (document.activeElement === input) return;
        var text = input.value.trim();
        var committed = options.filter(function (o) { return o.value === value; })[0];
        var committedLabel = committed ? committed.label : value;
        if (value && (text === value || text === committedLabel)) { close(); return; }
        if (!text) {
          if (value) { value = ''; wrap.classList.remove('has-value'); if (cfg.onSelect) cfg.onSelect('', {}); }
          close();
          return;
        }
        var exact = options.filter(function (o) { return norm(o.label) === norm(text); })[0];
        if (exact) { choose(exact); return; }
        if (cfg.allowCustom) { choose({ custom: true, value: text, label: text }); return; }
        input.value = committedLabel || '';
        close();
      }, 120);
    });

    return {
      input: input,
      wrap: wrap,
      setOptions: function (opts) {
        options = opts || [];
        if (open) render(input.value);
      },
      setValue: function (val, labelText) {
        value = val || '';
        input.value = labelText != null ? labelText : (val || '');
        wrap.classList.toggle('has-value', !!value);
      },
      getValue: function () { return value; },
      clear: function () { value = ''; input.value = ''; wrap.classList.remove('has-value'); close(); },
      focus: function () { input.focus(); },
      close: close
    };
  }

  // ---- the picker ----------------------------------------------------------
  function buildPicker(root) {
    var state = {
      city: '', region: '', area: '', street: '', landmark: '',
      lat: null, lng: null, located: false, source: ''
    };

    root.innerHTML =
      '<div class="loc-picker">' +
        '<div class="loc-grid">' +
          '<div class="field loc-field" data-city></div>' +
          '<div class="field loc-field" data-area></div>' +
        '</div>' +
        '<div class="field loc-field">' +
          '<label for="loc-street">House / Street / Building</label>' +
          '<input id="loc-street" type="text" autocomplete="off" placeholder="e.g. House 12, Street 4, Askari Apartments">' +
        '</div>' +
        '<div class="field loc-field">' +
          '<label for="loc-landmark">Nearby landmark <span class="loc-optional">(optional)</span></label>' +
          '<input id="loc-landmark" type="text" autocomplete="off" placeholder="e.g. opposite Imtiaz Store">' +
        '</div>' +
        '<div class="loc-actions">' +
          '<button type="button" class="loc-btn loc-btn-gps" data-gps>' +
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/></svg>' +
            '<span>Use my current location</span>' +
          '</button>' +
          '<button type="button" class="loc-btn loc-btn-map" data-preview>' +
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="M9 3.5L3.5 5.8v14.7L9 18.2l6 2.3 5.5-2.3V3.5L15 5.8 9 3.5zM9 3.5v14.7M15 5.8v14.7"/></svg>' +
            '<span>Preview on map</span>' +
          '</button>' +
        '</div>' +
        '<p class="loc-status" data-status role="status" aria-live="polite" hidden></p>' +
        '<div class="loc-map" data-map hidden>' +
          '<div class="loc-map-head">' +
            '<span class="loc-chip" data-chip></span>' +
            '<a class="loc-open" data-open target="_blank" rel="noopener">Open in Google Maps' +
              '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M9 7h8v8"/></svg>' +
            '</a>' +
          '</div>' +
          '<div class="loc-map-frame">' +
            '<iframe data-frame title="Delivery location map" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '</div>' +
          '<p class="loc-map-hint">Drag the pin in Google Maps if it needs adjusting, then copy the link back — or just trust the address above.</p>' +
        '</div>' +
      '</div>';

    var cityMount = root.querySelector('[data-city]');
    var areaMount = root.querySelector('[data-area]');
    var streetInput = root.querySelector('#loc-street');
    var landmarkInput = root.querySelector('#loc-landmark');
    var gpsBtn = root.querySelector('[data-gps]');
    var previewBtn = root.querySelector('[data-preview]');
    var statusEl = root.querySelector('[data-status]');
    var mapBox = root.querySelector('[data-map]');
    var chipEl = root.querySelector('[data-chip]');
    var openLink = root.querySelector('[data-open]');
    var frame = root.querySelector('[data-frame]');

    var hiddenAddress = document.getElementById('co-address');
    var hiddenArea = document.getElementById('co-area');

    var regionOrder = {};
    DATA.regions.forEach(function (r, i) { regionOrder[r.id] = i; });
    var cityOptions = DATA.cities.slice().sort(function (a, b) {
      return (regionOrder[a.region] || 0) - (regionOrder[b.region] || 0);
    }).map(function (c) {
      return { value: c.name, label: c.name, sub: regionName(c.region), group: c.region };
    });

    var areaCombo = Combobox(areaMount, {
      label: 'Area / Town / Sector',
      placeholder: 'Choose a city first…',
      allowCustom: true,
      emptyText: 'Type your area name',
      options: [],
      onSelect: function (val) { state.area = val; sync(); }
    });
    areaCombo.input.disabled = true;

    var cityCombo = Combobox(cityMount, {
      label: 'City',
      placeholder: 'Search 100+ cities…',
      allowCustom: true,
      grouped: true,
      emptyText: 'No city found — type to add it',
      options: cityOptions,
      onSelect: function (val) { selectCity(val); }
    });

    function areaOptionsFor(city) {
      return (city && city.areas ? city.areas : []).map(function (a) {
        return { value: a, label: a };
      });
    }

    function selectCity(name, opts) {
      opts = opts || {};
      var city = findCity(name);
      state.city = city ? city.name : (name || '').trim();
      state.region = city ? city.region : '';
      cityCombo.setValue(state.city, state.city);
      areaCombo.setOptions(areaOptionsFor(city));
      areaCombo.input.disabled = !state.city;
      areaCombo.input.placeholder = !state.city ? 'Choose a city first…' : (city ? 'Search ' + state.city + ' areas…' : 'Type your area / town / sector');
      if (!opts.keepArea) {
        state.area = '';
        areaCombo.clear();
      }
      if (!opts.silent) sync();
    }

    // ---- status + map ------------------------------------------------------
    var statusTimer = null;
    function setStatus(msg, kind) {
      if (statusTimer) { clearTimeout(statusTimer); statusTimer = null; }
      if (!msg) { statusEl.hidden = true; statusEl.textContent = ''; statusEl.className = 'loc-status'; return; }
      statusEl.hidden = false;
      statusEl.textContent = msg;
      statusEl.className = 'loc-status is-' + (kind || 'info');
    }

    function showMap(lat, lng, chipText) {
      state.lat = lat; state.lng = lng;
      var q = lat.toFixed(6) + ',' + lng.toFixed(6);
      // Classic keyless embed — no API key, no billing account required.
      frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&hl=en&output=embed';
      openLink.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
      chipEl.textContent = chipText || 'Pin set';
      mapBox.hidden = false;
      sync();
    }

    // ---- compose + sync hidden fields -------------------------------------
    function composeAddress() {
      var parts = [];
      if (state.street) parts.push(state.street);
      if (state.landmark) parts.push(state.landmark);
      var line = parts.join(', ');
      if (state.lat != null && state.lng != null) {
        var link = 'https://www.google.com/maps?q=' + state.lat.toFixed(6) + ',' + state.lng.toFixed(6);
        line += (line ? ' ' : '') + '[Map: ' + link + ']';
      }
      if (line.length > MAX_ADDRESS) line = line.slice(0, MAX_ADDRESS);
      return line;
    }

    function composeArea() {
      if (state.area && state.city) return state.area + ', ' + state.city;
      return state.area || state.city || '';
    }

    function sync() {
      if (hiddenAddress) hiddenAddress.value = composeAddress();
      if (hiddenArea) hiddenArea.value = composeArea();
      root.dispatchEvent(new CustomEvent('evora:location-change', { bubbles: true, detail: getState() }));
    }

    streetInput.addEventListener('input', function () { state.street = streetInput.value.trim(); sync(); });
    landmarkInput.addEventListener('input', function () { state.landmark = landmarkInput.value.trim(); sync(); });

    // ---- reverse geocode (GPS -> address) ---------------------------------
    function applyReverseNominatim(addr, lat, lng) {
      var cityGuess = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      var areaGuess = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || addr.residential || '';
      var road = addr.road || addr.pedestrian || addr.footway || '';
      var house = addr.house_number || '';
      var street = (house ? house + ', ' : '') + road;

      var city = findCity(cityGuess);
      if (city) {
        selectCity(city.name, { keepArea: true, silent: true });
        var matched = bestArea(city, areaGuess);
        state.area = matched || areaGuess || '';
        areaCombo.setValue(state.area, state.area);
      } else if (cityGuess) {
        selectCity(cityGuess, { keepArea: true, silent: true });
        state.area = areaGuess || '';
        areaCombo.setValue(state.area, state.area);
      }
      if (street && !state.street) { state.street = street.trim(); streetInput.value = state.street; }
      state.located = true; state.source = 'gps';
      showMap(lat, lng, 'Located via GPS');
      setStatus('Location found. Check the city, area and street below, then adjust if needed.', 'success');
    }

    function applyReverseGoogle(result, lat, lng) {
      var comp = result.address_components || [];
      function pick(types) {
        for (var i = 0; i < comp.length; i++) {
          for (var t = 0; t < types.length; t++) {
            if (comp[i].types.indexOf(types[t]) !== -1) return comp[i].long_name;
          }
        }
        return '';
      }
      var cityGuess = pick(['locality', 'postal_town', 'administrative_area_level_2']);
      var areaGuess = pick(['sublocality', 'sublocality_level_1', 'neighborhood', 'administrative_area_level_3']);
      var street = (pick(['street_number']) + ' ' + pick(['route'])).trim();
      var city = findCity(cityGuess);
      if (city) {
        selectCity(city.name, { keepArea: true, silent: true });
        state.area = bestArea(city, areaGuess) || areaGuess || '';
        areaCombo.setValue(state.area, state.area);
      } else if (cityGuess) {
        selectCity(cityGuess, { keepArea: true, silent: true });
        state.area = areaGuess || '';
        areaCombo.setValue(state.area, state.area);
      }
      if (street && !state.street) { state.street = street; streetInput.value = street; }
      state.located = true; state.source = 'gps';
      showMap(lat, lng, 'Located via GPS');
      setStatus('Location found. Check the details below and adjust if needed.', 'success');
    }

    function reverseGeocode(lat, lng) {
      if (GOOGLE_KEY) {
        return fetch('https://maps.googleapis.com/maps/api/geocode/json?latlng=' + lat + ',' + lng + '&key=' + encodeURIComponent(GOOGLE_KEY))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.results && j.results[0]) applyReverseGoogle(j.results[0], lat, lng);
            else { showMap(lat, lng, 'Pin set'); setStatus('Pin set on the map. Please choose your city and area below.', 'warn'); }
          });
      }
      // Nominatim: free, no key. One request per click respects the usage policy.
      return fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lng + '&addressdetails=1&accept-language=en', {
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (j && j.address) applyReverseNominatim(j.address, lat, lng);
          else { showMap(lat, lng, 'Pin set'); setStatus('Pin set on the map. Please choose your city and area below.', 'warn'); }
        });
    }

    var busy = false;
    function setBusy(on, btn, label) {
      busy = on;
      gpsBtn.disabled = on; previewBtn.disabled = on;
      gpsBtn.classList.toggle('is-loading', on && btn === gpsBtn);
      previewBtn.classList.toggle('is-loading', on && btn === previewBtn);
      if (btn) {
        var span = btn.querySelector('span');
        if (on) { btn.dataset.label = span.textContent; span.textContent = label || 'Working…'; }
        else if (btn.dataset.label) { span.textContent = btn.dataset.label; }
      }
    }

    gpsBtn.addEventListener('click', function () {
      if (busy) return;
      if (!navigator.geolocation) {
        setStatus('This browser can’t share a location. Please pick your city and area manually.', 'warn');
        return;
      }
      if (global.location && global.location.protocol === 'file:') {
        setStatus('Location needs the site opened over http(s), not a local file. Pick your city manually for now.', 'warn');
        return;
      }
      setBusy(true, gpsBtn, 'Locating…');
      setStatus('Getting your location… allow the browser prompt if it appears.', 'info');
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lng = pos.coords.longitude;
        reverseGeocode(lat, lng)
          .catch(function () {
            showMap(lat, lng, 'Pin set');
            setStatus('We placed your pin, but couldn’t read the address. Please choose your city and area below.', 'warn');
          })
          .finally(function () { setBusy(false, gpsBtn); });
      }, function (err) {
        setBusy(false, gpsBtn);
        var msg = err && err.code === 1
          ? 'Location permission was denied. You can still pick your city and area manually.'
          : 'Couldn’t get your location. Please pick your city and area manually.';
        setStatus(msg, 'warn');
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });

    // ---- forward geocode (typed address -> pin) ---------------------------
    function forwardGeocode(query) {
      if (GOOGLE_KEY) {
        return fetch('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(query) + '&region=pk&key=' + encodeURIComponent(GOOGLE_KEY))
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (j && j.results && j.results[0]) {
              var loc = j.results[0].geometry.location;
              return { lat: loc.lat, lng: loc.lng };
            }
            return null;
          });
      }
      return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pk&accept-language=en&q=' + encodeURIComponent(query), {
        headers: { 'Accept': 'application/json' }
      })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (arr) {
          if (arr && arr[0]) return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
          return null;
        });
    }

    previewBtn.addEventListener('click', function () {
      if (busy) return;
      if (!state.city) { setStatus('Choose your city first, then preview it on the map.', 'warn'); cityCombo.focus(); return; }
      var detailed = [state.street, state.area, state.city, 'Pakistan'].filter(Boolean).join(', ');
      var broad = [state.area, state.city, 'Pakistan'].filter(Boolean).join(', ');
      setBusy(true, previewBtn, 'Searching…');
      setStatus('Looking up that address on the map…', 'info');
      forwardGeocode(detailed)
        .then(function (hit) { return hit || forwardGeocode(broad); })
        .then(function (hit) {
          if (hit && isFinite(hit.lat) && isFinite(hit.lng)) {
            state.located = true; state.source = 'map';
            showMap(hit.lat, hit.lng, 'Pin from address');
            setStatus('Here’s the approximate spot. Use “My current location” for an exact pin.', 'success');
          } else {
            setStatus('Couldn’t find that exact address on the map. Try “Use my current location”, or refine the area.', 'warn');
          }
        })
        .catch(function () { setStatus('Map lookup failed. Please check your connection or use “My current location”.', 'warn'); })
        .finally(function () { setBusy(false, previewBtn); });
    });

    // ---- optional Google Places Autocomplete on the street field ----------
    if (GOOGLE_KEY && global.google && global.google.maps && global.google.maps.places) {
      attachPlaces();
    } else if (GOOGLE_KEY) {
      var s = document.createElement('script');
      s.src = 'https://maps.googleapis.com/maps/api/js?libraries=places&key=' + encodeURIComponent(GOOGLE_KEY) + '&callback=__evoraPlacesReady';
      s.async = true;
      global.__evoraPlacesReady = attachPlaces;
      document.head.appendChild(s);
    }
    function attachPlaces() {
      try {
        var ac = new global.google.maps.places.Autocomplete(streetInput, {
          componentRestrictions: { country: 'pk' },
          fields: ['geometry', 'address_components', 'formatted_address']
        });
        ac.addListener('place_changed', function () {
          var place = ac.getPlace();
          if (!place || !place.geometry) return;
          var lat = place.geometry.location.lat(), lng = place.geometry.location.lng();
          state.street = streetInput.value.trim();
          state.located = true; state.source = 'places';
          showMap(lat, lng, 'Pin from Places');
          setStatus('Address set from Google Maps. Confirm your city and area below.', 'success');
        });
      } catch (e) { /* Places is a bonus; the keyless flow already works */ }
    }

    // ---- public API --------------------------------------------------------
    function getState() {
      return {
        city: state.city, region: state.region, area: state.area,
        street: state.street, landmark: state.landmark,
        lat: state.lat, lng: state.lng, located: state.located, source: state.source,
        address: composeAddress(), areaLabel: composeArea()
      };
    }

    function validate() {
      var errors = [];
      if (!state.city) errors.push('Please choose your city.');
      if (!state.area) errors.push('Please choose or type your area / town / sector.');
      if (!state.street) errors.push('Please enter your house / street details.');
      return { ok: errors.length === 0, errors: errors, message: errors[0] || '' };
    }

    function focusInvalid() {
      if (!state.city) cityCombo.focus();
      else if (!state.area) areaCombo.focus();
      else streetInput.focus();
    }

    global.EVORA_LOCATION = {
      getState: getState,
      validate: validate,
      focusInvalid: focusInvalid,
      sync: sync
    };

    sync();
  }

  function init() {
    var root = document.getElementById('evoraLocationPicker');
    if (root && !root.dataset.ready) {
      root.dataset.ready = '1';
      buildPicker(root);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);