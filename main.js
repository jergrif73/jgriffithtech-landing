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
          else el.textContent = original;
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
});

