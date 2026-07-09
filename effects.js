/* ============================================
   JGriffith Tech - effects.js (index only)
   Three.js live rolling-offset model + GSAP
   scroll-driven scenes. Everything here is a
   progressive enhancement with fallbacks.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ==========================================================
  // LIVE 3D ROLLING OFFSET (Three.js) - replaces the spotlight
  // screenshot with a draggable, rotating pipe model
  // ==========================================================
  const host = document.getElementById('offset3d-widget');
  if (host && !reducedMotion && typeof THREE !== 'undefined' && window.WebGLRenderingContext) {
    try {
      // Real rolling-offset math (inches), shown in the readouts
      const RISE = 24, ROLL = 14, FITTING = 45;
      const TRUE_OFFSET = Math.sqrt(RISE * RISE + ROLL * ROLL);
      const TRAVEL = TRUE_OFFSET / Math.sin(FITTING * Math.PI / 180);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 100);
      camera.position.set(0, 1.4, 11.5);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border-radius:12px;';

      // Fallback screenshot no longer needed
      const fb = host.querySelector('.widget-fallback');
      if (fb) fb.remove();
      host.classList.add('live');

      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 0.9);
      key.position.set(4, 6, 6);
      scene.add(key);
      const goldFill = new THREE.PointLight(0xD4A926, 0.7, 30);
      goldFill.position.set(-5, -2, 4);
      scene.add(goldFill);

      const group = new THREE.Group();
      scene.add(group);

      // Pipe route: run in, rolling offset, run out (scene units)
      const S = 0.09; // inches -> scene scale
      const A = new THREE.Vector3(-5.6, -RISE * S * 0.5, -ROLL * S * 0.5);
      const B = new THREE.Vector3(-1.4, -RISE * S * 0.5, -ROLL * S * 0.5);
      const C = new THREE.Vector3(1.4, RISE * S * 0.5, ROLL * S * 0.5);
      const D = new THREE.Vector3(5.6, RISE * S * 0.5, ROLL * S * 0.5);
      const path = [A, B, C, D];

      const pipeMat = new THREE.MeshStandardMaterial({ color: 0xD4A926, metalness: 0.65, roughness: 0.35 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x7A8B6F, metalness: 0.5, roughness: 0.45 });
      const R = 0.26;

      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length();
        const geo = new THREE.CylinderGeometry(R, R, len, 28);
        const mesh = new THREE.Mesh(geo, pipeMat);
        mesh.position.copy(a).addScaledVector(dir, 0.5);
        mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize());
        group.add(mesh);
      }
      // Joints (45-degree fittings) + open ends
      [B, C].forEach(p => {
        const j = new THREE.Mesh(new THREE.SphereGeometry(R * 1.32, 28, 28), jointMat);
        j.position.copy(p);
        group.add(j);
      });
      [A, D].forEach(p => {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 20), pipeMat);
        cap.position.copy(p);
        group.add(cap);
      });

      // Dashed guide box showing rise & roll of the offset
      const guideMat = new THREE.LineDashedMaterial({ color: 0x95a888, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.65 });
      const guidePts = [
        B, new THREE.Vector3(C.x, B.y, B.z),
        new THREE.Vector3(C.x, B.y, B.z), new THREE.Vector3(C.x, C.y, B.z),
        new THREE.Vector3(C.x, C.y, B.z), C
      ];
      const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePts);
      const guide = new THREE.LineSegments(guideGeo, guideMat);
      guide.computeLineDistances();
      group.add(guide);

      // Fluid flow: glowing beads traveling the route
      const beadMat = new THREE.MeshBasicMaterial({ color: 0xfff3c9 });
      const segLens = [];
      let totalLen = 0;
      for (let i = 1; i < path.length; i++) {
        const l = path[i].distanceTo(path[i - 1]);
        segLens.push(l); totalLen += l;
      }
      const beads = Array.from({ length: 5 }, (_, k) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), beadMat);
        m.userData.t = k / 5;
        group.add(m);
        return m;
      });
      const posAt = (t) => {
        let d = t * totalLen;
        for (let i = 0; i < segLens.length; i++) {
          if (d <= segLens[i]) {
            return new THREE.Vector3().lerpVectors(path[i], path[i + 1], d / segLens[i]);
          }
          d -= segLens[i];
        }
        return path[path.length - 1].clone();
      };

      group.rotation.x = 0.14;

      // Drag to orbit (fine pointers), with inertia
      let dragging = false, px = 0, py = 0, vy = 0.0035, vx = 0, userHold = 0;
      if (window.matchMedia('(pointer: fine)').matches) {
        host.style.cursor = 'grab';
        host.addEventListener('pointerdown', e => {
          dragging = true; px = e.clientX; py = e.clientY;
          host.style.cursor = 'grabbing'; userHold = 2000;
        });
        window.addEventListener('pointermove', e => {
          if (!dragging) return;
          vy = (e.clientX - px) * 0.00045 + 0.0005;
          vx = (e.clientY - py) * 0.00035;
          group.rotation.y += (e.clientX - px) * 0.006;
          group.rotation.x = Math.max(-0.7, Math.min(0.8, group.rotation.x + (e.clientY - py) * 0.004));
          px = e.clientX; py = e.clientY;
        });
        window.addEventListener('pointerup', () => {
          dragging = false;
          host.style.cursor = 'grab';
        });
      }

      // Scroll adds a touch of spin (velocity-reactive)
      let lastScroll = window.scrollY;
      window.addEventListener('scroll', () => {
        const d = window.scrollY - lastScroll;
        lastScroll = window.scrollY;
        group.rotation.y += Math.max(-0.05, Math.min(0.05, d * 0.0006));
      }, { passive: true });

      const resize = () => {
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let raf = null, flowT = 0;
      const tick = () => {
        if (!dragging) {
          if (userHold > 0) userHold -= 16;
          group.rotation.y += vy;
          group.rotation.x += vx;
          vx *= 0.95;
          vy += (0.0035 - vy) * (userHold > 0 ? 0.002 : 0.02);
          group.rotation.x += (0.14 - group.rotation.x) * (userHold > 0 ? 0 : 0.01);
        }
        flowT = (flowT + 0.0022) % 1;
        beads.forEach(b => b.position.copy(posAt((b.userData.t + flowT) % 1)));
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      const vis = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && raf === null) raf = requestAnimationFrame(tick);
          else if (!entry.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
        });
      });
      vis.observe(host);

      // Real readouts from the math above
      const ro = document.getElementById('offset3d-readouts');
      if (ro) {
        ro.innerHTML =
          '<div class="readout-block"><div class="readout-lbl">Travel</div><div class="readout-val-big">' + TRAVEL.toFixed(2) + '"</div></div>' +
          '<div class="readout-block"><div class="readout-lbl">True Offset</div><div class="readout-val-big">' + TRUE_OFFSET.toFixed(2) + '"</div></div>' +
          '<div class="readout-block"><div class="readout-lbl">Fitting</div><div class="readout-val-big">' + FITTING + '&deg;</div></div>';
      }
    } catch (err) {
      // WebGL unavailable: the fallback screenshot stays in place
      console.warn('Offset3D widget fallback:', err);
    }
  }

  // ==========================================================
  // GSAP SCROLL SCENES (progressive, index only)
  // ==========================================================
  if (!reducedMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    // Hero content drifts up and fades as you scroll past it
    if (document.querySelector('.hero-v2 .container')) {
      gsap.to('.hero-v2 .container', {
        y: -70, opacity: 0.15, ease: 'none',
        scrollTrigger: { trigger: '.hero-v2', start: '55% 40%', end: 'bottom 5%', scrub: 0.6 }
      });
    }

    // Velocity-reactive marquee: scrolling faster spins it faster
    const track = document.querySelector('.tool-marquee-track');
    if (track) {
      track.style.animation = 'none';
      const loop = gsap.to(track, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
      let boost = 0;
      ScrollTrigger.create({
        onUpdate: self => {
          boost = Math.min(4, Math.abs(self.getVelocity()) / 350);
          gsap.to(loop, { timeScale: 1 + boost, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: 1, duration: 1.2, delay: 0.25, overwrite: false });
        }
      });
    }

    // Screenshots gently zoom as their card travels the viewport
    gsap.utils.toArray('.pc-shot').forEach(img => {
      gsap.fromTo(img, { scale: 1.12 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: img, start: 'top 95%', end: 'top 35%', scrub: 0.8 }
      });
    });

    // CTA band headline slides in from the sides
    if (document.querySelector('.cta-band')) gsap.from('.cta-band h2', {
      x: -60, opacity: 0, ease: 'power2.out',
      scrollTrigger: { trigger: '.cta-band', start: 'top 75%' }
    });
    if (document.querySelector('.cta-band')) gsap.from('.cta-band p, .cta-band .btn', {
      y: 30, opacity: 0, stagger: 0.08, ease: 'power2.out',
      scrollTrigger: { trigger: '.cta-band', start: 'top 70%' }
    });
  }
});
