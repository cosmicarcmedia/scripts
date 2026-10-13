(() => {
  window.__jp = 1;
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // One rAF-throttled scroll loop drives every scroll-linked piece.
  const tasks = [];
  let queued = false;
  const kick = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tasks.forEach(t => t()); });
  };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);

  // Menu
  const bar = $('#bar');
  const menuBtn = $('.menu-btn');
  const closeMenu = () => { bar.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => menuBtn.setAttribute('aria-expanded', String(bar.classList.toggle('open'))));
  $$('.nav a').forEach(a => a.addEventListener('click', closeMenu));

  // Reveals: checked by position, so deep links and restored scroll never leave content hidden.
  const rv = $$('.rv');
  const show = e => { e.classList.add('in'); setTimeout(() => e.classList.add('settled'), 1100); };
  if (rm) rv.forEach(show);
  else tasks.push(() => {
    const line = innerHeight * 0.9;
    rv.forEach(e => { if (!e.classList.contains('in') && e.getBoundingClientRect().top < line) show(e); });
  });

  // Hero photo drifts with the scroll.
  const heroImg = $('.hero-photo img');
  if (heroImg && !rm) tasks.push(() => {
    const y = scrollY;
    if (y < innerHeight * 1.3) heroImg.style.transform = `translate3d(0, ${(y * 0.1).toFixed(1)}px, 0)`;
  });

  // Field guide: scroll position picks the pest on wide screens.
  const track = $('.guide-track');
  if (track) {
    const btns = $$('.guide-list button');
    const specs = $$('.spec');
    const n = specs.length;
    const wide = matchMedia('(min-width: 900px)');
    let cur = -1;
    const set = i => {
      if (i === cur) return;
      cur = i;
      btns.forEach((b, j) => b.setAttribute('aria-current', j === i ? 'true' : 'false'));
      specs.forEach((s, j) => s.classList.toggle('on', j === i));
    };
    set(0);
    tasks.push(() => {
      if (!wide.matches) return;
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      if (span > 0) set(Math.min(n - 1, Math.floor(clamp(-r.top / span) * n)));
    });
    btns.forEach((b, i) => b.addEventListener('click', () => {
      if (!wide.matches) { set(i); return; }
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      scrollTo({ top: scrollY + r.top + span * (i + 0.5) / n, behavior: rm ? 'auto' : 'smooth' });
    }));
  }

  // Family: the big year follows the story.
  const yr = $('.yr');
  const evs = $$('.ev');
  if (yr && evs.length) {
    let cur = null;
    let anim = 0;
    const setYear = to => {
      const from = cur;
      cur = to;
      evs.forEach(e => e.classList.toggle('cur', e.dataset.year === to));
      const a = parseInt(from, 10);
      const b = parseInt(to, 10);
      if (rm || isNaN(a) || isNaN(b)) { yr.textContent = to; anim++; return; }
      const id = ++anim;
      const t0 = performance.now();
      const step = t => {
        if (id !== anim) return;
        const k = clamp((t - t0) / 520);
        yr.textContent = k < 1 ? String(Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3)))) : to;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    tasks.push(() => {
      const line = innerHeight * 0.55;
      let a = evs[0];
      evs.forEach(e => { if (e.getBoundingClientRect().top < line) a = e; });
      if (a.dataset.year !== cur) setYear(a.dataset.year);
    });
  }

  // Service area: routes drive out from Junction as the map comes up.
  const map = $('.map-svg svg');
  if (map) {
    const countyOf = {
      bandera: 'bandera', brady: 'mcculloch', campwood: 'real', eden: 'concho', eldorado: 'schleicher',
      kerrville: 'kerr', leakey: 'real', mason: 'mason', menard: 'menard', ozona: 'crockett',
      rocksprings: 'edwards', sonora: 'sutton'
    };
    const routes = $$('.route', map).map(p => {
      const L = p.getTotalLength();
      const slug = p.id.slice(2);
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = String(L);
      return { p, L, slug, town: map.querySelector('#t-' + slug) };
    });
    const maxL = Math.max(...routes.map(r => r.L));
    const counties = $$('.county', map);
    map.querySelector('#c-kimble')?.classList.add('on');
    map.querySelector('#t-junction')?.classList.add('on');
    const draw = p => {
      const d = p * maxL;
      const lit = new Set(['kimble']);
      routes.forEach(r => {
        const k = clamp(d / r.L);
        r.p.style.strokeDashoffset = String(r.L * (1 - k));
        r.town?.classList.toggle('on', k >= 1);
        if (k >= 1) lit.add(countyOf[r.slug]);
      });
      counties.forEach(c => c.classList.toggle('on', lit.has(c.id.slice(2))));
    };
    if (rm) draw(1);
    else tasks.push(() => {
      const r = map.getBoundingClientRect();
      draw(clamp((innerHeight * 0.85 - r.top) / (r.height * 0.85)));
    });
  }

  // Blacklight hunt.
  const st = $('.uv-stage');
  if (st) {
    const targets = JSON.parse(st.dataset.targets);
    const iw = +st.dataset.w;
    const ih = +st.dataset.h;
    const nEl = $('.uv-n');
    const how = $('.uv-how');
    if (how && matchMedia('(hover: none)').matches) how.textContent = 'Tap or drag across the wall.';
    const marks = targets.map(() => {
      const m = document.createElement('span');
      m.className = 'uv-mark';
      m.setAttribute('aria-hidden', 'true');
      st.appendChild(m);
      return m;
    });
    const found = new Set();
    let R = 160;
    let lastUser = -1e9;
    let inView = false;
    let finished = false;
    const box = () => {
      const W = st.clientWidth;
      const H = st.clientHeight;
      const s = Math.max(W / iw, H / ih);
      return { W, H, s, ox: (W - iw * s) / 2, oy: (H - ih * s) / 2 };
    };
    const at = (t, b) => [b.ox + t[0] * iw * b.s, b.oy + t[1] * ih * b.s];
    const layout = () => {
      const b = box();
      R = b.W < 700 ? clamp(b.W * 0.2, 64, 120) : clamp(b.W * 0.13, 120, 230);
      st.style.setProperty('--r', (finished ? Math.hypot(b.W, b.H) : R) + 'px');
      targets.forEach((t, i) => {
        const [x, y] = at(t, b);
        marks[i].style.left = x + 'px';
        marks[i].style.top = y + 'px';
      });
    };
    const finish = () => {
      finished = true;
      st.classList.add('all');
      st.parentElement.classList.add('all');
      const big = Math.hypot(st.clientWidth, st.clientHeight);
      if (rm) { st.style.setProperty('--r', big + 'px'); return; }
      const t0 = performance.now();
      const r0 = R;
      const grow = t => {
        const k = clamp((t - t0) / 1200);
        st.style.setProperty('--r', (r0 + (big - r0) * k * k * (3 - 2 * k)) + 'px');
        if (k < 1) requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);
    };
    const light = (x, y, byUser) => {
      st.style.setProperty('--x', x + 'px');
      st.style.setProperty('--y', y + 'px');
      if (!byUser || finished) return;
      const b = box();
      targets.forEach((t, i) => {
        if (found.has(i)) return;
        const [tx, ty] = at(t, b);
        if (Math.hypot(tx - x, ty - y) < R * 0.6) {
          found.add(i);
          marks[i].classList.add('on');
          nEl.textContent = String(found.size);
          if (found.size === targets.length) finish();
        }
      });
    };
    const fromPointer = e => {
      const r = st.getBoundingClientRect();
      lastUser = performance.now();
      light(e.clientX - r.left, e.clientY - r.top, true);
    };
    st.addEventListener('pointermove', fromPointer);
    st.addEventListener('pointerdown', fromPointer);
    layout();
    addEventListener('resize', layout);
    light(st.clientWidth * 0.5, st.clientHeight * 0.45, false);
    tasks.push(() => {
      const r = st.getBoundingClientRect();
      inView = r.top < innerHeight && r.bottom > 0;
    });
    if (!rm) {
      const sweep = t => {
        if (inView && !finished && performance.now() - lastUser > 2600) {
          const b = box();
          light(b.W * (0.5 + 0.36 * Math.sin(t / 2600)), b.H * (0.5 + 0.3 * Math.sin(t / 1900 + 1.3)), false);
        }
        requestAnimationFrame(sweep);
      };
      requestAnimationFrame(sweep);
    }
  }

  // Phone dock hides while another call button is already on screen.
  const dock = $('.dock');
  const heroCta = $('.hero-cta');
  const band = $('.call-band');
  if (dock) tasks.push(() => {
    const h = innerHeight;
    const vis = el => { const r = el.getBoundingClientRect(); return r.top < h && r.bottom > 0; };
    dock.classList.toggle('hide', vis(heroCta) || vis(band));
  });

  // The note form writes an email to the office in the visitor's own mail app.
  const form = $('#note');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim();
    const body = [
      `Name: ${name}`,
      `Phone: ${String(f.get('phone') || '').trim()}`,
      `Town: ${f.get('town')}`,
      `What's bugging me: ${f.get('pest')}`,
      '',
      String(f.get('msg') || '').trim()
    ].join('\n');
    const subject = name ? `Service request from ${name}` : 'Service request';
    location.href = `mailto:info@johnsonspest.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  kick();
  addEventListener('load', kick);
})();
