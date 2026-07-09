/* ============================================
   JGriffith Tech - Main JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Enable scroll animations (content visible by default if JS fails)
  document.documentElement.classList.add('js-loaded');

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
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

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
        if (stack && y < 900) stack.style.translate = '0 ' + y * 0.06 + 'px';
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
            // Treat styled spans (.accent, .strike) as single reveal units
            child.classList.add('w');
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
  // PASS 2: Hero particle constellation
  // ============================================
  document.querySelectorAll('.hero-particles').forEach(canvas => {
    if (reducedMotion) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    let w = 0, h = 0, pts = [], raf = null;
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
    const LINK = 130 * 130;
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
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
});
