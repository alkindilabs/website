(() => {
  const SCROLL_THRESHOLD = 80;
  const ACTIVE_SECTION_VIEWPORT_RATIO = 0.35;
  const REVEAL_THRESHOLD = 0;
  const REVEAL_ROOT_MARGIN = '0px 0px 12% 0px';
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

  let ticking = false;

  const recomputeLayout = () => {
    navItems.forEach((item) => {
      item.top = item.section.offsetTop;
    });
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
    const activeLink = findActiveLink(scrollY);

    header.classList.toggle('header--scrolled', scrollY > SCROLL_THRESHOLD);

    navItems.forEach(({ link }) => {
      const active = link === activeLink;
      link.classList.toggle('nav__link--active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });

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
    }, { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN });
    revealElements.forEach((el) => observer.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }

  // Cipher reveal — section labels arrive enciphered under a random
  // substitution and are cracked the way the namesake's frequency
  // analysis works: one stable ciphertext, symbols resolved in
  // descending plaintext frequency, every occurrence of a symbol
  // decoding at once. Text is correct before and after; only the
  // transition is decorative, so reduced-motion and no-observer
  // paths skip it.
  const CIPHER_GLYPHS = 'AEHKLMNORSTUXZ0179';
  const CIPHER_STEP_MS = 70;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const decipher = (el) => {
    const finalText = el.textContent;
    if (!finalText) return;

    const uniqueChars = [...new Set(finalText)].filter((ch) => ch !== ' ');
    const glyphPool = [...CIPHER_GLYPHS];
    if (uniqueChars.length > glyphPool.length) return;
    for (let i = glyphPool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [glyphPool[i], glyphPool[j]] = [glyphPool[j], glyphPool[i]];
    }
    const substitution = new Map(uniqueChars.map((ch, i) => [ch, glyphPool[i]]));

    const frequency = new Map();
    for (const ch of finalText) {
      if (ch !== ' ') frequency.set(ch, (frequency.get(ch) ?? 0) + 1);
    }
    const crackOrder = [...frequency.keys()].sort((a, b) => frequency.get(b) - frequency.get(a));

    const cracked = new Set();
    const render = () => {
      let out = '';
      for (const ch of finalText) {
        out += ch === ' ' || cracked.has(ch) ? ch : substitution.get(ch);
      }
      el.textContent = out;
    };

    let step = 0;
    const tick = () => {
      cracked.add(crackOrder[step]);
      step += 1;
      render();
      if (step < crackOrder.length) setTimeout(tick, CIPHER_STEP_MS);
    };
    render();
    setTimeout(tick, CIPHER_STEP_MS);
  };

  if ('IntersectionObserver' in globalThis && !prefersReducedMotion) {
    const cipherObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        cipherObserver.unobserve(entry.target);
        decipher(entry.target);
      });
    }, { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN });
    document.querySelectorAll('[data-cipher]').forEach((el) => cipherObserver.observe(el));
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
  const DICT_CACHE_VERSION = 'v15';
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
    'nav.main': 'Primary navigation',
    'hero.headingAria': 'Sound reasoning. Elegant engineering.',
    'hero.line1': 'Sound reasoning.',
    'hero.line2': 'Elegant engineering.',
    'hero.bodyLeft': "Alkindi is a digital product studio with a polymath's range, working from interfaces to smart contracts.",
    'hero.bodyRight': 'We search for the best definition of the problem, explore the possible answers, and build only what should be built.',
    'hero.cta': 'Start a project',
    'cta.book': 'Book a free consultation',
    'work.label': 'Selected Work',
    'services.label': 'Services',
    'about.label': 'About al-Kindi',
    'origin.label': 'Origin',
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

  const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

  const isValidDict = (value) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const k of Object.keys(value)) {
      if (UNSAFE_KEYS.has(k)) return false;
      if (typeof value[k] !== 'string') return false;
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

  const MAX_VALUE_LEN = 4096;
  const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

  const sanitizeForStorage = (dict) => {
    const out = Object.create(null);
    for (const [k, v] of Object.entries(dict)) {
      if (UNSAFE_KEYS.has(k)) continue;
      out[k] = String(v).replaceAll(CONTROL_CHARS, '').slice(0, MAX_VALUE_LEN);
    }
    return out;
  };

  const writeCachedDict = (lang, dict) => {
    if (!safeStorage) return;
    if (!isValidDict(dict)) return;
    try {
      safeStorage.setItem(cacheKey(lang), JSON.stringify(sanitizeForStorage(dict)));
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

  const fetchDictOnce = async (lang) => {
    const base = DICT_URLS[lang];
    if (!base) throw new Error(`Unsupported lang: ${lang}`);
    // Append cache version to bypass HTTP cache when content shape changes.
    // Must change in lock-step with the matching <link rel="preload"> in index.html.
    const url = `${base}?v=${DICT_CACHE_VERSION}`;

    // Visibility-driven timeout: timer runs only while the tab is visible.
    // Each transition to hidden cancels the pending timer; each transition
    // back to visible restarts it. A tab that is hidden for the whole fetch
    // therefore never times out.
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let timerId = null;
    const startTimer = () => {
      if (!controller || timerId !== null) return;
      timerId = setTimeout(() => controller.abort(), DICT_TIMEOUT_VISIBLE_MS);
    };
    const stopTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') startTimer();
      else stopTimer();
    };

    if (document.visibilityState === 'visible') startTimer();
    document.addEventListener('visibilitychange', onVisibilityChange);

    try {
      const res = await fetch(url, {
        credentials: 'omit',
        cache: 'force-cache',
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
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
    } finally {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
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
      refreshDict(lang);
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

  const t = (key) => dicts[currentLang]?.[key] ?? dicts[SOURCE_LANG]?.[key];

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
