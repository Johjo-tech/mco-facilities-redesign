/* ════════════════════════════════════════════════════════════════
   MCO Facilities — interactions
   Native scroll · GSAP ScrollTrigger (subtle bg parallax) · reveals · tilt
   ══════════════════════════════════════════════════════════════════ */

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  /* ─── 1. GSAP setup ─── */
  if (hasGSAP) {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ─── 2. Subtle background parallax (bg-orbs only — gentle) ─── */
  if (hasGSAP && !prefersReducedMotion) {
    const orbs = document.querySelectorAll('.bg-orb');
    orbs.forEach((orb, i) => {
      const speed = [0.12, -0.08][i] || 0.06;
      gsap.to(orb, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.4,
        }
      });
    });
  }

  /* ─── 3. Hero title — line reveal on load ─── */
  const heroLines = document.querySelectorAll('.hero__title .line, .page-hero__title .line');
  heroLines.forEach((line, i) => {
    line.style.setProperty('--idx', i);
    requestAnimationFrame(() => line.classList.add('is-visible'));
  });

  /* ─── 4. Reveal-on-scroll (IntersectionObserver, no scrub) ─── */
  const reveals = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const siblings = el.parentElement ? Array.from(el.parentElement.querySelectorAll(':scope > [data-reveal]')) : [];
          const localIndex = siblings.indexOf(el);
          if (localIndex > -1) el.style.setProperty('--delay', `${localIndex * 60}ms`);
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-visible'));
  }

  /* ─── 5. Counters ─── */
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length && 'IntersectionObserver' in window) {
    const animate = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      const duration = 1400;
      const start = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(ease(t) * target).toString();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ─── 6. Nav: stuck state on scroll ─── */
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* Mobile menu: inject a burger button and toggle the nav panel */
    const navLinks = nav.querySelector('.nav__links');
    if (navLinks) {
      const burger = document.createElement('button');
      burger.className = 'nav__burger';
      burger.setAttribute('aria-label', 'Menu');
      burger.setAttribute('aria-controls', navLinks.id || 'nav');
      burger.setAttribute('aria-expanded', 'false');
      burger.innerHTML = '<span></span>';
      nav.appendChild(burger);

      const closeMenu = () => {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      };
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }
  }

  /* ─── 7. Card tilt + spotlight (desktop only) ─── */
  if (isFinePointer && !prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('[data-tilt]');
    tiltCards.forEach(card => {
      const handleEnter = () => card.classList.add('is-tilting');
      const handleMove = (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = ((y - cy) / cy) * -2.5;
        const ry = ((x - cx) / cx) *  2.5;
        card.style.transform = `perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
      };
      const handleLeave = () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      };
      card.addEventListener('mouseenter', handleEnter);
      card.addEventListener('mousemove', handleMove);
      card.addEventListener('mouseleave', handleLeave);
    });

    /* spotlight on pillars and related cards */
    document.querySelectorAll('.expertise__pillars li, .related__card, .why-grid__item').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ─── 8. Custom cursor (desktop only) ─── */
  if (isFinePointer && !prefersReducedMotion) {
    const cursor = document.querySelector('.cursor');
    if (cursor) {
      let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      let tx = cx, ty = cy;
      window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
      const loop = () => {
        cx += (tx - cx) * 0.22;
        cy += (ty - cy) * 0.22;
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(loop);
      };
      loop();

      const hoverables = 'a, button, [data-tilt], input, textarea, select, summary';
      document.querySelectorAll(hoverables).forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
      });

      window.addEventListener('mouseleave', () => cursor.style.opacity = 0);
      window.addEventListener('mouseenter', () => cursor.style.opacity = 1);
    }
  }

  /* ─── 9. Footer year ─── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
