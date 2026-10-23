document.addEventListener('DOMContentLoaded', function () {

  // ---------- Motion preference ----------
  // If the visitor has asked their OS for reduced motion, we skip carousel
  // autoplay and jump instantly instead of smooth-scrolling — animated,
  // self-advancing content can trigger motion sickness.
  var REDUCED_MOTION = !!(window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function scrollBehavior() {
    return REDUCED_MOTION ? 'auto' : 'smooth';
  }

  // ---------- Product cards rendered from catalog.js ----------
  // Every product grid on the site is generated from the one catalogue file,
  // so a price/name/image only ever exists in one place. Grids opt in with:
  //   data-products="all"             -> the whole catalogue
  //   data-products="slug-a,slug-b"   -> just those products, in that order
  function catalogItems() {
    return (typeof EVORA_CATALOG !== 'undefined' && EVORA_CATALOG.items) || [];
  }

  function catalogItemBySlug(slug) {
    var items = catalogItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === slug) return items[i];
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function productCardHtml(p) {
    return '<a href="product.html?slug=' + encodeURIComponent(p.id) + '" class="menu-card-link">' +
        '<div class="menu-card" data-category="' + escapeHtml(p.category) + '">' +
          '<div class="menu-img">' +
            '<img class="menu-emoji menu-img-front" loading="lazy" decoding="async" src="' +
              escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '">' +
            '<img class="menu-emoji menu-img-back" loading="lazy" decoding="async" aria-hidden="true" alt="" src="' +
              escapeHtml(p.hoverImage || p.image) + '">' +
          '</div>' +
          '<div class="menu-info">' +
            '<h3 class="menu-title">' + escapeHtml(p.name) + '</h3>' +
            '<div class="menu-bottom">' +
              '<span class="price">Rs. ' + Number(p.price).toLocaleString('en-US') + '</span>' +
              '<button class="add-btn" aria-label="Add to cart">+</button>' +
              '<div class="qty-control" style="display:none;">' +
                '<button class="qty-btn qty-minus" type="button" aria-label="Decrease quantity">&minus;</button>' +
                '<span class="qty-value">1</span>' +
                '<button class="qty-btn qty-plus" type="button" aria-label="Increase quantity">&plus;</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-products]'),
    function (grid) {
      var spec = grid.getAttribute('data-products');
      var items;
      if (spec === 'all') {
        items = catalogItems().filter(function (p) { return p.available !== false; });
      } else {
        items = spec.split(',')
          .map(function (slug) { return catalogItemBySlug(slug.trim()); })
          .filter(Boolean);
      }
      grid.innerHTML = items.map(productCardHtml).join('');
    }
  );

  // ---------- Categories slide-in panel ----------
  var categoriesBtn = document.getElementById('categoriesBtn');
  var categoriesPanel = document.getElementById('categoriesPanel');
  var categoriesPanelOverlay = document.getElementById('categoriesPanelOverlay');
  var categoriesPanelList = document.getElementById('categoriesPanelList');

  function openCategoriesPanel() {
    if (!categoriesPanel) return;
    categoriesPanel.classList.add('open');
    categoriesPanel.setAttribute('aria-hidden', 'false');
    if (categoriesPanelOverlay) categoriesPanelOverlay.classList.add('open');
    if (categoriesBtn) categoriesBtn.setAttribute('aria-expanded', 'true');
  }

  function closeCategoriesPanel() {
    if (!categoriesPanel) return;
    categoriesPanel.classList.remove('open');
    categoriesPanel.setAttribute('aria-hidden', 'true');
    if (categoriesPanelOverlay) categoriesPanelOverlay.classList.remove('open');
    if (categoriesBtn) categoriesBtn.setAttribute('aria-expanded', 'false');
  }

  // Populate the panel list from the catalogue, NOT from the homepage's
  // category bar. The bar only exists on index.html, so scraping it left the
  // panel empty on every other page (menu, product, contact, about, checkout).
  // The catalogue is loaded on every page, so the list is always complete.
  if (categoriesPanelList) {
    var categories = (typeof EVORA_CATALOG !== 'undefined' && EVORA_CATALOG.categories) || [];
    var panelLinks = [{ id: 'all', label: 'All Products' }].concat(categories);
    panelLinks.forEach(function (cat) {
      var item = document.createElement('a');
      item.href = 'menu.html?filter=' + encodeURIComponent(cat.id);
      item.className = 'categories-panel-link';
      item.textContent = cat.label;
      item.setAttribute('data-category', cat.id);
      categoriesPanelList.appendChild(item);
    });
  }

  if (categoriesBtn) {
    categoriesBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (categoriesPanel && categoriesPanel.classList.contains('open')) {
        closeCategoriesPanel();
      } else {
        openCategoriesPanel();
      }
    });
  }
  if (categoriesPanelOverlay) categoriesPanelOverlay.addEventListener('click', closeCategoriesPanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCategoriesPanel();
  });

  // ---------- Deals / category slider ----------
  var track = document.getElementById('dealsTrack');
  var prevBtn = document.getElementById('dealsPrev');
  var nextBtn = document.getElementById('dealsNext');

  function stepSize() {
    var card = track.querySelector('.deal-pill');
    var gap = 16;
    return card ? card.offsetWidth + gap : 240;
  }

  if (track && prevBtn && nextBtn) {
    prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -stepSize() * 2, behavior: scrollBehavior() });
    });
    nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: stepSize() * 2, behavior: scrollBehavior() });
    });
  }

  // ---------- Deal banner carousel (autoplay every 5s) ----------
  var carousel = document.getElementById('dealCarousel');
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-slide'));
    var dotsWrap = document.getElementById('carouselDots');
    var prevArrow = document.getElementById('carouselPrev');
    var nextArrow = document.getElementById('carouselNext');
    var current = 0;
    var intervalId = null;
    var AUTOPLAY_MS = 5000;

    slides.forEach(function (slide, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to deal ' + (i + 1));
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function () {
        goTo(i);
        restartAutoplay();
      });
      dotsWrap.appendChild(dot);
    });

    var dots = Array.prototype.slice.call(dotsWrap.children);

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function startAutoplay() {
      if (REDUCED_MOTION) return; // don't auto-advance when motion is reduced
      intervalId = window.setInterval(next, AUTOPLAY_MS);
    }
    function stopAutoplay() {
      if (intervalId) window.clearInterval(intervalId);
    }
    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    if (nextArrow) nextArrow.addEventListener('click', function () { next(); restartAutoplay(); });
    if (prevArrow) prevArrow.addEventListener('click', function () { prev(); restartAutoplay(); });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    // Touch swipe support for mobile
    var touchStartX = 0;
    var touchEndX = 0;
    carousel.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
      stopAutoplay();
    }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) { next(); } else { prev(); }
      }
      startAutoplay();
    }, { passive: true });

    startAutoplay();
  }

  // ---------- Search bar + menu category tabs ----------
  var searchForm = document.getElementById('menuSearchForm');
  var searchInput = document.getElementById('menuSearchInput');
  var menuGrid = document.getElementById('menuGrid');
  var menuNoResults = document.getElementById('menuNoResults');
  var menuFiltersBtn = document.getElementById('menuFiltersBtn');
  var menuFiltersPanel = document.getElementById('menuFiltersPanel');
  var menuFiltersPanelOverlay = document.getElementById('menuFiltersPanelOverlay');
  var menuFiltersActive = document.getElementById('menuFiltersActive');

  if (menuGrid) {
    // ----- Menu page: filters panel + live search, combined -----
    var filterOptions = Array.prototype.slice.call(document.querySelectorAll('.filter-option'));
    var cards = Array.prototype.slice.call(menuGrid.querySelectorAll('.menu-card'));

    // Populate category counts on the filter options
    filterOptions.forEach(function (opt) {
      var f = opt.dataset.filter;
      var countEl = opt.querySelector('.filter-option-count');
      if (!countEl) return;
      var n = f === 'all'
        ? cards.length
        : cards.filter(function (c) { return c.dataset.category === f; }).length;
      countEl.textContent = String(n);
    });

    var currentFilter = 'all';

    var applyMenuFilters = function () {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var visibleCount = 0;

      cards.forEach(function (card) {
        var matchesCategory = currentFilter === 'all' || card.dataset.category === currentFilter;
        var titleEl = card.querySelector('.menu-title');
        var descEl = card.querySelector('.menu-desc');
        var haystack = ((titleEl ? titleEl.textContent : '') + ' ' + (descEl ? descEl.textContent : '')).toLowerCase();
        var matchesQuery = query === '' || haystack.indexOf(query) !== -1;
        var show = matchesCategory && matchesQuery;
        // The grid item is the wrapping <a>, not the inner card. Hiding only
        // the card left empty cells behind, which made the grid look ragged.
        var gridItem = card.closest('.menu-card-link') || card;
        gridItem.style.display = show ? '' : 'none';
        if (show) visibleCount += 1;
      });

      if (menuNoResults) {
        menuNoResults.style.display = visibleCount === 0 ? '' : 'none';
      }
    };

    function openFiltersPanel() {
      if (!menuFiltersPanel) return;
      menuFiltersPanel.classList.add('open');
      menuFiltersPanel.setAttribute('aria-hidden', 'false');
      if (menuFiltersPanelOverlay) menuFiltersPanelOverlay.classList.add('open');
      if (menuFiltersBtn) menuFiltersBtn.setAttribute('aria-expanded', 'true');
    }

    function closeFiltersPanel() {
      if (!menuFiltersPanel) return;
      menuFiltersPanel.classList.remove('open');
      menuFiltersPanel.setAttribute('aria-hidden', 'true');
      if (menuFiltersPanelOverlay) menuFiltersPanelOverlay.classList.remove('open');
      if (menuFiltersBtn) menuFiltersBtn.setAttribute('aria-expanded', 'false');
    }

    filterOptions.forEach(function (opt) {
      opt.addEventListener('click', function () {
        filterOptions.forEach(function (o) { o.classList.remove('active'); });
        opt.classList.add('active');
        currentFilter = opt.dataset.filter;
        if (menuFiltersActive) {
          var label = opt.querySelector('.filter-option-label');
          menuFiltersActive.textContent = label ? label.textContent : 'All';
        }
        closeFiltersPanel();
        applyMenuFilters();
      });
    });

    if (menuFiltersBtn) {
      menuFiltersBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (menuFiltersPanel && menuFiltersPanel.classList.contains('open')) {
          closeFiltersPanel();
        } else {
          openFiltersPanel();
        }
      });
    }
    if (menuFiltersPanelOverlay) menuFiltersPanelOverlay.addEventListener('click', closeFiltersPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeFiltersPanel();
    });

    if (searchInput) {
      var urlParams = new URLSearchParams(window.location.search);
      var qParam = urlParams.get('q');
      if (qParam) searchInput.value = qParam;
      var filterParam = urlParams.get('filter');
      if (filterParam) {
        var f = filterParam.toLowerCase();
        var match = filterOptions.find(function (o) { return o.dataset.filter === f; });
        if (match) {
          filterOptions.forEach(function (o) { o.classList.remove('active'); });
          match.classList.add('active');
          currentFilter = f;
          var lbl = match.querySelector('.filter-option-label');
          if (menuFiltersActive && lbl) menuFiltersActive.textContent = lbl.textContent;
        }
      }
      searchInput.addEventListener('input', applyMenuFilters);
    }

    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
      });
    }

    applyMenuFilters();
  } else if (searchInput) {
    // ----- Other pages (e.g. homepage): animated placeholder, submit goes to the menu -----
    var searchSuggestions = [
      'Classic Crew Neck Tee...',
      'Floral Maxi Dress...',
      'Slim Fit Denim Jeans...',
      'Hooded Pullover Sweatshirt...',
      'Canvas Tote Bag...'
    ];
    var suggestionIndex = 0;
    window.setInterval(function () {
      if (document.activeElement === searchInput || searchInput.value) return;
      suggestionIndex = (suggestionIndex + 1) % searchSuggestions.length;
      searchInput.setAttribute('placeholder', 'Search for ' + searchSuggestions[suggestionIndex]);
    }, 2600);

    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var q = searchInput.value.trim();
        window.location.href = 'menu.html' + (q ? ('?q=' + encodeURIComponent(q)) : '');
      });
    }
  }

  // ---------- Contact form (now posts to /api/contact on the server) ----------
  var contactForm = document.getElementById('contactForm');
  var formStatus = document.getElementById('formStatus');
  if (contactForm && formStatus) {
    var contactSubmitBtn = contactForm.querySelector('button[type="submit"]');
    var originalBtnText = contactSubmitBtn ? contactSubmitBtn.textContent : '';
    var contactErrEl = document.getElementById('contactError');

    function showContactError(msg) {
      if (!contactErrEl) {
        // Fall back to the form status box if no dedicated error slot exists
        formStatus.textContent = msg;
        formStatus.classList.add('show', 'is-error');
        return;
      }
      contactErrEl.textContent = msg;
      contactErrEl.style.display = '';
    }
    function hideContactError() {
      if (!contactErrEl) {
        formStatus.classList.remove('is-error');
        return;
      }
      contactErrEl.style.display = 'none';
      contactErrEl.textContent = '';
    }

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideContactError();
      formStatus.classList.remove('show');

      var payload = {
        name: (document.getElementById('cf-name')    || {}).value || '',
        email: (document.getElementById('cf-email')  || {}).value || '',
        phone: (document.getElementById('cf-phone')  || {}).value || '',
        subject: (document.getElementById('cf-subject') || {}).value || 'general',
        message: (document.getElementById('cf-message') || {}).value || ''
      };

      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.textContent = 'Sending…';
      }

      EVORA_API.fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          if (!r.ok) {
            return r.json().catch(function () { return {}; }).then(function (body) {
              throw new Error(body.error || ('Server responded with ' + r.status));
            });
          }
          return r.json();
        })
        .then(function () {
          formStatus.classList.add('show');
          formStatus.classList.remove('is-error');
          formStatus.textContent = "Thanks! Your message has been received — we'll be in touch soon.";
          contactForm.reset();
          formStatus.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
        })
        .catch(function (err) {
          var msg = (err && err.message === 'backend-not-found')
            ? "The Evora backend isn't running, so we can't send your message yet. " +
              'Start it by double-clicking start-evora.cmd in the project folder, then try again.'
            : (err.message || "We couldn't send your message — please try again.");
          showContactError(msg);
        })
        .then(function () {
          if (contactSubmitBtn) {
            contactSubmitBtn.disabled = false;
            contactSubmitBtn.textContent = originalBtnText || 'Send Message';
          }
        });
    });
  }

  // ---------- Cart ----------
  // Migrate any old "karachibites_cart" data so users coming from the
  // previous version don't lose their bag.
  try {
    var oldCart = window.localStorage.getItem('karachibites_cart');
    if (oldCart && !window.localStorage.getItem('evora_cart')) {
      window.localStorage.setItem('evora_cart', oldCart);
      window.localStorage.removeItem('karachibites_cart');
    }
  } catch (e) { /* storage unavailable */ }

  var CART_STORAGE_KEY = 'evora_cart';

  function loadCart() {
    try {
      var raw = window.localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveCart(cartObj) {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartObj));
    } catch (e) {
      /* storage unavailable, ignore */
    }
  }

  function parsePrice(text) {
    var match = String(text).match(/[\d,]+(\.\d+)?/);
    if (!match) return 0;
    var n = parseFloat(match[0].replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function formatPrice(n) {
    return 'Rs. ' + Number(n).toLocaleString('en-US');
  }

  var cart = loadCart();

  // Maps a cart item's name to its thumbnail image. Built from catalog.js so
  // there is no second copy of the product list to fall out of sync.
  var PRODUCT_IMAGES = {};
  (function () {
    var items = (typeof EVORA_CATALOG !== 'undefined' && EVORA_CATALOG.items) || [];
    items.forEach(function (p) { PRODUCT_IMAGES[p.name] = p.image; });
  })();

  function productImage(name) {
    return PRODUCT_IMAGES[name] || 'assets/vecteezy_formal-men-s-sky-blue-check-shirt-on-white-background_28629202.JPG';
  }

  // Candidate items offered as cross-sell suggestions in the cart panel,
  // also derived from the catalogue.
  var UPSELL_ITEMS = [];
  (function () {
    var items = (typeof EVORA_CATALOG !== 'undefined' && EVORA_CATALOG.items) || [];
    items.forEach(function (p) {
      if (p.available !== false) UPSELL_ITEMS.push({ name: p.name, price: p.price });
    });
  })();

  function cartTotals() {
    var count = 0;
    var total = 0;
    Object.keys(cart).forEach(function (key) {
      count += cart[key].qty;
      total += cart[key].qty * cart[key].price;
    });
    return { count: count, total: total };
  }

  function renderCartBadge() {
    var totals = cartTotals();
    document.querySelectorAll('.cart-wrap .badge').forEach(function (b) {
      b.textContent = totals.count;
    });
  }

  function renderCartPanel() {
    var itemsWrap = document.getElementById('cartPanelItems');
    if (!itemsWrap) return;

    var keys = Object.keys(cart);
    var totals = cartTotals();

    if (keys.length === 0) {
      itemsWrap.innerHTML = '<div class="cp-empty">' +
        '<img src="assets/icon-cart.svg" alt="">' +
        '<p>Your bag is empty</p>' +
        '<a href="menu.html" class="btn btn-primary btn-sm">Shop Now</a>' +
        '</div>';
    } else {
      var html = '';
      keys.forEach(function (key) {
        var item = cart[key];
        html += '<div class="cp-item">' +
          '<img class="cp-item-img" src="' + productImage(item.name) + '" alt="' + item.name + '">' +
          '<div class="cp-item-info">' +
            '<div class="cp-item-name">' + item.name + '</div>' +
            '<div class="cp-item-price">' + formatPrice(item.price) + '</div>' +
          '</div>' +
          '<div class="cp-item-qty">' +
            '<button type="button" class="cp-minus" data-key="' + key + '" aria-label="Remove one ' + item.name + '">&minus;</button>' +
            '<span class="cp-item-qty-value">' + item.qty + '</span>' +
            '<button type="button" class="cp-plus" data-key="' + key + '" aria-label="Add one more ' + item.name + '">&plus;</button>' +
          '</div>' +
          '</div>';
      });
      itemsWrap.innerHTML = html;

      itemsWrap.querySelectorAll('.cp-minus').forEach(function (btn) {
        btn.addEventListener('click', function () {
          decrementItem(btn.getAttribute('data-key'));
        });
      });
      itemsWrap.querySelectorAll('.cp-plus').forEach(function (btn) {
        btn.addEventListener('click', function () {
          incrementItem(btn.getAttribute('data-key'));
        });
      });
    }

    // ----- Upsell carousel: items not already in the cart -----
    var upsellSection = document.getElementById('cartPanelUpsell');
    var upsellTrack = document.getElementById('cartPanelUpsellTrack');
    if (upsellSection && upsellTrack) {
      var candidates = UPSELL_ITEMS.filter(function (u) { return !cart[u.name]; }).slice(0, 6);
      if (keys.length === 0 || candidates.length === 0) {
        upsellSection.style.display = 'none';
        upsellTrack.innerHTML = '';
      } else {
        upsellSection.style.display = '';
        var uHtml = '';
        candidates.forEach(function (u) {
          uHtml += '<div class="cp-upsell-card">' +
            '<div class="cp-upsell-img-wrap">' +
              '<img src="' + productImage(u.name) + '" alt="' + u.name + '">' +
              '<button type="button" class="cp-upsell-add" data-name="' + u.name + '" data-price="' + u.price + '" aria-label="Add ' + u.name + '">&plus;</button>' +
            '</div>' +
            '<div class="cp-upsell-price">' + formatPrice(u.price) + '</div>' +
            '<div class="cp-upsell-name">' + u.name + '</div>' +
            '</div>';
        });
        upsellTrack.innerHTML = uHtml;

        upsellTrack.querySelectorAll('.cp-upsell-add').forEach(function (btn) {
          btn.addEventListener('click', function () {
            addToCart(btn.getAttribute('data-name'), parseFloat(btn.getAttribute('data-price')));
          });
        });
      }
    }

    // ----- Summary: subtotal + tax + delivery + total -----
    // These must match the checkout page exactly, otherwise the price seems
    // to jump by the delivery charge when the customer gets to checkout.
    var summaryWrap = document.getElementById('cartPanelSummary');
    if (summaryWrap) {
      if (keys.length === 0) {
        summaryWrap.innerHTML = '';
      } else {
        var gst = Math.round(totals.total * GST_RATE);
        var grandTotal = totals.total + gst + DELIVERY_CHARGE;
        summaryWrap.innerHTML =
          '<div class="cp-summary-line">' +
            '<img class="cp-summary-icon" src="assets/icon-total.svg" alt="">' +
            '<span class="cp-summary-label">Subtotal</span>' +
            '<span class="cp-summary-value">' + formatPrice(totals.total) + '</span>' +
          '</div>' +
          '<div class="cp-summary-line">' +
            '<img class="cp-summary-icon" src="assets/icon-tax.svg" alt="">' +
            '<span class="cp-summary-label">Tax (' + Math.round(GST_RATE * 100) + '%)</span>' +
            '<span class="cp-summary-value">' + formatPrice(gst) + '</span>' +
          '</div>' +
          '<div class="cp-summary-line">' +
            '<img class="cp-summary-icon" src="assets/icon-delivery.svg" alt="">' +
            '<span class="cp-summary-label">Delivery</span>' +
            '<span class="cp-summary-value">' + formatPrice(DELIVERY_CHARGE) + '</span>' +
          '</div>' +
          '<div class="cp-summary-line cp-summary-grand">' +
            '<img class="cp-summary-icon" src="assets/icon-total.svg" alt="">' +
            '<span class="cp-summary-label">Total</span>' +
            '<span class="cp-summary-value">' + formatPrice(grandTotal) + '</span>' +
          '</div>';
      }
    }
  }

  // ---------- Cart side panel open/close ----------
  var cartPanel = document.getElementById('cartPanel');
  var cartPanelOverlay = document.getElementById('cartPanelOverlay');
  var cartPanelClose = document.getElementById('cartPanelClose');

  function openCartPanel() {
    if (!cartPanel || !cartPanelOverlay) return;
    cartPanel.classList.add('open');
    cartPanel.setAttribute('aria-hidden', 'false');
    cartPanelOverlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeCartPanel() {
    if (!cartPanel || !cartPanelOverlay) return;
    cartPanel.classList.remove('open');
    cartPanel.setAttribute('aria-hidden', 'true');
    cartPanelOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  var cartBtn = document.getElementById('cartBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openCartPanel();
    });
  }
  if (cartPanelClose) cartPanelClose.addEventListener('click', closeCartPanel);
  if (cartPanelOverlay) cartPanelOverlay.addEventListener('click', closeCartPanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeCartPanel();
  });

  // Upsell carousel arrows
  var cpUpsellPrev = document.getElementById('cpUpsellPrev');
  var cpUpsellNext = document.getElementById('cpUpsellNext');
  var cpUpsellTrackEl = document.getElementById('cartPanelUpsellTrack');
  if (cpUpsellPrev && cpUpsellNext && cpUpsellTrackEl) {
    cpUpsellPrev.addEventListener('click', function () {
      cpUpsellTrackEl.scrollBy({ left: -220, behavior: scrollBehavior() });
    });
    cpUpsellNext.addEventListener('click', function () {
      cpUpsellTrackEl.scrollBy({ left: 220, behavior: scrollBehavior() });
    });
  }

  function renderFloatBar() {
    var bar = document.getElementById('cartFloatBar');
    if (!bar) return;
    var totals = cartTotals();

    if (totals.count === 0) {
      bar.classList.remove('show');
      return;
    }

    var countEl = bar.querySelector('.cfb-count');
    var priceEl = bar.querySelector('.cfb-price');
    if (countEl) countEl.textContent = totals.count;
    if (priceEl) priceEl.textContent = formatPrice(totals.total);
    bar.classList.add('show');
  }

  // ---------- Checkout page order summary ----------
  var GST_RATE = 0.18;
  var DELIVERY_CHARGE = 200;

  function renderCheckoutPage() {
    var emptyState = document.getElementById('checkoutEmpty');
    var content = document.getElementById('checkoutContent');
    var itemsWrap = document.getElementById('orderItems');
    if (!emptyState || !content || !itemsWrap) return;

    var keys = Object.keys(cart);

    if (keys.length === 0) {
      emptyState.style.display = '';
      content.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    content.style.display = 'grid';

    var html = '';
    keys.forEach(function (key) {
      var item = cart[key];
      html += '<div class="cart-line-item">' +
        '<span class="cli-name">' + item.name + '</span>' +
        '<div class="cli-qty-controls">' +
          '<button type="button" class="cli-qty-btn cli-minus" data-key="' + key + '" aria-label="Remove one ' + item.name + '">&minus;</button>' +
          '<span class="cli-qty-value">' + item.qty + '</span>' +
          '<button type="button" class="cli-qty-btn cli-plus" data-key="' + key + '" aria-label="Add one more ' + item.name + '">&plus;</button>' +
        '</div>' +
        '<span class="cli-price">' + formatPrice(item.price * item.qty) + '</span>' +
        '</div>';
    });
    itemsWrap.innerHTML = html;

    itemsWrap.querySelectorAll('.cli-minus').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        decrementItem(btn.getAttribute('data-key'));
      });
    });
    itemsWrap.querySelectorAll('.cli-plus').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        incrementItem(btn.getAttribute('data-key'));
      });
    });

    var totals = cartTotals();
    var gst = totals.total * GST_RATE;
    var grandTotal = totals.total + gst + DELIVERY_CHARGE;

    var subtotalEl = document.getElementById('ordSubtotal');
    var gstEl = document.getElementById('ordGst');
    var gstLabelEl = document.getElementById('ordGstLabel');
    var deliveryEl = document.getElementById('ordDelivery');
    var totalEl = document.getElementById('ordTotal');

    if (subtotalEl) subtotalEl.textContent = formatPrice(totals.total);
    if (gstEl) gstEl.textContent = formatPrice(Math.round(gst));
    if (gstLabelEl) gstLabelEl.textContent = 'GST (' + Math.round(GST_RATE * 100) + '%)';
    if (deliveryEl) deliveryEl.textContent = formatPrice(DELIVERY_CHARGE);
    if (totalEl) totalEl.textContent = formatPrice(Math.round(grandTotal));
  }

  function renderCart() {
    renderCartBadge();
    renderCartPanel();
    renderFloatBar();
    renderCheckoutPage();
  }

  function addToCart(name, price) {
    if (cart[name]) {
      cart[name].qty += 1;
    } else {
      cart[name] = { name: name, price: price, qty: 1 };
    }
    saveCart(cart);
    renderCart();
  }

  // ---------- Public cart API ----------
  // product.html has its own "+" / "+/-" buttons. It used to call a global
  // renderCart(), but this whole file is one IIFE, so no such global existed
  // - the call silently did nothing and the floating "View Cart" bar (and the
  // badge) never appeared on that page. These functions are the supported way
  // to talk to the cart, so the cart logic lives in exactly one place.
  window.EVORA_CART = {
    render: renderCart,
    add: addToCart,
    setQty: setQty,
    get: function () { return cart; },
    count: function () { return cartTotals().count; }
  };

  function incrementItem(key) {
    if (!cart[key]) return;
    cart[key].qty += 1;
    saveCart(cart);
    renderCart();
  }

  // Set an item's quantity outright (0 removes it).
  function setQty(name, price, qty) {
    var n = parseInt(qty, 10);
    if (!n || n < 0) n = 0;
    if (n === 0) {
      delete cart[name];
    } else {
      cart[name] = { name: name, price: price, qty: n };
    }
    saveCart(cart);
    renderCart();
  }

  function decrementItem(key) {
    if (!cart[key]) return;
    cart[key].qty -= 1;
    if (cart[key].qty <= 0) {
      delete cart[key];
    }
    saveCart(cart);
    renderCart();
  }

  // Wire up "Add +" buttons on the menu page.
  // These buttons live INSIDE product links (menu-card-link anchors), so we
  // must preventDefault/stopPropagation — otherwise adding to cart also
  // navigates to the product page. (The proper fix is restructuring the card
  // markup so the button is a sibling of the link, tracked separately.)
  document.querySelectorAll('.add-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var card = btn.closest('.menu-card');
      if (!card) return;
      var titleEl = card.querySelector('.menu-title');
      var priceEl = card.querySelector('.price');
      var name = titleEl ? titleEl.textContent.trim() : 'Item';
      var price = priceEl ? parsePrice(priceEl.textContent) : 0;
      addToCart(name, price);
      showQtyControl(card);
    });
  });

  // Wire up quantity + / - buttons (also inside product links — see note above)
  document.querySelectorAll('.qty-btn.qty-plus').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var card = btn.closest('.menu-card');
      if (!card) return;
      var valueEl = card.querySelector('.qty-value');
      var titleEl = card.querySelector('.menu-title');
      var priceEl = card.querySelector('.price');
      var current = parseInt(valueEl.textContent, 10) || 1;
      var next = current + 1;
      valueEl.textContent = next;
      var name = titleEl ? titleEl.textContent.trim() : 'Item';
      var price = priceEl ? parsePrice(priceEl.textContent) : 0;
      addToCart(name, price);
    });
  });

  document.querySelectorAll('.qty-btn.qty-minus').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var card = btn.closest('.menu-card');
      if (!card) return;
      var valueEl = card.querySelector('.qty-value');
      var titleEl = card.querySelector('.menu-title');
      var priceEl = card.querySelector('.price');
      var current = parseInt(valueEl.textContent, 10) || 1;
      if (current > 1) {
        var next = current - 1;
        valueEl.textContent = next;
        var name = titleEl ? titleEl.textContent.trim() : 'Item';
        var price = priceEl ? parsePrice(priceEl.textContent) : 0;
        removeOneFromCart(name, price);
      } else {
        hideQtyControl(card);
        var name = titleEl ? titleEl.textContent.trim() : 'Item';
        var price = priceEl ? parsePrice(priceEl.textContent) : 0;
        removeAllFromCart(name, price);
      }
    });
  });

  function showQtyControl(card) {
    var addBtn = card.querySelector('.add-btn');
    var qtyControl = card.querySelector('.qty-control');
    if (addBtn) addBtn.style.display = 'none';
    if (qtyControl) qtyControl.style.display = 'inline-flex';
  }

  function hideQtyControl(card) {
    var addBtn = card.querySelector('.add-btn');
    var qtyControl = card.querySelector('.qty-control');
    var valueEl = card.querySelector('.qty-value');
    if (addBtn) addBtn.style.display = 'inline-flex';
    if (qtyControl) qtyControl.style.display = 'none';
    if (valueEl) valueEl.textContent = '1';
  }

  function removeOneFromCart(name, price) {
    if (typeof cart === 'undefined' || !cart) return;
    if (cart[name]) {
      cart[name].qty = (cart[name].qty || 1) - 1;
      if (cart[name].qty <= 0) delete cart[name];
    }
    saveCart(cart);
    renderCart();
  }

  function removeAllFromCart(name, price) {
    if (typeof cart === 'undefined' || !cart) return;
    if (cart[name]) delete cart[name];
    saveCart(cart);
    renderCart();
  }

  // Floating bar opens the cart side panel
  var floatBar = document.getElementById('cartFloatBar');
  if (floatBar) {
    floatBar.addEventListener('click', function (e) {
      e.stopPropagation();
      openCartPanel();
    });
    floatBar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openCartPanel();
      }
    });
  }

  renderCart();

  // ---------- Checkout: payment method selection ----------
  var paymentOptions = document.getElementById('paymentOptions');
  var cardDetail = document.getElementById('cardDetail');
  var walletDetail = document.getElementById('walletDetail');
  var walletLabel = document.getElementById('walletLabel');
  var walletNote = document.getElementById('walletNote');
  var walletNumberInput = document.getElementById('co-wallet-number');
  var cardNumberInput = document.getElementById('co-card-number');
  var cardExpiryInput = document.getElementById('co-card-expiry');
  var cardCvvInput = document.getElementById('co-card-cvv');

  var paymentLabels = {
    cod: 'Cash on Delivery',
    card: 'Credit / Debit Card',
    jazzcash: 'JazzCash',
    easypaisa: 'EasyPaisa'
  };

  function setRequired(input, isRequired) {
    if (!input) return;
    if (isRequired) {
      input.setAttribute('required', 'required');
    } else {
      input.removeAttribute('required');
    }
  }

  function updatePaymentUI() {
    if (!paymentOptions) return;
    var selected = paymentOptions.querySelector('input[name="payment"]:checked');
    var value = selected ? selected.value : 'cod';

    paymentOptions.querySelectorAll('.payment-option').forEach(function (label) {
      var input = label.querySelector('input[type="radio"]');
      label.classList.toggle('is-selected', !!input && input.checked);
    });

    if (cardDetail) cardDetail.style.display = value === 'card' ? '' : 'none';
    setRequired(cardNumberInput, value === 'card');
    setRequired(cardExpiryInput, value === 'card');
    setRequired(cardCvvInput, value === 'card');

    var isWallet = value === 'jazzcash' || value === 'easypaisa';
    if (walletDetail) walletDetail.style.display = isWallet ? '' : 'none';
    setRequired(walletNumberInput, isWallet);

    if (isWallet && walletLabel && walletNote) {
      var walletName = paymentLabels[value];
      walletLabel.textContent = walletName + ' Mobile Number';
      walletNote.textContent = "You'll get a payment prompt on this number to confirm via " + walletName + '.';
    }
  }

  if (paymentOptions) {
    paymentOptions.querySelectorAll('input[name="payment"]').forEach(function (input) {
      input.addEventListener('change', updatePaymentUI);
    });
    updatePaymentUI();
  }

  // ---------- Checkout: place order ----------
  // CHANGED: this now sends the order to a real backend (POST /api/orders)
  // instead of just showing a fake success message. See server/server.js
  // for the Express endpoint that receives this data.
  var checkoutForm = document.getElementById('checkoutForm');
  var checkoutContent = document.getElementById('checkoutContent');
  var checkoutSuccess = document.getElementById('checkoutSuccess');
  var successMessage = document.getElementById('successMessage');
  var checkoutError = document.getElementById('checkoutError');
  var placeOrderBtn = document.getElementById('placeOrderBtn');

  // Where the backend is running. The Express server in /server serves the
  // whole site AND this API from the same origin, so a relative path works
  // with no CORS setup needed. Change this only if you host the API elsewhere.
  var ORDER_API_URL = '/api/orders';

  function showCheckoutError(message) {
    if (!checkoutError) return;
    checkoutError.textContent = message;
    checkoutError.style.display = '';
  }

  function hideCheckoutError() {
    if (!checkoutError) return;
    checkoutError.style.display = 'none';
    checkoutError.textContent = '';
  }

  function setPlaceOrderLoading(isLoading) {
    if (!placeOrderBtn) return;
    placeOrderBtn.classList.toggle('is-loading', isLoading);
    placeOrderBtn.textContent = isLoading ? 'Placing order…' : 'Place Order';
  }

  if (checkoutForm && checkoutContent && checkoutSuccess) {
    checkoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      hideCheckoutError();

      var totals = cartTotals();
      if (totals.count === 0) return;

      var gst = Math.round(totals.total * GST_RATE);
      var grandTotal = totals.total + gst + DELIVERY_CHARGE;

      var selected = paymentOptions ? paymentOptions.querySelector('input[name="payment"]:checked') : null;
      var paymentValue = selected ? selected.value : 'cod';
      var paymentName = paymentLabels[paymentValue] || 'Cash on Delivery';

      // ----- Build the JSON payload the backend will receive -----
      // (name, email, address come straight from the form fields the
      // user just filled in; items come from the cart object)
      var itemsPayload = Object.keys(cart).map(function (key) {
        var item = cart[key];
        return { name: item.name, price: item.price, qty: item.qty };
      });

      var orderPayload = {
        customer: {
          name: document.getElementById('co-name').value.trim(),
          email: document.getElementById('co-email').value.trim(),
          phone: document.getElementById('co-phone').value.trim(),
          address: document.getElementById('co-address').value.trim(),
          area: document.getElementById('co-area').value
        },
        items: itemsPayload,
        payment: {
          method: paymentValue,
          methodLabel: paymentName
        },
        totals: {
          subtotal: totals.total,
          gst: gst,
          deliveryCharge: DELIVERY_CHARGE,
          total: grandTotal
        }
      };

      // ----- Send it to the backend -----
      setPlaceOrderLoading(true);

      EVORA_API.fetch(ORDER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      })
        .then(function (response) {
          // Always read the body once so we can show the server's real
          // error message if the order fails — the generic "check your
          // connection" message isn't very helpful otherwise.
          return response.json().catch(function () { return {}; }).then(function (body) {
            return { ok: response.ok, status: response.status, body: body };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            var serverMsg = (result.body && (result.body.error ||
              (result.body.details && result.body.details.join('; ')))) || ('Server responded with ' + result.status);
            throw new Error(serverMsg);
          }

          var data = result.body || {};
          var orderId = data.orderId || ('EVR-' + Math.floor(100000 + Math.random() * 900000));
          var payLine = paymentValue === 'cod'
            ? "You'll pay " + formatPrice(grandTotal) + ' in cash when your order arrives.'
            : 'Your payment of ' + formatPrice(grandTotal) + ' via ' + paymentName + ' is being confirmed.';

          if (successMessage) {
            successMessage.textContent = 'Order #' + orderId + ' placed! ' + payLine;
          }

          cart = {};
          saveCart(cart);
          renderCart();

          checkoutContent.style.display = 'none';
          checkoutSuccess.style.display = '';
          checkoutSuccess.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        })
        .catch(function (err) {
          // Network error (server down / wrong port / file://), non-2xx
          // response, or a thrown validation error from the server.
          // Keep the cart intact and surface the real reason so the user
          // can fix it instead of guessing.
          console.error('Order submission failed:', err);

          var hint;
          if (err && err.message === 'backend-not-found') {
            hint = "The Evora backend isn't running, so we can't send your order yet. " +
                   'Start it by double-clicking start-evora.cmd in the project folder, then try again.';
          } else if (err instanceof TypeError) {
            // fetch() throws TypeError for network failures
            hint = "We couldn't reach our order server — please check your connection and try again in a moment.";
          } else {
            hint = "Couldn't place your order: " + err.message;
          }
          showCheckoutError(hint);
        })
        .finally(function () {
          setPlaceOrderLoading(false);
        });
    });
  }

  // ---------- Highlight current page ----------
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.options-link, .footer-link').forEach(function (link) {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('w--current');
    }
  });

  // ---------- Floating action buttons ----------
  var floatingTop = document.getElementById('floatingTop');
  var floatingSearch = document.getElementById('floatingSearch');
  var menuSearchInput = document.getElementById('menuSearchInput');
  var searchBarSection = document.querySelector('.search-bar-section');

  function syncFloatingVisibility() {
    var show = window.scrollY > 240;
    if (floatingTop) floatingTop.classList.toggle('visible', show);
    if (floatingSearch) floatingSearch.classList.toggle('visible', show);
  }

  if (floatingTop) {
    window.addEventListener('scroll', syncFloatingVisibility, { passive: true });
    syncFloatingVisibility();

    floatingTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: scrollBehavior() });
    });
  }

  if (floatingSearch) {
    if (!menuSearchInput || !searchBarSection) {
      floatingSearch.style.display = 'none';
    } else {
      floatingSearch.addEventListener('click', function () {
        var rect = searchBarSection.getBoundingClientRect();
        var targetY = window.scrollY + rect.top - 80;
        window.scrollTo({ top: Math.max(targetY, 0), behavior: scrollBehavior() });
        setTimeout(function () {
          menuSearchInput.focus({ preventScroll: true });
          menuSearchInput.select();
        }, 380);
      });
    }
  }

});
