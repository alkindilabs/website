(() => {
  const SCROLL_THRESHOLD = 80;
  const SCROLL_DELTA_DEADBAND = 6;
  const ACTIVE_SECTION_VIEWPORT_RATIO = 0.35;
  const REVEAL_THRESHOLD = 0.08;
  const HEADER_HIT_OFFSET = 2;
  const LANG_STORAGE_KEY = 'alkindi-lang';
  const SUPPORTED_LANGS = new Set(['en', 'tr']);
  const SOURCE_LANG = 'en';
  const DICT_URLS = Object.freeze({
    en: 'content/en.json',
    tr: 'content/tr.json',
  });

  document.documentElement.classList.add('reveal-enabled');

  const header = document.querySelector('.site-header');
  if (!header) return;

  const navItems = Array.from(document.querySelectorAll('.nav__link[href^="#"]'))
    .map((link) => ({
      link,
      section: document.getElementById(link.hash.slice(1)),
      top: 0,
    }))
    .filter((item) => item.section);

  const allSections = Array.from(document.querySelectorAll('section[id]'));
  let sectionRanges = [];
  let headerHeight = 0;
  let lastScrollY = window.scrollY;
  let isHidden = false;
  let ticking = false;

  const recomputeLayout = () => {
    sectionRanges = allSections.map((section) => {
      const top = section.offsetTop;
      return {
        top,
        bottom: top + section.offsetHeight,
        isLight: section.dataset.color === 'light',
      };
    });
    navItems.forEach((item) => {
      item.top = item.section.offsetTop;
    });
    headerHeight = header.offsetHeight;
  };

  const findColorRange = (scrollY) => {
    const checkY = scrollY + headerHeight + HEADER_HIT_OFFSET;
    return sectionRanges.find((range) => checkY >= range.top && checkY < range.bottom);
  };

  const findActiveLink = (scrollY) => {
    const midline = scrollY + window.innerHeight * ACTIVE_SECTION_VIEWPORT_RATIO;
    let active = navItems[0] ?? null;
    navItems.forEach((item) => {
      if (item.top <= midline) active = item;
    });
    return active?.link ?? null;
  };

  const updateHeader = () => {
    const scrollY = window.scrollY;
    const colorRange = findColorRange(scrollY);
    const activeLink = findActiveLink(scrollY);
    const delta = scrollY - lastScrollY;

    if (scrollY < SCROLL_THRESHOLD) isHidden = false;
    else if (delta > SCROLL_DELTA_DEADBAND) isHidden = true;
    else if (delta < -SCROLL_DELTA_DEADBAND) isHidden = false;

    header.classList.toggle('header--light', !!colorRange?.isLight);
    header.classList.toggle('header--scrolled', scrollY > SCROLL_THRESHOLD);
    header.classList.toggle('header--hidden', isHidden);

    navItems.forEach(({ link }) => {
      const active = link === activeLink;
      link.classList.toggle('nav__link--active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

    lastScrollY = scrollY;
    ticking = false;
  };

  const refresh = () => {
    recomputeLayout();
    updateHeader();
  };

  refresh();

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(updateHeader);
    ticking = true;
  }, { passive: true });

  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh);
  if (document.fonts) document.fonts.ready.then(refresh);

  const revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in globalThis) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: REVEAL_THRESHOLD });
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  const safeStorage = (() => {
    try {
      const probe = '__alkindi__';
      localStorage.setItem(probe, probe);
      localStorage.removeItem(probe);
      return localStorage;
    } catch {
      return null;
    }
  })();

  const detectInitialLang = () => {
    const saved = safeStorage?.getItem(LANG_STORAGE_KEY);
    if (SUPPORTED_LANGS.has(saved)) return saved;
    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    return SUPPORTED_LANGS.has(browser) ? browser : SOURCE_LANG;
  };

  // i18n loader strategy:
  // 1. Apply from localStorage cache instantly if present (cache-first paint).
  // 2. Fetch in background with a visibility-aware AbortSignal.timeout — only
  //    time out while the tab is visible; if hidden, wait once for
  //    visibilitychange before retrying.
  // 3. Retry non-abort errors up to 2 times with 250 ms backoff.
  // 4. If both cache and network fail, apply an inline English safety
  //    dictionary so translatable nodes never stay blank.

  const DICT_CACHE_PREFIX = 'alkindi-i18n:';
  const DICT_CACHE_VERSION = 'v1';
  const DICT_TIMEOUT_VISIBLE_MS = 8000;
  const DICT_RETRY_MAX = 2;
  const DICT_RETRY_BACKOFF_MS = 250;

  // SAFETY_DICT is the offline-first-visit fallback (no cache + no network).
  // It intentionally duplicates a subset of content/en.json so the brand,
  // hero, and section labels still render when both fetch and cache fail.
  // The per-element [data-i18n]:empty cloak in styles/main.css keeps any key
  // not present here visibility:hidden, so missing entries do not produce a
  // visible blank gap.
  const SAFETY_DICT = Object.freeze({
    'lang.switch': 'Language',
    'nav.work': 'Work',
    'nav.services': 'Services',
    'nav.about': 'About',
    'nav.team': 'Team',
    'nav.contact': 'Contact',
    'hero.phrase1': 'Free, Fearless',
    'hero.phrase2': 'Istanbul-born, Lisbon-grown',
    'hero.tagline': 'A design and technology studio focused on clear thinking and solid work.',
    'hero.body': 'We build brands, products and digital experiences that feel natural to use and easy to understand.',
    'work.label': 'Selected Projects',
    'services.label': 'Services',
    'about.label': 'About al-Kindi',
    'team.label': 'Team',
    'contact.label': 'Contact',
  });

  const dicts = {};
  const dictPromises = {};
  let currentLang = SOURCE_LANG;
  let langSeq = 0;

  const writeLangPref = (lang) => {
    try {
      safeStorage?.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      /* quota or storage became unavailable; ignore */
    }
  };

  const clearLangPref = () => {
    try {
      safeStorage?.removeItem(LANG_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const cacheKey = (lang) => `${DICT_CACHE_PREFIX}${lang}:${DICT_CACHE_VERSION}`;

  const isValidDict = (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const v of Object.values(value)) {
      if (typeof v !== 'string') return false;
    }
    return true;
  };

  const readCachedDict = (lang) => {
    if (!safeStorage) return null;
    try {
      const raw = safeStorage.getItem(cacheKey(lang));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isValidDict(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeCachedDict = (lang, dict) => {
    if (!safeStorage) return;
    if (!isValidDict(dict)) return;
    try {
      safeStorage.setItem(cacheKey(lang), JSON.stringify(dict));
    } catch {
      /* quota exceeded or storage unavailable; ignore */
    }
  };

  const waitForVisible = () => new Promise((resolve) => {
    if (document.visibilityState === 'visible') return resolve();
    const onChange = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });

  const createTimeoutSignal = (ms) => {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(ms);
    }
    if (typeof AbortController === 'function') {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    }
    return undefined;
  };

  const fetchDictOnce = async (lang) => {
    const url = DICT_URLS[lang];
    if (!url) throw new Error(`Unsupported lang: ${lang}`);
    const signal = document.visibilityState === 'visible'
      ? createTimeoutSignal(DICT_TIMEOUT_VISIBLE_MS)
      : undefined;
    const res = await fetch(url, {
      credentials: 'omit',
      cache: 'force-cache',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!res.ok) {
      const err = new Error(`http-${res.status}`);
      err.code = `http-${res.status}`;
      throw err;
    }
    let parsed;
    try {
      parsed = await res.json();
    } catch {
      const err = new Error('parse');
      err.code = 'parse';
      throw err;
    }
    if (!isValidDict(parsed)) {
      const err = new Error('parse');
      err.code = 'parse';
      throw err;
    }
    return parsed;
  };

  const isAbortError = (err) => err?.name === 'AbortError' || err?.name === 'TimeoutError';

  const fetchDictResilient = async (lang) => {
    let networkAttempts = 0;
    let didHiddenRetry = false;
    while (true) {
      try {
        return await fetchDictOnce(lang);
      } catch (err) {
        if (isAbortError(err)) {
          if (!didHiddenRetry && document.visibilityState !== 'visible') {
            didHiddenRetry = true;
            await waitForVisible();
            continue;
          }
          console.warn('[i18n] abort');
          throw err;
        }
        networkAttempts += 1;
        if (networkAttempts > DICT_RETRY_MAX) {
          console.warn(`[i18n] ${err.code || 'network'}`);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, DICT_RETRY_BACKOFF_MS));
      }
    }
  };

  const ensureDict = (lang) => {
    if (dicts[lang]) return Promise.resolve(dicts[lang]);
    if (dictPromises[lang]) return dictPromises[lang];
    const cached = readCachedDict(lang);
    if (cached) {
      dicts[lang] = cached;
      void refreshDict(lang);
      return Promise.resolve(cached);
    }
    dictPromises[lang] = fetchDictResilient(lang)
      .then((fresh) => {
        dicts[lang] = fresh;
        writeCachedDict(lang, fresh);
        return fresh;
      })
      .finally(() => {
        dictPromises[lang] = null;
      });
    return dictPromises[lang];
  };

  const refreshDict = (lang) => {
    if (dictPromises[lang]) return dictPromises[lang];
    dictPromises[lang] = fetchDictResilient(lang)
      .then((fresh) => {
        dicts[lang] = fresh;
        writeCachedDict(lang, fresh);
        if (lang === currentLang) applyTranslations();
        return fresh;
      })
      .catch(() => null)
      .finally(() => {
        dictPromises[lang] = null;
      });
    return dictPromises[lang];
  };

  const t = (key, params) => {
    const raw = dicts[currentLang]?.[key] ?? dicts[SOURCE_LANG]?.[key];
    if (raw === undefined) return undefined;
    if (!params) return raw;
    let value = raw;
    Object.entries(params).forEach(([k, v]) => {
      value = value.split(`{${k}}`).join(v);
    });
    return value;
  };

  const formatToggleLabel = (open, name) => {
    const value = t(open ? 'team.bioHide' : 'team.bioShow', { name });
    return value ?? `${open ? 'Hide' : 'Show'} ${name} bio`;
  };

  const teamToggles = Array.from(document.querySelectorAll('.team__toggle')).map((button) => {
    const member = button.closest('.team__member');
    const icon = button.querySelector('.team__toggle-icon');
    const bio = document.getElementById(button.getAttribute('aria-controls'));

    const setBioState = (open) => {
      const name = member.querySelector('.team__name').textContent.trim();
      member.classList.toggle('team__member--open', open);
      button.setAttribute('aria-expanded', String(open));
      if (name) button.setAttribute('aria-label', formatToggleLabel(open, name));
      bio.setAttribute('aria-hidden', String(!open));
      icon.textContent = open ? '−' : '+';
    };

    setBioState(button.getAttribute('aria-expanded') === 'true');

    button.addEventListener('click', () => {
      setBioState(button.getAttribute('aria-expanded') !== 'true');
    });

    bio.addEventListener('transitionend', (event) => {
      if (event.target === bio && event.propertyName === 'grid-template-rows') {
        refresh();
      }
    });

    return { button, refresh: () => setBioState(button.getAttribute('aria-expanded') === 'true') };
  });

  const applyTranslations = () => {
    document.documentElement.lang = currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t(el.dataset.i18n);
      if (value != null && value !== '') el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = t(el.dataset.i18nAria);
      if (value != null && value !== '') el.setAttribute('aria-label', value);
    });
    teamToggles.forEach((entry) => entry.refresh());
    document.documentElement.classList.add('i18n-ready');
  };

  const langItems = Array.from(document.querySelectorAll('.lang-switch__item'));
  const refreshLangButtons = () => {
    langItems.forEach((btn) => {
      const active = btn.dataset.lang === currentLang;
      btn.classList.toggle('lang-switch__item--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };

  const setLang = async (lang) => {
    if (!SUPPORTED_LANGS.has(lang)) return;
    if (lang === currentLang) return;
    const token = ++langSeq;
    try {
      await ensureDict(lang);
    } catch {
      return;
    }
    if (token !== langSeq) return;
    currentLang = lang;
    writeLangPref(lang);
    applyTranslations();
    refreshLangButtons();
    refresh();
  };

  langItems.forEach((item) => {
    item.addEventListener('click', () => setLang(item.dataset.lang));
  });

  refreshLangButtons();

  const renderLang = (lang) => {
    currentLang = lang;
    applyTranslations();
    refreshLangButtons();
    refresh();
  };

  (async () => {
    const initial = detectInitialLang();
    const cameFromStorage = safeStorage?.getItem(LANG_STORAGE_KEY) === initial;

    try {
      await ensureDict(initial);
      renderLang(initial);
      return;
    } catch {
      if (cameFromStorage) clearLangPref();
    }

    if (initial !== SOURCE_LANG) {
      try {
        await ensureDict(SOURCE_LANG);
        renderLang(SOURCE_LANG);
        return;
      } catch {
        /* fall through to safety dict */
      }
    }

    dicts[SOURCE_LANG] = { ...SAFETY_DICT };
    renderLang(SOURCE_LANG);
  })();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
