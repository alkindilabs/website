(() => {
  const header = document.querySelector('.site-header');
  if (!header) {
    return;
  }

  const navLinks = document.querySelectorAll('.nav__link');
  const lightSections = new Set(['services', 'about']);
  const sectionMap = {
    work: '#work',
    services: '#services',
    about: '#about',
    team: '#team',
    contact: '#contact',
  };

  let lastScrollY = window.scrollY;
  let ticking = false;

  const getColorSection = () => {
    const checkY = header.getBoundingClientRect().bottom + 2;
    const element = document.elementFromPoint(window.innerWidth / 2, checkY);
    const section = element?.closest('section[id]');
    return section?.id ?? 'hero';
  };

  const getActiveSection = (scrollY) => {
    const midline = scrollY + window.innerHeight * 0.35;
    let activeSection = 'hero';

    document.querySelectorAll('section[id]').forEach((section) => {
      if (section.offsetTop <= midline) {
        activeSection = section.id;
      }
    });

    return activeSection;
  };

  const updateHeader = () => {
    const scrollY = window.scrollY;
    const colorSection = getColorSection();
    const activeSection = getActiveSection(scrollY);
    const activeHref = sectionMap[activeSection] || '#work';

    header.classList.toggle('header--light', lightSections.has(colorSection));
    header.classList.toggle('header--scrolled', scrollY > 80);

    navLinks.forEach((link) => {
      link.classList.toggle('nav__link--active', link.getAttribute('href') === activeHref);
    });

    const delta = scrollY - lastScrollY;
    if (scrollY < 80) {
      header.classList.remove('header--hidden');
    } else if (delta > 6) {
      header.classList.add('header--hidden');
    } else if (delta < -6) {
      header.classList.remove('header--hidden');
    }

    lastScrollY = scrollY;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(updateHeader);
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', updateHeader, { passive: true });
  updateHeader();

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08 }
  );

  document.querySelectorAll('.reveal').forEach((element) => {
    revealObserver.observe(element);
  });

  document.querySelectorAll('.team__toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const member = button.closest('.team__member');
      if (!member) {
        return;
      }

      const open = member.classList.toggle('team__member--open');
      button.setAttribute('aria-expanded', String(open));

      const icon = button.querySelector('.team__toggle-icon');
      if (icon) {
        icon.textContent = open ? '−' : '+';
      }
    });
  });
})();
