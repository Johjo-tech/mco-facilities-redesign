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
  if (false) { /* custom cursor retired in v2 — native pointer is used */
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
    document.querySelectorAll('.section__title, .cta-block__title, .h-head__title, .x-title, .h-cta h2').forEach((title) => {
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

  /* ─── 11. Home v3: live circuit field, decrypting headline, HUD clock, pinned services ─── */

  /* 11a. Circuit field — orthogonal traces like the logo, with light pulses running along them */
  const circuits = document.querySelectorAll('canvas[data-circuit]');
  circuits.forEach((canvas) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const isHero = canvas.dataset.circuit === 'hero';
    const GRID = 26;
    let w = 0, h = 0, dpr = 1, traces = [], pulses = [], running = false, raf = 0;
    const mouse = { x: -9999, y: -9999 };

    const rand = (a, b) => a + Math.random() * (b - a);
    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / GRID), rows = Math.ceil(h / GRID);
      /* hero: denser on the right so the headline stays readable */
      const count = Math.round((w * h) / (isHero ? 9000 : 12000));
      traces = [];
      for (let i = 0; i < count; i++) {
        const bias = isHero ? Math.pow(Math.random(), 0.55) : Math.random();
        let cx = Math.round(bias * cols), cy = Math.round(Math.random() * rows);
        const pts = [[cx * GRID, cy * GRID]];
        let dir = Math.random() < 0.5 ? 0 : 1;
        const segs = 2 + Math.floor(Math.random() * 3);
        for (let s = 0; s < segs; s++) {
          const len = 2 + Math.floor(Math.random() * 7);
          const sign = Math.random() < 0.5 ? -1 : 1;
          if (dir === 0) cx += sign * len; else cy += sign * len;
          pts.push([cx * GRID, cy * GRID]);
          dir = 1 - dir;
        }
        let length = 0;
        for (let k = 1; k < pts.length; k++) length += Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1]);
        const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const fade = isHero ? Math.min(1, Math.max(0.15, (mx / w - 0.2) * 1.6)) : 0.7;
        traces.push({ pts, length, fade, lit: 0 });
      }
      pulses = [];
    };

    const pointAt = (t, d) => {
      let left = d;
      for (let k = 1; k < t.pts.length; k++) {
        const [x0, y0] = t.pts[k - 1], [x1, y1] = t.pts[k];
        const seg = Math.abs(x1 - x0) + Math.abs(y1 - y0);
        if (left <= seg) { const r = seg ? left / seg : 0; return [x0 + (x1 - x0) * r, y0 + (y1 - y0) * r]; }
        left -= seg;
      }
      return t.pts[t.pts.length - 1];
    };

    const draw = (animate) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const t of traces) {
        const end = t.pts[t.pts.length - 1];
        const near = Math.hypot(end[0] - mouse.x, end[1] - mouse.y) < 180 ? 1 : 0;
        t.lit += (near - t.lit) * 0.08;
        const a = (0.13 + t.lit * 0.45) * t.fade;
        ctx.strokeStyle = 'rgba(92, 211, 255,' + a + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(t.pts[0][0], t.pts[0][1]);
        for (let k = 1; k < t.pts.length; k++) ctx.lineTo(t.pts[k][0], t.pts[k][1]);
        ctx.stroke();
        ctx.fillStyle = 'rgba(92, 211, 255,' + Math.min(1, a * 2.2) + ')';
        ctx.beginPath(); ctx.arc(end[0], end[1], 3 + t.lit * 2, 0, Math.PI * 2); ctx.fill();
      }
      if (!animate) return;
      if (pulses.length < traces.length / 5 && Math.random() < 0.35) {
        const t = traces[Math.floor(Math.random() * traces.length)];
        pulses.push({ t, d: 0, speed: rand(1.6, 3.4), warm: Math.random() < 0.12 });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.d += p.speed;
        if (p.d > p.t.length) { pulses.splice(i, 1); continue; }
        const [x, y] = pointAt(p.t, p.d);
        const [tx, ty] = pointAt(p.t, Math.max(0, p.d - 38));
        const col = p.warm ? '255, 122, 61' : '140, 228, 255';
        const g = ctx.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, 'rgba(' + col + ',0)'); g.addColorStop(1, 'rgba(' + col + ',' + (0.95 * p.t.fade + 0.05) + ')');
        ctx.strokeStyle = g; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = 'rgba(' + col + ',1)';
        ctx.shadowColor = 'rgba(' + col + ',0.9)'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    const loop = () => { draw(true); raf = requestAnimationFrame(loop); };
    const start = () => { if (running || prefersReducedMotion) return; running = true; loop(); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    build(); draw(false);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => (e[0].isIntersecting ? start() : stop())).observe(canvas);
    } else start();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); draw(false); }, 150); });
    const host = canvas.parentElement;
    host.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  });

  /* 11b. HUD clock (Paris time — the on-call line never sleeps) */
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Paris' });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 1000);
  }

  /* 11c. Headline decrypts on load */
  const scramble = document.querySelector('[data-scramble]');
  if (scramble && !prefersReducedMotion) {
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_';
    const full = scramble.textContent.replace(/\s+/g, ' ').trim();
    const sr = document.createElement('span');
    sr.className = 'sr-only'; sr.textContent = full;
    const lines = [...scramble.querySelectorAll('.line')];
    lines.forEach((l) => l.setAttribute('aria-hidden', 'true'));
    scramble.prepend(sr);
    lines.forEach((line, li) => {
      const target = line.textContent;
      const startAt = performance.now() + li * 220;
      const dur = 900 + target.length * 18;
      const step = (now) => {
        const t = Math.max(0, Math.min(1, (now - startAt) / dur));
        const reveal = Math.floor(t * target.length);
        let out = '';
        for (let i = 0; i < target.length; i++) {
          const ch = target[i];
          out += i < reveal || ch === ' ' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        line.textContent = out;
        if (t < 1) requestAnimationFrame(step); else line.textContent = target;
      };
      requestAnimationFrame(step);
    });
  }

  /* 11d. Sector cards: spotlight follows the pointer */
  document.querySelectorAll('.h-sector').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  if (document.querySelector('.x-hero') && hasGSAP && !prefersReducedMotion) {
    gsap.from('.x-hero__status, .x-hero__lede, .x-hero__actions', { y: 24, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.5 });
    gsap.from('.x-hud > div', { y: 20, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out', delay: 0.9 });
    gsap.to('.x-hero__inner', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.x-hero', start: 'top top', end: 'bottom top', scrub: true } });
    /* hero photo: settles in on load, then pushes in and dims as you scroll away */
    const heroPhoto = document.querySelector('.x-hero__photo img');
    if (heroPhoto) {
      gsap.fromTo(heroPhoto, { scale: 1.22, opacity: 0 }, { scale: 1.05, opacity: 1, duration: 2.2, ease: 'power3.out' });
      gsap.to(heroPhoto, { scale: 1.3, yPercent: 6, filter: 'brightness(0.55)', ease: 'none', scrollTrigger: { trigger: '.x-hero', start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* 11e. Statement fills in as you read */
    const statement = document.querySelector('[data-fill]');
    if (statement) {
      const text = statement.textContent.replace(/\s+/g, ' ').trim();
      const sr = document.createElement('span');
      sr.className = 'sr-only'; sr.textContent = text;
      statement.innerHTML = text.split(' ').map((w) => '<span class="w" aria-hidden="true">' + w + '</span>').join(' ');
      statement.prepend(sr);
      /* start colour keeps 3:1 on the dark background (large-text threshold) */
      gsap.fromTo(statement.querySelectorAll('.w'), { color: '#5E7189' }, {
        color: '#EAF3FB', ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true }
      });
    }

    /* 11f. Services: pin the stage, scroll steps through the four trades */
    const svc = document.querySelector('.x-svc');
    if (svc) {
      const panels = [...svc.querySelectorAll('[data-panel]')];
      const arts = [...svc.querySelectorAll('[data-art]')];
      const navItems = [...svc.querySelectorAll('.x-svc__nav li')];
      const bar = svc.querySelector('.x-svc__progress > span');
      let current = -1;
      const drawArt = (svg) => {
        const paths = svg.querySelectorAll('path, circle');
        paths.forEach((p) => { const L = p.getTotalLength ? p.getTotalLength() : 200; p.style.strokeDasharray = p.classList.contains('x-art__ring') ? '' : L; p.style.strokeDashoffset = p.classList.contains('x-art__ring') ? '' : L; });
        gsap.to([...paths].filter((p) => !p.classList.contains('x-art__ring')), { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: 0.06, overwrite: true });
        gsap.fromTo(svg.querySelectorAll('.x-art__ring'), { opacity: 0 }, { opacity: 1, duration: 0.8, delay: 0.5 });
      };
      const show = (i) => {
        if (i === current) return;
        current = i;
        panels.forEach((p, k) => p.classList.toggle('is-active', k === i));
        arts.forEach((a, k) => a.classList.toggle('is-active', k === i));
        navItems.forEach((n, k) => n.classList.toggle('is-active', k === i));
        if (arts[i]) drawArt(arts[i]);
      };
      ScrollTrigger.matchMedia({
        '(min-width: 961px)': () => {
          show(0);
          ScrollTrigger.create({
            trigger: svc.querySelector('.x-svc__pin'), pin: true, start: 'top top', end: '+=' + panels.length * 80 + '%',
            onUpdate: (self) => {
              if (bar) bar.style.height = (self.progress * 100) + '%';
              show(Math.min(panels.length - 1, Math.floor(self.progress * panels.length)));
            }
          });
        }
      });
    }

    /* CTA backdrop: the plant slowly comes closer as the block scrolls through */
    const ctaPhoto = document.querySelector('.h-cta__photo img');
    if (ctaPhoto) {
      gsap.fromTo(ctaPhoto, { scale: 1.25, yPercent: -6 }, { scale: 1.02, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.h-cta', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    /* 11g. Sectors rise in sequence */
    gsap.from('.h-sector', { y: 40, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.h-sectors__grid', start: 'top 80%', once: true } });

    /* 11h. Field: pinned horizontal scroll through the photos (desktop only) */
    const field = document.querySelector('.h-field');
    const track = field && field.querySelector('.h-field__track');
    if (track) {
      ScrollTrigger.matchMedia({
        '(min-width: 861px)': () => {
          const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const tween = gsap.to(track, {
            x: () => -distance(), ease: 'none',
            scrollTrigger: { trigger: field.querySelector('.h-field__pin'), pin: true, scrub: 0.6, start: 'top top', end: () => '+=' + distance(), invalidateOnRefresh: true }
          });
          track.querySelectorAll('.shot img').forEach((img) => {
            gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
          });
        }
      });
    }
  }

  /* ─── 9. Footer year ─── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
