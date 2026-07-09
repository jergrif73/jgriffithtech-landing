/* ============================================
   JGriffith Tech - Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Enable scroll animations (content visible by default if JS fails)
  document.documentElement.classList.add('js-loaded');

  // First impression: brand stinger — gold pipe draws across a dark veil,
  // then the veil lifts. Once per session, skipped for reduced motion.
  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !sessionStorage.getItem('jgtIntroSeen')) {
      sessionStorage.setItem('jgtIntroSeen', '1');
      const veil = document.createElement('div');
      veil.id = 'intro-veil';
      veil.innerHTML = '<svg viewBox="0 0 600 120" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path class="veil-pipe" d="M20 90 H 230 L 330 30 H 580" stroke="#D4A926" stroke-width="6" stroke-linecap="round"/>' +
        '<circle class="veil-joint vj1" cx="230" cy="90" r="9" fill="#7A8B6F"/>' +
        '<circle class="veil-joint vj2" cx="330" cy="30" r="9" fill="#7A8B6F"/>' +
        '</svg><div class="veil-brand">JGRIFFITH <span>TECH</span></div>';
      document.body.appendChild(veil);
      setTimeout(() => veil.classList.add('lift'), 1050);
      setTimeout(() => veil.remove(), 1750);
    }
  } catch (e) { /* sessionStorage unavailable: skip intro */ }

  // Nav scroll effect
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      const isOpen = links.classList.contains('open');
      toggle.innerHTML = isOpen
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>';
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => links.classList.remove('open'));
  });

  // Scroll animations
  const commitReveal = (el) => {
    // Belt-and-suspenders: hard-commit the revealed state so content can
    // never be left dimmed/blurred if a transition stalls or a class is lost
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.filter = 'none';
    }, 1400);
  };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        commitReveal(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

  // Sweep for anything the observer missed (5 passes over 7.5s)
  let sweepCount = 0;
  const sweep = setInterval(() => {
    document.querySelectorAll('.animate-on-scroll:not(.visible)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight - 40 && r.bottom > 0) {
        el.classList.add('visible');
        commitReveal(el);
      }
    });
    if (++sweepCount >= 5) clearInterval(sweep);
  }, 1500);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Advanced 3D Parallax Tilt & Spotlight Glow Effect
  const cards = document.querySelectorAll('.product-card-v2');
  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Spotlight coordinates
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      
      // 3D Parallax Tilt Calculation (max 8 degrees)
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      
      card.style.setProperty('--rot-x', `${rotateX}deg`);
      card.style.setProperty('--rot-y', `${rotateY}deg`);
    });

    // Reset tilt smoothly when mouse leaves
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rot-x', '0deg');
      card.style.setProperty('--rot-y', '0deg');
    });
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ============================================
  // Scroll progress bar (gold, top of viewport)
  // ============================================
  const progress = document.createElement('div');
  progress.id = 'scroll-progress';
  document.body.appendChild(progress);
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = max > 0 ? (window.scrollY / max) * 100 + '%' : '0%';
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ============================================
  // Count-up stats (animates .stat-num when visible)
  // ============================================
  const statNums = document.querySelectorAll('.stat-num');
  if (statNums.length && !reducedMotion) {
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        statObserver.unobserve(el);
        const original = el.textContent.trim();
        const m = original.match(/^([^0-9]*)(\d+)(.*)$/);
        if (!m) return;
        const prefix = m[1], target = parseInt(m[2], 10), suffix = m[3];
        if (target === 0) return;
        const dur = 1500;
        const start = performance.now();
        el.textContent = prefix + '0' + suffix;
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          el.textContent = prefix + Math.round(eased * target) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else { el.textContent = original; el.classList.add('counted'); }
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    statNums.forEach(el => statObserver.observe(el));
  }

  // ============================================
  // Parallax hero glows + phone stack drift
  // ============================================
  if (!reducedMotion) {
    const glow1 = document.querySelector('.hero-v2-glow-1');
    const glow2 = document.querySelector('.hero-v2-glow-2');
    const stack = document.querySelector('.phone-stack');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        if (glow1) glow1.style.transform = 'translateY(' + y * 0.28 + 'px)';
        if (glow2) glow2.style.transform = 'translateY(' + y * -0.18 + 'px)';
        if (stack && y < 900 && !window.gsap) stack.style.translate = '0 ' + y * 0.06 + 'px';
        ticking = false;
      });
    }, { passive: true });
  }

  // ============================================
  // Hero pipe draw-in (index only, .hero-pipe-svg)
  // ============================================
  const pipeSvg = document.querySelector('.hero-pipe-svg');
  if (pipeSvg && !reducedMotion) {
    // Kick off the CSS draw animation once the hero is on screen
    requestAnimationFrame(() => pipeSvg.classList.add('draw'));
  }

  // ============================================
  // PASS 2: Headline word-by-word reveal
  // ============================================
  if (!reducedMotion) {
    document.querySelectorAll('.hero-v2 h1').forEach(h1 => {
      let wi = 0;
      const wrap = (node) => {
        [...node.childNodes].forEach(child => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach(part => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              const s = document.createElement('span');
              s.className = 'w';
              s.style.setProperty('--wi', wi++);
              s.textContent = part;
              frag.appendChild(s);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== 'BR') {
            // Styled spans (.accent, .strike) stay inline and fade in,
            // so the headline wraps exactly like the original design
            child.classList.add('wf');
            child.style.setProperty('--wi', wi++);
          }
        });
      };
      wrap(h1);
    });
  }

  // ============================================
  // PASS 2: Magnetic buttons (fine pointers only)
  // ============================================
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = 'translate(' + (dx * 0.14).toFixed(1) + 'px, ' + (dy * 0.3).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  // ============================================
  // PASS 2: Phone stack follows the cursor in 3D
  // ============================================
  const stackEl = document.querySelector('.phone-stack');
  const heroEl = document.querySelector('.hero-v2');
  if (stackEl && heroEl && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    heroEl.addEventListener('mousemove', e => {
      if (window.innerWidth < 901) return;
      const r = heroEl.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      stackEl.style.transform = 'perspective(1200px) rotateY(' + (nx * 10).toFixed(2) + 'deg) rotateX(' + (-ny * 8).toFixed(2) + 'deg)';
    });
    heroEl.addEventListener('mouseleave', () => { stackEl.style.transform = ''; });
  }

  // ============================================
  // PASS 3: Hero particle constellation with
  // cursor repel + self-drawing circuit traces
  // ============================================
  document.querySelectorAll('.hero-particles').forEach(canvas => {
    if (reducedMotion) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    let w = 0, h = 0, pts = [], traces = [], raf = null;
    const mouse = { x: -9999, y: -9999 };
    parent.addEventListener('mousemove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    parent.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    const resize = () => {
      w = canvas.width = parent.offsetWidth;
      h = canvas.height = parent.offsetHeight;
      const n = Math.min(70, Math.max(24, Math.floor(w / 20)));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.6,
        gold: Math.random() < 0.6
      }));
    };

    // Circuit trace: an orthogonal "duct run" drawing itself across the hero
    const spawnTrace = () => {
      const segs = [];
      let x = -20, y = h * (0.15 + Math.random() * 0.7);
      segs.push({ x, y });
      while (x < w + 40) {
        x += 90 + Math.random() * 220;
        segs.push({ x, y });
        if (x < w - 60 && Math.random() < 0.75) {
          y = Math.max(20, Math.min(h - 20, y + (Math.random() - 0.5) * h * 0.5));
          segs.push({ x, y });
        }
      }
      // total length for dash animation
      let len = 0;
      for (let i = 1; i < segs.length; i++)
        len += Math.abs(segs[i].x - segs[i-1].x) + Math.abs(segs[i].y - segs[i-1].y);
      traces.push({ segs, len, t: 0, dur: 2600 + Math.random() * 1200, born: performance.now() });
    };
    let lastSpawn = 0;

    const LINK = 130 * 130;
    const tick = (now) => {
      ctx.clearRect(0, 0, w, h);

      // traces
      if (now - lastSpawn > 3400 && traces.length < 2) { spawnTrace(); lastSpawn = now; }
      traces = traces.filter(tr => now - tr.born < tr.dur + 900);
      for (const tr of traces) {
        const p = Math.min((now - tr.born) / tr.dur, 1);
        const fade = now - tr.born > tr.dur ? 1 - (now - tr.born - tr.dur) / 900 : 1;
        const drawn = tr.len * (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
        ctx.strokeStyle = 'rgba(212,169,38,' + (0.28 * fade).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let rem = drawn, prev = tr.segs[0];
        ctx.moveTo(prev.x, prev.y);
        for (let i = 1; i < tr.segs.length && rem > 0; i++) {
          const seg = tr.segs[i];
          const segLen = Math.abs(seg.x - prev.x) + Math.abs(seg.y - prev.y);
          if (rem >= segLen) { ctx.lineTo(seg.x, seg.y); rem -= segLen; prev = seg; }
          else {
            const f = rem / segLen;
            ctx.lineTo(prev.x + (seg.x - prev.x) * f, prev.y + (seg.y - prev.y) * f);
            rem = 0;
          }
        }
        ctx.stroke();
        // joint nodes at completed corners
        let acc = 0;
        for (let i = 1; i < tr.segs.length - 1; i++) {
          acc += Math.abs(tr.segs[i].x - tr.segs[i-1].x) + Math.abs(tr.segs[i].y - tr.segs[i-1].y);
          if (acc <= drawn) {
            ctx.beginPath();
            ctx.arc(tr.segs[i].x, tr.segs[i].y, 3, 0, 6.2832);
            ctx.fillStyle = 'rgba(122,139,111,' + (0.6 * fade).toFixed(3) + ')';
            ctx.fill();
          }
        }
      }

      // particles (with cursor repel)
      for (const p of pts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 10000 && d2 > 1) {
          const d = Math.sqrt(d2), f = (100 - d) / 100 * 0.6;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx *= 0.96; p.vy *= 0.96;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp < 0.12) { p.vx += (Math.random() - 0.5) * 0.1; p.vy += (Math.random() - 0.5) * 0.1; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        p.x = Math.max(0, Math.min(w, p.x));
        p.y = Math.max(0, Math.min(h, p.y));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = p.gold ? 'rgba(212,169,38,0.55)' : 'rgba(122,139,111,0.5)';
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK) {
            ctx.strokeStyle = 'rgba(212,169,38,' + (0.13 * (1 - d2 / LINK)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && raf === null) raf = requestAnimationFrame(tick);
        else if (!entry.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      });
    });
    resize();
    vis.observe(parent);
    window.addEventListener('resize', resize);
  });

  // ============================================
  // PASS 3: Custom cursor - gold dot + easing ring
  // ============================================
  if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    document.documentElement.classList.add('has-cursor-fx');
    const dot = document.createElement('div'); dot.id = 'cursor-dot';
    const ring = document.createElement('div'); ring.id = 'cursor-ring';
    dot.style.opacity = '0'; ring.style.opacity = '0';
    document.body.appendChild(dot); document.body.appendChild(ring);
    let mx = 0, my = 0, rx = 0, ry = 0, shown = false;
    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!shown) { shown = true; dot.style.opacity = '1'; ring.style.opacity = '1'; }
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    });
    document.addEventListener('mouseleave', () => {
      shown = false; dot.style.opacity = '0'; ring.style.opacity = '0';
    });
    const follow = () => {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(follow);
    };
    follow();
    const hoverSel = 'a, button, .btn, .product-card-v2, .tester-step, .feature-card';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverSel)) ring.classList.add('hovering');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverSel)) ring.classList.remove('hovering');
    });
  }

  // ============================================
  // PASS 3: Eyebrow decode/scramble on reveal
  // ============================================
  if (!reducedMotion) {
    const CHARS = '#/\\|=+<>*';
    document.querySelectorAll('.section-eyebrow-v2').forEach(eb => {
      const finalText = eb.textContent;
      const ob = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          ob.unobserve(eb);
          const start = performance.now(), dur = 700;
          const step = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const settled = Math.floor(finalText.length * p);
            let out = finalText.slice(0, settled);
            for (let i = settled; i < finalText.length; i++) {
              out += finalText[i] === ' ' ? ' ' : CHARS[(Math.random() * CHARS.length) | 0];
            }
            eb.textContent = out;
            if (p < 1) requestAnimationFrame(step);
            else eb.textContent = finalText;
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.5 });
      ob.observe(eb);
    });
  }

  // ============================================
  // PASS 3: Hand product cards back to the tilt
  // engine once their flip-in reveal finishes
  // ============================================
  document.querySelectorAll('.product-card-v2.animate-on-scroll').forEach(card => {
    card.addEventListener('transitionend', function onEnd(e) {
      if (e.propertyName === 'transform' && card.classList.contains('visible')) {
        card.classList.add('revealed');
        card.removeEventListener('transitionend', onEnd);
      }
    });
  });
});
