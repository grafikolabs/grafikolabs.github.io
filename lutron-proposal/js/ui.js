/* ------------------------------------------------------------------
   ui.js — everything the document does.
   Generated sections, the keypad, the readout, and the two calculators.
------------------------------------------------------------------ */
import { LAYERS, SCENES, SPACE_SETS, kelvinToHex, sceneById } from './scenes.js';
import {
  TIER, POST_FEE, PLAN, DEFAULT_BUILD, REFS, STAGES, GANTT,
  INPUTS, EXCLUSIONS, SLABS, DIST, PACKAGES,
} from './data.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const money = n => '$' + n.toLocaleString('en-US');
const mixHex = (a, b, t) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const c = v => Math.round(v).toString(16).padStart(2, '0');
  return `#${c(ar + (br - ar) * t)}${c(ag + (bg - ag) * t)}${c(ab + (bb - ab) * t)}`;
};
const clock = s => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);

export function initUI(stage) {

  /* ==============================================================
     REVEAL + SCROLL CHROME
  ============================================================== */
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const watch = () => $$('.reveal:not(.in)').forEach(n => io.observe(n));
  function revealScan() {
    for (const n of $$('.reveal:not(.in)')) {
      // anything at or above the fold counts, including content the
      // visitor has already scrolled past in one jump
      if (n.getBoundingClientRect().top < innerHeight * 0.92) n.classList.add('in');
    }
  }

  const rail = $('#railFill'), topbar = $('#topbar');
  const navHost = $('#chapterNav');
  const navTargets = $$('[data-nav]');
  navTargets.forEach((n, i) => {
    if (!n.id) n.id = 'nav-' + i;
    const a = el('a', '', n.dataset.nav);
    a.href = '#' + n.id;
    navHost.appendChild(a);
  });
  const navLinks = [...navHost.children];

  function onScroll() {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    rail.style.width = (p * 100).toFixed(2) + '%';
    topbar.classList.toggle('solid', h.scrollTop > 80);

    let active = 0;
    navTargets.forEach((n, i) => {
      if (n.getBoundingClientRect().top < innerHeight * 0.45) active = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle('on', i === active));
    revealScan();
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  }, { passive: true });

  /* ==============================================================
     LAYER LIST
  ============================================================== */
  const layerHost = $('#layerList');
  const layerSwatch = {};
  LAYERS.forEach(l => {
    const li = el('li', '', `<i class="sw"></i><span>${l.label}</span><span class="pr">${l.product}</span>`);
    layerHost.appendChild(li);
    layerSwatch[l.id] = li.querySelector('.sw');
  });

  /* ==============================================================
     REFERENCE RENDERS
  ============================================================== */
  const refHost = $('#refGrid');
  REFS.forEach(r => {
    const fig = el('figure', 'ref reveal');
    fig.innerHTML = `<img src="${r.src}" alt="${r.title}" loading="lazy">
      <figcaption class="ref-cap"><b>${r.title}</b><span>${r.sub}</span></figcaption>`;
    r.hots.forEach(h => {
      const b = el('button', 'hot' + (h.flip ? ' flip' : '') + (h.up ? ' up' : ''));
      b.style.left = h.x + '%'; b.style.top = h.y + '%';
      b.setAttribute('aria-label', h.t);
      b.innerHTML = `<i></i><span class="hot-tip"><b>${h.t}</b><span>${h.d}</span></span>`;
      fig.appendChild(b);
    });
    refHost.appendChild(fig);
  });

  /* ==============================================================
     KEYPAD
  ============================================================== */
  const kpButtons = $('#kpButtons'), kpEngrave = $('#kpEngrave');
  let activeSet = { name: 'Great Room', states: SCENES.map(s => s.name), map: SCENES.map(s => s.id) };

  function renderKeypad() {
    kpEngrave.textContent = activeSet.name.toUpperCase();
    kpButtons.innerHTML = '';
    activeSet.map.forEach((sceneId, i) => {
      const sc = sceneById(sceneId);
      const b = el('button', 'kp-btn');
      b.dataset.scene = sceneId;
      b.innerHTML = `<i class="led"></i><span class="lbl">${activeSet.states[i]}</span><span class="clk">${sc.clock}</span>`;
      b.addEventListener('click', () => { stage.setScene(sceneId); natBtn.classList.remove('on'); });
      kpButtons.appendChild(b);
    });
    markKeypad(stage.sceneId);
  }
  function markKeypad(id) {
    $$('#kpButtons .kp-btn').forEach(b => b.classList.toggle('on', b.dataset.scene === id && !stage.isNatural));
  }

  /* The keypad and readout follow the set: open while the room is on
     screen, tucked away over the commercial sections where they would
     only cover the tables. A manual press pins them either way. */
  const keypad = $('#keypad'), hudEl = $('#hud'), consoleEl = $('#console');
  /* On a phone the console would cover the copy, so it starts docked and
     opens on request; on a desktop it follows the set. */
  const small = innerWidth < 900 || matchMedia('(pointer: coarse)').matches;
  let pinned = small ? false : null;   // null = follow the set, true = open, false = shut
  const setDocked = docked => {
    consoleEl.classList.toggle('min', docked);
    keypad.classList.toggle('min', docked);
    hudEl.classList.toggle('min', docked);
    $('#hudToggle').textContent = docked ? '+' : '−';
  };
  $('#kpCollapse').addEventListener('click', () => { pinned = false; setDocked(true); });
  $('#kpOpen').addEventListener('click', () => { pinned = true; setDocked(false); });
  stage.onVisibility(on => { if (pinned === null) setDocked(!on); });
  if (small) setDocked(true);
  $('#heroPrompt')?.addEventListener('click', () => { pinned = true; setDocked(false); });

  /* The second chapter claims the room re-lights without reloading.
     If the visitor hasn't touched the keypad by the time they reach it,
     we demonstrate it once — then hand control back and never do it again. */
  let userDrove = false;
  const markDriven = () => { userDrove = true; };
  kpButtons.addEventListener('click', markDriven);

  const argument = $$('.ch')[1];
  if (argument) {
    const demoIO = new IntersectionObserver((es, ob) => es.forEach(e => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      if (userDrove) return;
      setTimeout(() => { if (!userDrove) stage.setScene('morning', 3.2); }, 700);
    }), { threshold: 0.55 });
    demoIO.observe(argument);
  }

  const natBtn = $('#kpNatural');
  natBtn.addEventListener('click', () => {
    markDriven();
    const on = !natBtn.classList.contains('on');
    natBtn.classList.toggle('on', on);
    stage.setNatural(on);
    if (!on) markKeypad(stage.sceneId);
    else $$('#kpButtons .kp-btn').forEach(b => b.classList.remove('on'));
  });

  /* shade rocker nudges the current scene's shade without leaving it */
  let shadeBias = 0;
  $$('.kp-rocker button').forEach(b => b.addEventListener('click', () => {
    shadeBias += b.dataset.shade === 'open' ? -0.34 : 0.34;
    shadeBias = Math.max(-1, Math.min(1, shadeBias));
    stage.setShadeBias(shadeBias);
  }));

  /* ==============================================================
     SPACE SETS
  ============================================================== */
  const spaceHost = $('#spaceGrid');
  SPACE_SETS.forEach(sp => {
    const b = el('button', 'space');
    b.innerHTML = `<div class="space-top"><b>${sp.name}</b><span class="tier ${sp.tier}">${sp.tier}</span></div>
      <div class="space-states">${sp.states.map(s => `<span>${s}</span>`).join('')}</div>`;
    b.addEventListener('click', () => {
      $$('.space').forEach(n => n.classList.remove('on'));
      b.classList.add('on');
      activeSet = { name: sp.name, states: sp.states, map: sp.map };
      renderKeypad();
      stage.setScene(sp.map[0]);
      natBtn.classList.remove('on');
      keypad.classList.remove('min');
    });
    spaceHost.appendChild(b);
  });

  /* ==============================================================
     PLAN + FILM BUILDER
  ============================================================== */
  const planImg = $('#planImg'), pinHost = $('#planPins');
  const allRooms = [...PLAN.ground.rooms, ...PLAN.first.rooms];
  const selected = new Set(DEFAULT_BUILD);
  let floor = 'ground';

  function renderPins() {
    pinHost.innerHTML = '';
    PLAN[floor].rooms.forEach(r => {
      const b = el('button', `pin ${r.tier}${selected.has(r.id) ? ' on' : ''}${r.side === 'right' ? ' right' : ''}`);
      b.style.left = r.x + '%'; b.style.top = r.y + '%';
      b.setAttribute('aria-pressed', selected.has(r.id));
      b.innerHTML = `<span class="pin-dot"></span>
        <span class="pin-lb"><b>${r.name}</b> · ${TIER[r.tier].secs}s · ${money(TIER[r.tier].price)}<small>${r.note}</small></span>`;
      b.addEventListener('click', () => {
        selected.has(r.id) ? selected.delete(r.id) : selected.add(r.id);
        renderPins(); renderBuild();
      });
      pinHost.appendChild(b);
    });
  }

  $$('.plan-tabs button').forEach(t => t.addEventListener('click', () => {
    $$('.plan-tabs button').forEach(n => n.classList.remove('on'));
    t.classList.add('on');
    floor = t.dataset.floor;
    planImg.src = PLAN[floor].img;
    planImg.alt = `Velvet Villa ${PLAN[floor].label} automation lighting looping layout`;
    renderPins();
  }));

  const buildList = $('#buildList');
  function renderBuild() {
    const rooms = allRooms.filter(r => selected.has(r.id));
    buildList.innerHTML = '';
    if (!rooms.length) {
      buildList.appendChild(el('li', 'empty', 'No spaces selected — tap a marker on the plan.'));
    }
    rooms.forEach(r => {
      const li = el('li', '', `<span class="bt ${r.tier}">${r.tier}</span>
        <span>${r.name}</span><span class="bs">${TIER[r.tier].secs}s</span>
        <span class="bp">${money(TIER[r.tier].price)}</span>`);
      buildList.appendChild(li);
    });

    const secs = rooms.reduce((s, r) => s + TIER[r.tier].secs, 0);
    const sub = rooms.reduce((s, r) => s + TIER[r.tier].price, 0);
    const total = rooms.length ? sub + POST_FEE : 0;
    $('#sumSpaces').textContent = rooms.length;
    $('#sumTime').textContent = clock(secs);
    $('#sumSpace').textContent = money(sub);
    $('#sumTotal').textContent = money(total);

    const match = PACKAGES.find(p => p.price === total && p.spaces === rooms.length);
    const m = $('#sumMatch');
    if (match) { m.textContent = `= ${match.name} package, exactly.`; m.classList.remove('over'); }
    else if (!rooms.length) { m.textContent = ''; }
    else { m.textContent = 'Custom configuration — priced per rate card + $165.'; m.classList.add('over'); }
  }
  $('#resetBuild').addEventListener('click', () => {
    selected.clear(); DEFAULT_BUILD.forEach(id => selected.add(id));
    renderPins(); renderBuild();
  });
  renderPins(); renderBuild();

  /* ==============================================================
     VOLUME CALCULATORS
  ============================================================== */
  const slabHost = $('#slabs');
  const EFFECTIVE = [1195, 1075, 980, 896];   // as printed in the proposal
  SLABS.forEach((s, i) => {
    slabHost.appendChild(el('div', '',
      `<span>${s.label}</span><span>${s.d ? Math.round(s.d * 100) + '%' : 'List'} · ${money(EFFECTIVE[i])}</span>`));
  });
  const qty = $('#qty');
  function renderSlab() {
    const n = +qty.value;
    $('#qtyVal').textContent = n;
    const i = SLABS.findIndex(s => n >= s.min && n <= s.max);
    [...slabHost.children].forEach((c, j) => c.classList.toggle('on', j === i));
    $('#slabDisc').textContent = SLABS[i].d ? Math.round(SLABS[i].d * 100) + '%' : 'List';
    $('#slabPrice').textContent = money(EFFECTIVE[i]);
  }
  qty.addEventListener('input', renderSlab); renderSlab();

  const tower = $('#tower'), typo = $('#typo'), finish = $('#finish');
  function renderReuse() {
    const N = +tower.value, T = Math.min(+typo.value, N), f = +finish.value / 100;
    $('#towerVal').textContent = N; $('#typoVal').textContent = T;
    $('#finishVal').textContent = Math.round(f * 100) + '%';

    const repeats = Math.max(0, N - T);
    const newFin = Math.round(repeats * f);
    const same = repeats - newFin;
    const reuse = T * 1195 + newFin * 525 + same * 180;
    const naive = N * 1195;

    $('#naiveVal').textContent = money(naive);
    $('#reuseVal').textContent = money(reuse);
    $('#barNaive').style.width = '100%';
    $('#barReuse').style.width = Math.max(14, (reuse / naive) * 100).toFixed(1) + '%';
    $('#savingVal').textContent = money(naive - reuse);
    $('#savingPct').textContent =
      `saved — ${Math.round((1 - reuse / naive) * 100)}% below rebuilding every unit. ${T} first-of-typology at package rate, ${newFin} re-dressed at $525, ${same} re-branded at $180.`;
  }
  [tower, typo, finish].forEach(i => i.addEventListener('input', renderReuse));
  renderReuse();

  /* ==============================================================
     PIPELINE
  ============================================================== */
  const pipe = $('#pipe');
  STAGES.forEach((s, i) => {
    const row = el('div', 'stage-row reveal' + (i === 0 ? ' open' : ''));
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.innerHTML = `<div class="sn">${s.n}</div>
      <div><h3>${s.t}${s.isNew ? '<span class="new-tag">added by us</span>' : ''}<i class="sx"></i></h3>
        <div class="body"><p>${s.b}</p>
          ${s.gate ? `<div class="gate"><b>◆</b> ${s.gate}</div>` : ''}
          ${s.why ? `<p class="why-note">${s.why}</p>` : ''}
        </div></div>`;
    row.addEventListener('click', () => row.classList.toggle('open'));
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.classList.toggle('open'); }
    });
    pipe.appendChild(row);
  });
  pipe.appendChild(el('p', 'fine reveal',
    'Steps we added to the original outline are tagged. Each exists to prevent an expensive correction later in the pipeline.'));

  /* ==============================================================
     GANTT
  ============================================================== */
  const gantt = $('#gantt');
  GANTT.forEach(g => {
    const row = el('div', 'g-row' + (g.gate ? ' gate-row' : ''));
    row.innerHTML = `<div class="gl"><b>${g.t}</b><i>${g.d}</i></div>
      <div class="g-track"><div class="g-fill" style="left:${((g.a - 1) / 28 * 100).toFixed(2)}%;width:0"></div></div>`;
    gantt.appendChild(row);
    const fill = row.querySelector('.g-fill');
    requestAnimationFrame(() => {
      new IntersectionObserver((es, ob) => es.forEach(e => {
        if (e.isIntersecting) {
          fill.style.width = ((g.b - g.a + 1) / 28 * 100).toFixed(2) + '%';
          ob.disconnect();
        }
      }), { threshold: .2 }).observe(gantt);
    });
  });
  const scale = el('div', 'g-scale', `<div></div><div class="g-ticks">
    ${[1, 7, 14, 21, 28].map(d => `<span>Day ${d}</span>`).join('')}</div>`);
  gantt.appendChild(scale);

  /* ==============================================================
     INPUT CHECKLIST
  ============================================================== */
  const inputHost = $('#inputGrid');
  let totalChk = 0;
  INPUTS.forEach(grp => {
    const g = el('div', 'igroup reveal');
    g.appendChild(el('h3', '', grp.g));
    grp.items.forEach(item => {
      totalChk++;
      const text = Array.isArray(item) ? `<b class="key">${item[0]}</b>${item[1]}` : item;
      const l = el('label', 'chk');
      l.innerHTML = `<input type="checkbox"><span class="bx"></span><span class="tx">${text}</span>`;
      g.appendChild(l);
    });
    inputHost.appendChild(g);
  });
  const imFill = $('#imFill'), imLabel = $('#imLabel');
  function renderMeter() {
    const done = $$('#inputGrid input:checked').length;
    imFill.style.width = (done / totalChk * 100) + '%';
    imLabel.textContent = done === totalChk
      ? `All ${totalChk} inputs ready — the 28-day clock can start.`
      : `${done} of ${totalChk} ready`;
  }
  inputHost.addEventListener('change', renderMeter);
  renderMeter();

  /* ==============================================================
     FRUSTUM DIAGRAM — plan view of what does and doesn't get built
  ============================================================== */
  const IN_VIEW = [   // furniture inside the approved camera path
    [168, 150, 74, 40], [150, 96, 40, 34], [232, 96, 44, 30],
    [186, 46, 62, 22], [122, 170, 26, 46], [262, 168, 26, 44],
  ];
  const OUT_VIEW = [  // geometry the camera never sees, so never modelled
    [28, 40, 54, 34], [30, 108, 40, 60], [40, 196, 62, 28],
    [316, 44, 56, 40], [322, 120, 50, 34], [300, 200, 66, 26],
    [96, 24, 40, 20],
  ];
  const rects = (list, cls) => list
    .map(([x, y, w, h]) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`)
    .join('');
  $('#frustumViz').insertAdjacentHTML('afterbegin', `
    <svg viewBox="0 0 400 300" role="img"
         aria-label="Plan of an apartment. A wedge from the camera marks the geometry that is modelled and lit; everything outside the wedge is left unbuilt.">
      <rect class="fv-plan" x="14" y="14" width="372" height="238" rx="6"/>
      <g class="fv-sweep">
        <path class="fv-wedge" d="M200 262 L36 18 L364 18 Z"/>
      </g>
      ${rects(OUT_VIEW, 'fv-out')}
      ${rects(IN_VIEW, 'fv-in')}
      <g class="fv-camera">
        <rect x="188" y="258" width="24" height="15" rx="3"/>
        <path d="M212 262 l13 -5 v15 l-13 -5 z"/>
      </g>
    </svg>
    <div class="fv-key"><span><i class="k1"></i>built, textured &amp; lit</span><span><i class="k2"></i>never built</span></div>`);

  /* ==============================================================
     EXCLUSIONS + FEE DISTRIBUTION
  ============================================================== */
  const ex = $('#exclList');
  EXCLUSIONS.forEach(e => ex.appendChild(el('li', '', e)));

  const dist = $('#dist');
  DIST.forEach(d => {
    const n = el('div', 'd', `<div><div class="dl">${d.l}</div>
      <div class="dbar"><i></i></div></div><div class="dv">${d.v}%</div>`);
    dist.appendChild(n);
    new IntersectionObserver((es, ob) => es.forEach(e => {
      if (e.isIntersecting) { n.querySelector('.dbar i').style.width = (d.v / 28 * 100) + '%'; ob.disconnect(); }
    }), { threshold: .3 }).observe(n);
  });

  /* ==============================================================
     PORTFOLIO FRAMES — loaded on request, never on page load
  ============================================================== */
  /* Flat pieces load themselves on approach; the 3D lab stays behind a
     click so it isn't competing with our own WebGL context for the GPU. */
  $$('.fr-gate').forEach(gate => {
    let done = false;
    const load = () => {
      if (done) return;
      done = true;
      const f = el('iframe');
      f.src = gate.dataset.src; f.loading = 'lazy'; f.title = 'Grafiko Labs portfolio';
      f.setAttribute('allow', 'autoplay');
      gate.replaceWith(f);
    };
    gate.addEventListener('click', load);
    if ('eager' in gate.dataset) {
      new IntersectionObserver((es, ob) => es.forEach(e => {
        if (e.isIntersecting) { ob.disconnect(); load(); }
      }), { rootMargin: '250px' }).observe(gate);
    }
  });

  /* ==============================================================
     THREE-BEAT PLAYBACK
  ============================================================== */
  const beatFill = $('#beatFill'), beatEls = $$('.beat'), playBtn = $('#playBeats');
  playBtn.addEventListener('click', () => {
    natBtn.classList.remove('on');
    document.querySelector('#region-2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    playBtn.disabled = true;
    stage.playBeats('morning', 'relax', p => {
      beatFill.style.width = (p * 100).toFixed(1) + '%';
      const b = p < 0.25 ? 0 : p < 0.72 ? 1 : 2;
      beatEls.forEach((n, i) => n.classList.toggle('on', i === b));
      if (p >= 1) {
        playBtn.disabled = false;
        setTimeout(() => { beatEls.forEach(n => n.classList.remove('on')); beatFill.style.width = '0%'; }, 900);
      }
    });
  });

  /* ==============================================================
     LIVE STATE → READOUT + PAGE PALETTE
  ============================================================== */
  const hudRows = $('#hudRows'), rowRefs = {};
  LAYERS.forEach(l => {
    const r = el('div', 'hud-row', `<span class="n">${l.label}</span>
      <span class="m"><i></i></span><span class="p">0%</span><span class="k">—</span>`);
    hudRows.appendChild(r);
    rowRefs[l.id] = { row: r, bar: r.querySelector('i'), pc: r.querySelector('.p'), k: r.querySelector('.k') };
  });
  const hud = hudEl;
  $('#hudToggle').addEventListener('click', () => {
    pinned = hud.classList.contains('min');
    setDocked(!pinned);
  });
  $('.hud-head').addEventListener('click', e => {
    if (e.target.id === 'hudToggle') return;
    if (hud.classList.contains('min')) { pinned = true; setDocked(false); }
    else if (innerWidth < 900) hud.classList.toggle('open');
  });

  const shadeFill = $('#shadeFill'), kpClock = $('#kpClock');
  let lastPaint = 0;
  stage.onState((s, target) => {
    const now = performance.now();
    if (now - lastPaint < 55) return;
    lastPaint = now;

    for (const l of LAYERS) {
      const v = s.layers[l.id], r = rowRefs[l.id];
      const pct = Math.round(v.i * 100);
      r.bar.style.width = pct + '%';
      const hex = kelvinToHex(v.k);
      r.bar.style.background = hex;
      r.pc.textContent = pct + '%';
      r.k.textContent = Math.round(v.k / 10) * 10 + 'K';
      r.row.classList.toggle('live', pct > 0);
      if (layerSwatch[l.id]) {
        layerSwatch[l.id].style.background = pct ? hex : 'rgba(255,255,255,.12)';
        layerSwatch[l.id].style.boxShadow = pct ? `0 0 ${4 + pct / 7}px ${hex}` : 'none';
      }
    }
    shadeFill.style.width = Math.round(s.shade * 100) + '%';

    if (stage.isNatural) {
      $('#hudScene').textContent = 'Natural Show';
      $('#hudTime').textContent = s.clockLabel || '—';
      kpClock.textContent = s.clockLabel || '—';
      $('#hudNote').textContent = 'Sun-tracking. Shades and colour temperature follow the sun, not a preset.';
      // the document tracks the sun too: accent takes the sun's kelvin,
      // and the page ground lifts from night to daylight with it
      const hex = kelvinToHex(s.sunK);
      const day = Math.max(0, Math.min(1, (s.sunEl + 7) / 26));
      const root = document.documentElement.style;
      root.setProperty('--accent', hex);
      root.setProperty('--glow', hex + '35');
      root.setProperty('--bg', mixHex('#060708', '#101418', day));
      root.setProperty('--ink', mixHex('#e6e3de', '#eff2f4', day));
    } else {
      $('#hudScene').textContent = target.name;
      $('#hudTime').textContent = target.clock;
      kpClock.textContent = '—';
      $('#hudNote').textContent = target.note;
    }
  });

  stage.onSceneChange(sc => {
    document.body.dataset.scene = sc.id;
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(sc.page)) root.setProperty('--' + k, v);
    markKeypad(sc.id);
    shadeBias = 0;
  });

  renderKeypad();
  watch();
  onScroll();
  addEventListener('resize', onScroll, { passive: true });

  return { watch };
}
