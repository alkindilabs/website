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

  const DICT_FETCH_TIMEOUT_MS = 2000;

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

  const loadDict = (lang) => {
    if (dicts[lang]) return Promise.resolve();
    if (dictPromises[lang]) return dictPromises[lang];
    const url = DICT_URLS[lang];
    if (!url) return Promise.reject(new Error(`Unsupported lang: ${lang}`));
    dictPromises[lang] = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DICT_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Failed to load ${lang}: HTTP ${res.status} ${res.statusText}`.trimEnd());
        dicts[lang] = await res.json();
      } finally {
        clearTimeout(timeoutId);
        dictPromises[lang] = null;
      }
    })();
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
      if (value !== undefined) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const value = t(el.dataset.i18nAria);
      if (value !== undefined) el.setAttribute('aria-label', value);
    });
    teamToggles.forEach((entry) => entry.refresh());
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
    const token = ++langSeq;
    if (lang === currentLang) return;
    try {
      await loadDict(lang);
    } catch (err) {
      console.warn(`Language switch to ${lang} failed:`, err);
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

  const markI18nReady = () => document.documentElement.classList.add('i18n-ready');

  (async () => {
    const initial = detectInitialLang();
    const cameFromStorage = safeStorage?.getItem(LANG_STORAGE_KEY) === initial;
    try {
      await loadDict(SOURCE_LANG);
    } catch (err) {
      console.warn('Failed to load source dictionary:', err);
      markI18nReady();
      return;
    }
    let applied = SOURCE_LANG;
    if (initial !== SOURCE_LANG) {
      try {
        await loadDict(initial);
        applied = initial;
      } catch (err) {
        console.warn(`Failed to load ${initial} dictionary; falling back to ${SOURCE_LANG}:`, err);
        if (cameFromStorage) clearLangPref();
      }
    }
    currentLang = applied;
    applyTranslations();
    refreshLangButtons();
    refresh();
    markI18nReady();
  })();

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
