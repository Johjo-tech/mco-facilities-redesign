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

  /* ─── 10. Scroll motion (GSAP ScrollTrigger) ─── */
  if (hasGSAP && !prefersReducedMotion) {
    document.documentElement.classList.add('has-motion');

    /* 10a. Reading progress bar */
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    gsap.to(bar, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });

    /* 10b. Hero: photo zooms, content drifts up and fades as you leave it */
    const hero = document.querySelector('.hero, .page-hero');
    if (hero) {
      const heroTl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
      });
      const heroImg = hero.querySelector('.hero__photo img, .page-hero__photo img');
      const heroInner = hero.querySelector('.hero__inner, .page-hero__inner');
      if (heroImg) heroTl.fromTo(heroImg, { scale: 1.05, yPercent: 0 }, { scale: 1.18, yPercent: 8, ease: 'none' }, 0);
      if (heroInner) heroTl.to(heroInner, { yPercent: -12, opacity: 0.15, ease: 'none' }, 0);
    }

    /* 10c. Image parallax inside cards and gallery tiles */
    document.querySelectorAll('.service__photo img, .gallery__item img').forEach((img) => {
      gsap.fromTo(img,
        { yPercent: -7, scale: 1.18 },
        {
          yPercent: 7,
          scale: 1.18,
          ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    });

    /* 10d. Gallery tiles open like a shutter */
    document.querySelectorAll('.gallery__item').forEach((item) => {
      gsap.fromTo(item,
        { clipPath: 'inset(14% 10% 14% 10% round 22px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 22px)',
          ease: 'power3.out',
          duration: 1.3,
          scrollTrigger: { trigger: item, start: 'top 88%', once: true }
        });
    });

    /* 10e. Section titles: word-by-word rise */
    const splitWords = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        node.nodeValue.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const outer = document.createElement('span');
          outer.className = 'split-word';
          const inner = document.createElement('span');
          inner.textContent = part;
          outer.appendChild(inner);
          frag.appendChild(outer);
        });
        node.parentNode.replaceChild(frag, node);
      });
      return root.querySelectorAll('.split-word > span');
    };
    document.querySelectorAll('.section__title, .cta-block__title, .h-head__title, .h-cta h2').forEach((title) => {
      title.setAttribute('aria-label', title.textContent.replace(/\s+/g, ' ').trim());
      const words = splitWords(title);
      title.removeAttribute('data-reveal');
      title.style.opacity = 1;
      title.style.transform = 'none';
      gsap.from(words, {
        yPercent: 110,
        rotate: 4,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.045,
        scrollTrigger: { trigger: title, start: 'top 85%', once: true }
      });
    });

    /* 10f. Keyword marquee: speeds up and reverses with scroll velocity */
    const track = document.querySelector('.marquee__track');
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 40, repeat: -1 });
      let direction = 1;
      ScrollTrigger.create({
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (self.direction !== direction) direction = self.direction;
          const boost = Math.min(Math.abs(self.getVelocity()) / 120, 8);
          gsap.to(loop, { timeScale: direction * (1 + boost), duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: direction, duration: 1.2, delay: 0.2, ease: 'power2.out' });
        }
      });
    }

    /* 10g. Sector cards and FAQ rows cascade in from the side */
    document.querySelectorAll('.expertise__pillars, .faq').forEach((group) => {
      const items = group.querySelectorAll(':scope > li, :scope > details');
      if (!items.length) return;
      items.forEach((el) => { el.removeAttribute('data-reveal'); });
      gsap.from(items, {
        x: -40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 82%', once: true }
      });
    });

    /* Recalculate positions once images and fonts have loaded */
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ─── 11. Home v2: circuit-trace signature, statement fill, service bus, horizontal field ─── */
  const homeHero = document.querySelector('.h-hero');
  if (homeHero && hasGSAP && !prefersReducedMotion) {
    const drawable = (path) => {
      const len = path.getTotalLength ? path.getTotalLength() : 0;
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      return len;
    };

    /* 11a. Hero: one orchestrated load sequence */
    const heroLines = homeHero.querySelectorAll('.h-hero__title .line > span');
    const heroPaths = homeHero.querySelectorAll('.h-hero__traces path');
    const heroDots = homeHero.querySelectorAll('.h-hero__traces circle');
    heroPaths.forEach(drawable);
    const intro = gsap.timeline({ defaults: { ease: 'power4.out' } });
    intro
      .fromTo(homeHero.querySelector('.h-hero__media'), { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.4, ease: 'power3.inOut' }, 0)
      .fromTo(homeHero.querySelector('.h-hero__media img'), { scale: 1.25 }, { scale: 1, duration: 2 }, 0)
      .from(heroLines, { yPercent: 110, duration: 1.1, stagger: 0.12 }, 0.25)
      .from(homeHero.querySelectorAll('.h-hero__lede, .h-hero__actions'), { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.7)
      .to(heroPaths, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.15 }, 0.6)
      .from(heroDots, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.1, ease: 'back.out(3)' }, 1.9)
      .from(homeHero.querySelectorAll('.h-hero__plate > div'), { y: 20, opacity: 0, duration: 0.7, stagger: 0.08 }, 1.0);

    /* hero drifts out as you scroll away */
    gsap.to(homeHero.querySelector('.h-hero__media img'), {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: homeHero, start: 'top top', end: 'bottom top', scrub: true }
    });

    /* 11b. Statement: words fill from pale to ink as you read */
    const statement = document.querySelector('[data-fill]');
    if (statement) {
      const text = statement.textContent.replace(/\s+/g, ' ').trim();
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = text;
      statement.innerHTML = text.split(' ').map((w) => '<span class="w" aria-hidden="true">' + w + '</span>').join(' ');
      statement.prepend(sr);
      /* start colour keeps 3:1 on the steel background (large-text threshold) */
      gsap.fromTo(statement.querySelectorAll('.w'), { color: '#74849A' }, {
        color: '#0A1A2F', ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    }

    /* 11c. Services: the bus line draws down the column, each node lights up */
    const grid = document.querySelector('.h-services__grid');
    const bus = grid && grid.querySelector('.h-bus');
    if (bus) {
      const fill = bus.querySelector('.h-bus__line').cloneNode();
      fill.setAttribute('class', 'h-bus__fill');
      bus.appendChild(fill);
      gsap.fromTo(fill, { attr: { 'stroke-dasharray': '1000', 'stroke-dashoffset': 1000 } }, {
        attr: { 'stroke-dashoffset': 0 }, ease: 'none',
        scrollTrigger: { trigger: grid, start: 'top 60%', end: 'bottom 60%', scrub: true }
      });
    }
    document.querySelectorAll('[data-svc]').forEach((svc) => {
      ScrollTrigger.create({
        trigger: svc, start: 'top 60%', end: 'bottom 60%',
        onToggle: (self) => svc.classList.toggle('is-live', self.isActive)
      });
      const media = svc.querySelector('.svc__media');
      const img = svc.querySelector('.svc__media img');
      gsap.fromTo(media, { clipPath: 'inset(100% 0 0 0 round 10px)' }, {
        clipPath: 'inset(0% 0 0 0 round 10px)', duration: 1.2, ease: 'power3.inOut',
        scrollTrigger: { trigger: svc, start: 'top 80%', once: true }
      });
      gsap.fromTo(img, { yPercent: -8, scale: 1.2 }, {
        yPercent: 8, scale: 1.2, ease: 'none',
        scrollTrigger: { trigger: svc, start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.from(svc.querySelectorAll('.svc__body > *'), {
        y: 30, opacity: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out',
        scrollTrigger: { trigger: svc, start: 'top 75%', once: true }
      });
    });

    /* 11d. Sectors: columns rise in sequence */
    const sectors = document.querySelectorAll('.h-sector');
    if (sectors.length) {
      gsap.from(sectors, {
        y: 40, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: '.h-sectors__grid', start: 'top 80%', once: true }
      });
    }

    /* 11e. Field: pinned horizontal scroll through the photos (desktop only) */
    const field = document.querySelector('.h-field');
    const track = field && field.querySelector('.h-field__track');
    if (track) {
      ScrollTrigger.matchMedia({
        '(min-width: 861px)': () => {
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const tween = gsap.to(track, {
            x: () => -distance(), ease: 'none',
            scrollTrigger: {
              trigger: field.querySelector('.h-field__pin'), pin: true, scrub: 0.6,
              start: 'top top', end: () => '+=' + distance(), invalidateOnRefresh: true
            }
          });
          track.querySelectorAll('.shot img').forEach((img) => {
            gsap.fromTo(img, { xPercent: -6 }, {
              xPercent: 6, ease: 'none',
              scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
            });
          });
        }
      });
    }

    /* 11f. CTA traces draw when the block arrives */
    const ctaPaths = document.querySelectorAll('.h-cta__traces path');
    ctaPaths.forEach(drawable);
    if (ctaPaths.length) {
      gsap.to(ctaPaths, {
        strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.2,
        scrollTrigger: { trigger: '.h-cta', start: 'top 70%', once: true }
      });
    }
  }

  /* ─── 9. Footer year ─── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
