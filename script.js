(() => {
'use strict';
document.documentElement.classList.add('js');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------
   DATA
------------------------------------------------------------------ */
const M = 'assets/maps/';
const MAPS = [
  {id:'giga', t:'Giga Map', ch:'', w:10000, h:2716, span:[12,4],
   regions:[['Whole map',0,0,1,1],['Understanding',.012,.19,.263,.80],['01 The Ritual',.262,.19,.368,.80],['02 The Volume',.367,.19,.483,.80],['03 The Bottleneck',.482,.19,.583,.80],['04 The System',.582,.19,.723,.80],['Deciding',.722,.19,.836,.80],['Proposing',.835,.19,.985,.80]]},
  {id:'stakeholders', t:'Stakeholder Dimensions', w:8000, h:5159, span:[7,6]},
  {id:'matrix', t:'Mapping Holy Waste - Frequency vs Impact', w:3600, h:2899, span:[5,6]},
  {id:'scale', t:'Waste composition', w:3600, h:1587, span:[6,4]},
  {id:'cascade', t:'Long term and short term consequences', w:5000, h:564, span:[6,4]},
  {id:'daily-cycle', t:"The Ghat's Daily Cycle", w:3600, h:3349, span:[5,6]},
  {id:'annual-cycle', t:'Year-round Events based prediction of holy waste generation', w:4000, h:2227, span:[7,6]},
  {id:'spatial-density', t:"Spatial Density of the city's buildings", w:3600, h:1997, span:[6,5]},
  {id:'first-mile', t:'First Mile Analysis', w:3600, h:2254, span:[6,5]},
  {id:'ghat-analysis', t:'Ghat Level Analysis and comparison', w:3600, h:2401, span:[7,5]},
  {id:'innovators', t:'Current Innovation & Innovators - And Roadblocks', w:3600, h:1518, span:[5,5]},
  {id:'layered', t:'Layered Analysis', w:2311, h:2352, span:[4,6]},
  {id:'interventions', t:'Intervention point - Conclusion of the analysis', w:2496, h:4000, span:[3,6]},
  {id:'design-intervention', t:'Design Intervention', w:3661, h:4000, span:[5,6]},
  {id:'circular-3d', t:'Circular Economy', w:5000, h:2074, cls:'wide', span:[12,5]}
];
MAPS.forEach(m => { m.src = M + (m.id === 'giga' ? 'giga-map' : m.id) + '.webp'; m.thumb = M + (m.id === 'giga' ? 'giga-map' : m.id) + '-thumb.webp'; });
const CH = {understanding:'Understanding', analysing:'Analysing', deciding:'Deciding', proposing:'Proposing'};

/* ------------------------------------------------------------------
   BENTO
------------------------------------------------------------------ */
const bento = $('#bento');
MAPS.forEach((m, i) => {
  if (m.id === 'giga') return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tile ' + (m.cls || '');
  b.dataset.ch = m.ch;
  b.style.gridColumn = 'span ' + m.span[0];
  b.style.gridRow = 'span ' + m.span[1];
  b.setAttribute('aria-label', 'Open map: ' + m.t);
  b.innerHTML = `<img src="${m.thumb}" alt="" loading="lazy" decoding="async"><span class="tile-meta"><span class="tile-t">${m.t}</span><span class="tile-x" aria-hidden="true">↗</span></span>`;
  b.addEventListener('click', () => openViewer('maps', i, b));
  bento.appendChild(b);
});
$$('[data-widget="bento-filter"] button').forEach(c => c.addEventListener('click', () => {
  $$('[data-widget="bento-filter"] button').forEach(x => x.classList.toggle('is-on', x === c));
  const f = c.dataset.filter;
  $$('.tile', bento).forEach(t => t.classList.toggle('is-hidden', f !== 'all' && t.dataset.ch !== f));
}));

/* ------------------------------------------------------------------
   VIEWER (pan / zoom / pinch)
------------------------------------------------------------------ */
const V = $('#viewer'), stage = $('#vStage'), img = $('#vImg');
let items = [], idx = 0, cur = null, s = 1, x = 0, y = 0, fitS = 1, lastFocus = null;
const ptrs = new Map(); let pinch0 = null, drag0 = null, rAF = 0;

function groupItems(group, el) {
  if (group === 'maps') return MAPS;
  const els = group ? $$(`.image-open[data-group="${group}"]`) : [el];
  return els.map(e => {
    const i = e.querySelector('img');
    return {t: e.dataset.title || i.alt, cap: e.dataset.caption || '', src: e.dataset.img, thumb: i.currentSrc || i.src,
            w: +i.getAttribute('width') || i.naturalWidth, h: +i.getAttribute('height') || i.naturalHeight, ch: null, el: e};
  });
}
function openViewer(group, i, trigger) {
  items = groupItems(group, trigger); idx = i; lastFocus = trigger || document.activeElement;
  V.hidden = false; document.body.classList.add('v-open');
  show(); $('.v-close', V).focus();
}
function closeViewer() {
  V.hidden = true; document.body.classList.remove('v-open'); img.removeAttribute('src');
  if (lastFocus) lastFocus.focus({preventScroll: true});
}
function show() {
  cur = items[idx];
  $('#vTitle').textContent = cur.t;
  $('#vCh').textContent = '';
  $('#vCap').textContent = cur.cap || '';
  $('#vCount').textContent = `${idx + 1} / ${items.length}`;
  $('.v-nav', V).style.visibility = items.length > 1 ? 'visible' : 'hidden';
  const load = $('#vLoading'); load.classList.remove('done');
  const done = () => { if (!cur.w) { cur.w = img.naturalWidth; cur.h = img.naturalHeight; } img.style.width = cur.w + 'px'; img.style.height = cur.h + 'px'; };
  img.src = cur.thumb; img.alt = cur.t; img.onload = () => { done(); fit(); };
  if (cur.src && cur.src !== cur.thumb) {
    const full = new Image(); const want = cur;
    full.onload = () => { if (cur === want) { img.onload = null; img.src = full.src; load.classList.add('done'); } };
    full.src = cur.src;
  } else load.classList.add('done');
  // regions
  const R = $('#vRegions'); R.innerHTML = '';
  (cur.regions || []).forEach((r, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = r[0]; if (!k) b.classList.add('is-on');
    b.onclick = () => { $$('button', R).forEach(z => z.classList.toggle('is-on', z === b)); k ? zoomTo(r[1], r[2], r[3], r[4]) : fit(true); };
    R.appendChild(b);
  });
  if (cur.w) { img.style.width = cur.w + 'px'; img.style.height = cur.h + 'px'; fit(); }
}
function apply(animate) {
  img.style.transition = animate && !reduce ? 'transform .45s cubic-bezier(.2,.8,.2,1)' : 'none';
  img.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  $('#vZoom').textContent = Math.round(s / fitS * 100) + '%';
}
function fit(animate) {
  if (!cur || !cur.w) return;
  const r = stage.getBoundingClientRect();
  fitS = Math.min(r.width / cur.w, r.height / cur.h) * .94;
  s = fitS; x = (r.width - cur.w * s) / 2; y = (r.height - cur.h * s) / 2; apply(animate);
}
function zoomTo(x0, y0, x1, y1) {
  const r = stage.getBoundingClientRect();
  const w = (x1 - x0) * cur.w, h = (y1 - y0) * cur.h;
  s = Math.min(r.width / w, r.height / h) * .96;
  x = r.width / 2 - (x0 * cur.w + w / 2) * s; y = r.height / 2 - (y0 * cur.h + h / 2) * s; apply(true);
}
const maxS = () => Math.max(fitS * 10, 1.5);
function zoomAt(f, cx, cy, animate) {
  const ns = Math.min(maxS(), Math.max(fitS * .6, s * f)); const k = ns / s;
  x = cx - (cx - x) * k; y = cy - (cy - y) * k; s = ns; apply(animate);
}
function centre() { const r = stage.getBoundingClientRect(); return [r.width / 2, r.height / 2]; }
stage.addEventListener('wheel', e => {
  e.preventDefault(); const r = stage.getBoundingClientRect();
  const d = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
  if (e.ctrlKey || Math.abs(d) > 0) zoomAt(Math.exp(-d * (e.ctrlKey ? .01 : .0018)), e.clientX - r.left, e.clientY - r.top);
}, {passive: false});
stage.addEventListener('pointerdown', e => {
  stage.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 1) { drag0 = [e.clientX - x, e.clientY - y]; stage.classList.add('dragging'); }
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = {d: Math.hypot(a[0] - b[0], a[1] - b[1]), s, x, y, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]}; }
});
stage.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  const r = stage.getBoundingClientRect();
  if (ptrs.size === 2 && pinch0) {
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const ns = Math.min(maxS(), Math.max(fitS * .6, pinch0.s * d / pinch0.d)); const k = ns / pinch0.s;
    const m = [(a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top], m0 = [pinch0.m[0] - r.left, pinch0.m[1] - r.top];
    s = ns; x = m[0] - (m0[0] - pinch0.x) * k; y = m[1] - (m0[1] - pinch0.y) * k;
  } else if (ptrs.size === 1 && drag0) { x = e.clientX - drag0[0]; y = e.clientY - drag0[1]; }
  cancelAnimationFrame(rAF); rAF = requestAnimationFrame(() => apply(false));
});
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (ptrs.size === 1) { const p = [...ptrs.values()][0]; drag0 = [p[0] - x, p[1] - y]; } if (!ptrs.size) { drag0 = null; stage.classList.remove('dragging'); } };
stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
stage.addEventListener('dblclick', e => { const r = stage.getBoundingClientRect(); s > fitS * 3 ? fit(true) : zoomAt(2.2, e.clientX - r.left, e.clientY - r.top, true); });
V.addEventListener('click', e => {
  const a = e.target.closest('[data-v]'); if (!a) return;
  const v = a.dataset.v;
  if (v === 'close') closeViewer();
  else if (v === 'fit') fit(true);
  else if (v === 'in') zoomAt(1.5, ...centre(), true);
  else if (v === 'out') zoomAt(1 / 1.5, ...centre(), true);
  else if (v === 'next') { idx = (idx + 1) % items.length; show(); }
  else if (v === 'prev') { idx = (idx - 1 + items.length) % items.length; show(); }
});
document.addEventListener('keydown', e => {
  if (V.hidden) return;
  if (e.key === 'Escape') closeViewer();
  else if (e.key === 'ArrowRight' && items.length > 1) { idx = (idx + 1) % items.length; show(); }
  else if (e.key === 'ArrowLeft' && items.length > 1) { idx = (idx - 1 + items.length) % items.length; show(); }
  else if (e.key === '+' || e.key === '=') zoomAt(1.4, ...centre(), true);
  else if (e.key === '-') zoomAt(1 / 1.4, ...centre(), true);
  else if (e.key === '0') fit(true);
  else if (e.key === 'Tab') { const f = $$('button', V).filter(b => b.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});
addEventListener('resize', () => { if (!V.hidden) fit(); });

// open triggers across the page
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) { const i = MAPS.findIndex(m => m.id === o.dataset.open); if (i > -1) { e.preventDefault(); openViewer('maps', i, o); } return; }
  const im = e.target.closest('.image-open[data-img]');
  if (im) { const g = im.dataset.group; const list = g ? $$(`.image-open[data-group="${g}"]`) : [im]; openViewer(g || null, list.indexOf(im), im); }
});

/* ------------------------------------------------------------------
   STAKEHOLDER TIERS
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="tiers"]'); if (!w) return;
  const set = t => { $$('.pills button', w).forEach(b => b.setAttribute('aria-selected', b.dataset.tier === t)); $$('.tier', w).forEach(r => r.hidden = r.dataset.tier !== t); };
  $$('.pills button', w).forEach(b => b.addEventListener('click', () => set(b.dataset.tier)));
})();

/* ------------------------------------------------------------------
   MATRIX  (positions read from our Frequency vs Impact map)
   x: 0 = lowest frequency, 1 = highest. y: 0 = lowest impact, 1 = highest
------------------------------------------------------------------ */
(() => {
  const box = $('#matrix'); if (!box) return;
  const X0 = 118, X1 = 1882, Y0 = 315, Y1 = 1495;
  const raw = [
    ['Synthetic Clothes',463,349,'synthetic'],['POP Diya',499,384,'chemical'],['Surface Coatings/Paints',846,340,'chemical'],['Idols & Photos',829,380,'inert'],
    ['Plastic Pouch',1762,335,'synthetic'],['Garland Threads',1667,371,'synthetic'],['Safety Pins/Nails',532,441,'inert'],['Mata ki Chunari',809,441,'synthetic'],
    ['Ornaments & Shringar',1148,441,'synthetic'],['Sindoor/Kumkum',1538,441,'chemical'],['Broken Decor/Thermocol',1210,502,'synthetic'],['Milk Products',1467,502,'organic'],
    ['Cooked Prasad/Food',1694,502,'organic'],['Human Remains',220,569,'organic'],['Abir/Gulal',1208,565,'chemical'],['Moli/Kalava',1597,569,'synthetic'],
    ['Batasha/Sweets',1459,625,'organic'],['Vark',397,694,'inert'],['Offering Coins',641,694,'inert'],['Printed Holy Books',1065,823,'inert'],['Matchboxes',1649,823,'inert'],
    ['Cotton Shroud',630,951,'organic'],['Mustard Oil',941,951,'organic'],['Ghee',1089,951,'organic'],['Kapoor',1568,953,'chemical'],['Incense Sticks',1782,1015,'organic'],
    ['Janeu',744,1080,'organic'],['Wood',1100,1080,'organic'],['Dhoop Cones',1477,1080,'organic'],['Ash',1641,1080,'chemical'],['Coconut Shells',755,1127,'organic'],
    ['Guggul/Loban',754,1172,'organic'],['Steel Utensils',216,1210,'inert'],['Bamboo (Biers)',554,1209,'organic'],['Bhasma/Vibhuti',859,1209,'chemical'],
    ['Cow Dung Cakes',1142,1209,'organic'],['Fruits',1300,1209,'organic'],['Rice/Seeds',1447,1209,'organic'],['Flowers',1815,1209,'organic'],['Rudraksha Mala',1133,1276,'organic'],
    ['Sandalwood Logs',420,1336,'organic'],['Turmeric',1207,1336,'organic'],['Mango Leaves',1409,1336,'organic'],['Leaf Bowl',1592,1336,'organic'],['Beel Patra',1751,1336,'organic'],
    ['Tulsi/Kusha',1652,1397,'organic'],['Neem',791,1475,'organic']
  ];
  const CAT = {organic:'Organic', synthetic:'Synthetic & textile', chemical:'Dye, powder or coating', inert:'Metal & objects'};
  const out = $('.matrix-readout');
  const els = raw.map(([n, px, py, c]) => {
    const fx = (px - X0) / (X1 - X0), fy = (Y1 - py) / (Y1 - Y0);
    const e = document.createElement('span');
    e.className = 'm-item ' + c; e.textContent = n; e.tabIndex = 0; e.dataset.cat = c;
    e.style.left = (Math.min(.955, Math.max(.05, fx)) * 100) + '%'; e.style.top = ((1 - fy) * 100) + '%';
    const q = `${fx >= .5 ? 'High' : 'Low'} frequency · ${fy >= .5 ? 'High' : 'Low'} impact`;
    const say = () => { out.innerHTML = `<b>${n}</b> — ${q}`; };
    e.addEventListener('mouseenter', say); e.addEventListener('focus', say); e.addEventListener('click', say);
    box.appendChild(e); return e;
  });
  const chips = $$('.matrix-filters button');
  chips.forEach(ch => {
    const c = ch.dataset.cat;
    if (c !== 'all') ch.insertAdjacentHTML('beforeend', ` <span>${raw.filter(r => r[3] === c).length}</span>`); else ch.insertAdjacentHTML('beforeend', ` <span>${raw.length}</span>`);
    ch.addEventListener('click', () => {
      chips.forEach(z => z.classList.toggle('is-on', z === ch));
      els.forEach(e => e.classList.toggle('is-dim', c !== 'all' && e.dataset.cat !== c));
      const n = c === 'all' ? raw.length : raw.filter(r => r[3] === c).length;
      const hi = raw.filter(r => (c === 'all' || r[3] === c) && (Y1 - r[2]) / (Y1 - Y0) >= .5).length;
      out.innerHTML = c === 'all' ? 'Hover or tap a component to read it.' : `<b>${n} ${CAT[c].toLowerCase()} components</b>, ${hi} of them in the high-impact half.`;
    });
  });
})();

/* ------------------------------------------------------------------
   COMPOSITION  (illustration is the original from the Figma file)
------------------------------------------------------------------ */
(() => {
  const fig = $('#compFig'), list = $('#compList'); if (!fig) return;
  const D = [['Organic Waste',47,'#72B2CC'],['Plastics',27,'#9FC34E'],['Paper',16,'#F2B92C'],['Cloth',6,'#FF9A3C'],['Glass',4,'#9EA3F5']];
  const rows = $$('div', list), ticks = $$('.ct', fig);
  rows.forEach(r => r.style.setProperty('--c', D[+r.dataset.k][2]));
  const hl = k => { rows.forEach(r => r.classList.toggle('hl', +r.dataset.k === k)); ticks.forEach(t => t.classList.toggle('hl', +t.dataset.k === k)); };
  rows.forEach(r => { const k = +r.dataset.k; r.addEventListener('mouseenter', () => hl(k)); r.addEventListener('mouseleave', () => hl(-1)); r.addEventListener('click', () => hl(k)); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { rows.forEach(r => r.style.setProperty('--w', D[+r.dataset.k][1] * 2 + '%')); io.disconnect(); } }), {threshold: .35});
  io.observe(list);
})();

/* ------------------------------------------------------------------
   YEAR
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="year"]'); if (!w) return;
  const E = [
    {n:'Makar Sankranti', m:.5, lv:'mid', when:'January', t:'Features kite-flying, sweets and river baths at ghats; moderate crowds of locals and pilgrims. New Year draws families to Dashashwamedh Ghat fireworks.'},
    {n:'Maha Shivratri', m:1.9, lv:'peak', when:'February – March', t:'1.5 million+ devotees for night vigils, processions from Maha Mrityunjaya to Kashi Vishwanath temple, and Rudrabhishek rituals; the highest winter footfall at Shiva temples. Dhrupad Mela at Tulsi/Assi Ghat offers music.'},
    {n:'Holi', m:2.7, lv:'mid', when:'March', t:'Involves colours and bonfires at temples; moderate spring crowds.'},
    {n:'Akshaya Tritiya', m:4.1, lv:'low', when:'April – May', t:'Draws wealth-seekers for Ganges dips and gold buys. Celebrates the river’s descent with lamps on the ghats.'},
    {n:'Hot Summers', m:5.4, lv:'low', when:'May – June', t:'Limits visitors. Panch Koshi Parikrama starts from Manikarnika Ghat for women’s purification walks. Over 1,500 couples get married under the Chief Minister mass marriage scheme.'},
    {n:'Shravan Month', m:6.9, lv:'peak', when:'July – August', t:'Peaks with Kanwar Yatra Mondays; millions of Shiva devotees carry Ganges water home, with massive footfall at the ghats and Kashi Vishwanath despite the rains.'},
    {n:'Low Monsoon', m:8.5, lv:'low', when:'September', t:'Crowds ease. Ram Leela begins pre-Dussehra with dramas at temples; Nakkatayya parades re-enact Ramayana scenes in the streets.'},
    {n:'Peak Season Explodes', m:10.3, lv:'peak', when:'October – November', t:'Ganges Mahotsav, Dhanteras, Diwali, Ram Leela and more. Diyas are lit along 84 ghats, drawing the gods’ mythical visits per lore. Extreme crowds of pilgrims and tourists.'}
  ];
  const LV = {low:'Non-seasonal Low', mid:'Transitional Mids', peak:'Seasonal Peak'};
  const months = $('.months', w), evs = $('.events', w), det = $('#yearDetail');
  'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ').forEach(m => months.insertAdjacentHTML('beforeend', `<span>${m}</span>`));
  let level = 'all';
  const btns = E.map((e, k) => {
    const b = document.createElement('button'); b.className = 'ev ' + e.lv; b.setAttribute('role', 'tab'); b.style.left = (e.m / 12 * 100) + '%';
    b.setAttribute('aria-label', `${e.n}, ${LV[e.lv]}`); b.innerHTML = '<span class="ev-bar"></span>';
    const ok = () => level === 'all' || E[k].lv === level;
    b.addEventListener('click', () => { if (ok()) sel(k); }); b.addEventListener('mouseenter', () => { if (ok()) sel(k); });
    evs.appendChild(b); return b;
  });
  function sel(k) {
    const e = E[k]; btns.forEach((b, i) => b.setAttribute('aria-selected', i === k));
    det.innerHTML = `<h3>${e.n}</h3><span class="yd-tag ${e.lv}">${LV[e.lv]}</span><p>${e.t}</p>`;
  }
  sel(1);
  $$('.legend button', w).forEach(c => c.addEventListener('click', () => {
    $$('.legend button', w).forEach(z => z.classList.toggle('is-on', z === c));
    const l = c.dataset.level; level = l; btns.forEach((b, i) => { const off = l !== 'all' && E[i].lv !== l; b.classList.toggle('is-dim', off); b.disabled = off; b.tabIndex = off ? -1 : 0; });
    if (l !== 'all') { const first = E.findIndex(e => e.lv === l); if (first > -1) sel(first); }
  }));
})();

/* ------------------------------------------------------------------
   FIRST MILE
------------------------------------------------------------------ */
$$('[data-widget="first-mile"] button').forEach(b => b.addEventListener('click', () => {
  const li = b.closest('li'); const o = !li.classList.contains('open');
  li.classList.toggle('open', o); b.setAttribute('aria-expanded', o);
}));

/* ------------------------------------------------------------------
   PINNED CARDS + THREAD (verlet rope that sags, swings and goes taut)
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="pinboard"]'); if (!w) return;
  const area = $('.pb-area', w), cards = $$('.pcard', w), pins = $$('.pin', w), paths = $$('.th', w);
  const HOME = [[.02, .07, -2.2], [.355, .2, 1.6], [.69, .02, -1.2]];
  const ANCH = [.62, .03], PIN_HEAD = [.59, .42], PIN_W = 46;
  const st = cards.map((c, i) => ({x: 0, y: 0, r: HOME[i][2], tr: HOME[i][2]}));
  const mobile = () => matchMedia('(max-width:760px)').matches;
  let W = 0, H = 0;
  function home() { W = area.clientWidth; H = area.clientHeight; st.forEach((s, i) => { s.x = HOME[i][0] * W; s.y = HOME[i][1] * H; s.tr = HOME[i][2]; }); }
  function place(i) { const s = st[i]; cards[i].style.transform = `translate(${s.x}px,${s.y}px) rotate(${s.r}deg)`; }
  function anchor(i) {
    const c = cards[i], s = st[i], cw = c.offsetWidth, ch = c.offsetHeight;
    const lx = cw * ANCH[0] - cw / 2, ly = ch * ANCH[1] - ch / 2, a = s.r * Math.PI / 180;
    return [s.x + cw / 2 + lx * Math.cos(a) - ly * Math.sin(a), s.y + ch / 2 + lx * Math.sin(a) + ly * Math.cos(a)];
  }
  // ropes
  const N = 22, ropes = [[0, 1], [1, 2]].map(([a, b]) => ({a, b, pts: [], L: 0}));
  function initRopes() {
    ropes.forEach(r => {
      const A = anchor(r.a), B = anchor(r.b), d = Math.hypot(B[0] - A[0], B[1] - A[1]);
      r.L = d * 1.05; r.pts = [];
      for (let k = 0; k <= N; k++) { const t = k / N, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t; r.pts.push({x, y, px: x, py: y}); }
    });
  }
  function step() {
    ropes.forEach(r => {
      const A = anchor(r.a), B = anchor(r.b), d = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const seg = Math.max(r.L, d) / N, P = r.pts;
      for (let k = 1; k < N; k++) { const p = P[k], vx = (p.x - p.px) * .965, vy = (p.y - p.py) * .965; p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + .45; }
      P[0].x = A[0]; P[0].y = A[1]; P[N].x = B[0]; P[N].y = B[1];
      for (let it = 0; it < 14; it++) {
        for (let k = 0; k < N; k++) {
          const p = P[k], q = P[k + 1], dx = q.x - p.x, dy = q.y - p.y, dist = Math.hypot(dx, dy) || .001, diff = (dist - seg) / dist;
          const pf = k === 0 ? 0 : (k + 1 === N ? 1 : .5), qf = k + 1 === N ? 0 : (k === 0 ? 1 : .5);
          p.x += dx * diff * pf; p.y += dy * diff * pf; q.x -= dx * diff * qf; q.y -= dy * diff * qf;
        }
        P[0].x = A[0]; P[0].y = A[1]; P[N].x = B[0]; P[N].y = B[1];
      }
    });
  }
  function draw() {
    ropes.forEach((r, i) => {
      const P = r.pts; let d = `M${P[0].x.toFixed(1)},${P[0].y.toFixed(1)}`;
      for (let k = 1; k < N; k++) { const mx = (P[k].x + P[k + 1].x) / 2, my = (P[k].y + P[k + 1].y) / 2; d += ` Q${P[k].x.toFixed(1)},${P[k].y.toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`; }
      d += ` L${P[N].x.toFixed(1)},${P[N].y.toFixed(1)}`;
      paths[i].setAttribute('d', d); paths[i + 2].setAttribute('d', d);
    });
    cards.forEach((c, i) => { const [ax, ay] = anchor(i); pins[i].style.transform = `translate(${ax - PIN_W * PIN_HEAD[0]}px,${ay - PIN_W * .965 * PIN_HEAD[1]}px)`; });
  }
  // dragging
  let drag = null, z = 5;
  cards.forEach((c, i) => c.addEventListener('pointerdown', e => {
    if (mobile() || e.button > 0) return;
    e.preventDefault(); c.setPointerCapture(e.pointerId); c.classList.add('drag'); c.style.zIndex = ++z;
    drag = {i, ox: e.clientX - st[i].x, oy: e.clientY - st[i].y, lx: e.clientX};
  }));
  area.addEventListener('pointermove', e => {
    if (!drag) return; const s = st[drag.i], c = cards[drag.i];
    s.x = Math.max(-20, Math.min(W - c.offsetWidth + 20, e.clientX - drag.ox));
    s.y = Math.max(0, Math.min(H - c.offsetHeight + 40, e.clientY - drag.oy));
    s.tr = Math.max(-8, Math.min(8, (e.clientX - drag.lx) * .6)); drag.lx = e.clientX;
  });
  const end = () => { if (!drag) return; cards[drag.i].classList.remove('drag'); st[drag.i].tr = +(Math.random() * 4 - 2).toFixed(1); drag = null; };
  area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
  $('.pb-tidy', w).addEventListener('click', () => { const old = st.map(s => [s.x, s.y]); home(); });
  // loop
  let running = false, raf = 0;
  function frame() {
    st.forEach((s, i) => { s.r += (s.tr - s.r) * .15; if (!drag || drag.i !== i) s.tr += (0 - s.tr) * 0; place(i); });
    if (drag) st[drag.i].tr *= .85;
    step(); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || mobile()) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function setup() {
    if (mobile()) { stop(); cards.forEach(c => c.style.transform = ''); return; }
    const fx = W ? st.map(s => [s.x / W, s.y / H]) : null;
    W = area.clientWidth; H = area.clientHeight;
    if (fx) st.forEach((s, i) => { s.x = fx[i][0] * W; s.y = fx[i][1] * H; }); else home();
    st.forEach((s, i) => { s.r = s.tr; place(i); });
    initRopes(); for (let k = 0; k < 120; k++) step(); draw();
  }
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop()));
  io.observe(area);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { stop(); setup(); if (!mobile()) start(); }, 120); });
  if (document.readyState === 'complete') setup(); else addEventListener('load', setup);
  setup();
})();

/* ------------------------------------------------------------------
   STICKY-NOTE BOARD
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="board"]'); if (!w) return;
  const area = $('.board-area', w), notes = $$('.note', w);
  const HOME = [[4, 8, -3], [36, 30, 2.5], [66, 6, -1.5]];
  const tidy = () => notes.forEach((n, i) => { n.style.left = HOME[i][0] + '%'; n.style.top = HOME[i][1] + '%'; n.style.transform = `rotate(${HOME[i][2]}deg)`; });
  tidy();
  let z = 3;
  notes.forEach(n => n.addEventListener('pointerdown', e => {
    if (matchMedia('(max-width:640px)').matches) return;
    e.preventDefault(); n.setPointerCapture(e.pointerId); n.classList.add('drag'); n.style.zIndex = ++z;
    const a = area.getBoundingClientRect(), r = n.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const mv = ev => {
      const x = Math.max(0, Math.min(a.width - r.width, ev.clientX - a.left - ox)), y = Math.max(0, Math.min(a.height - r.height, ev.clientY - a.top - oy));
      n.style.left = x / a.width * 100 + '%'; n.style.top = y / a.height * 100 + '%'; n.style.transform = 'rotate(0deg) scale(1.03)';
    };
    const upn = () => { n.classList.remove('drag'); n.style.transform = `rotate(${(Math.random() * 4 - 2).toFixed(1)}deg)`; n.removeEventListener('pointermove', mv); n.removeEventListener('pointerup', upn); n.removeEventListener('pointercancel', upn); };
    n.addEventListener('pointermove', mv); n.addEventListener('pointerup', upn); n.addEventListener('pointercancel', upn);
  }));
  $('.board-tidy', w).addEventListener('click', tidy);
})();

/* ------------------------------------------------------------------
   GHAT TABS
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="ghat-tabs"]'); if (!w) return;
  const G = [
    ['Dashashwamedh Ghat','Massive, concentrated human footfall','It suffers from the highest concentration of "holy waste": tonnes of milk-soaked flowers, synthetic camphor wrappers, clay diyas and polythene bags dumped within a tight three-hour evening window. The massive crowds completely paralyse any municipal clean-up effort during peak hours.'],
    ['Manikarnika Ghat','24/7 cremation logistics','The sheer tonnage of physical mass. It generates thousands of kilograms of wood ash, unburnt wood and discarded synthetic shrouds (cloth mixed with plastic) daily. The severity here is driven by material weight and volume, permanently altering the riverbed depth and water toxicity with heavy metals and carbon.'],
    ['Assi Ghat','Heavy tourism and commercial overlap','The waste profile here is a complex hybrid. Traditional floral waste from morning rituals is aggressively mixed with "modern" commercial waste: PET bottles, single-use snack wrappers and food waste from the surrounding hospitality ecosystem.'],
    ['Namo Ghat','Newly redeveloped infrastructure drawing massive VIP and domestic tourist crowds','Unlike the ancient ghats, Namo’s severity comes from recreational dumping. The wide-open spaces attract picnickers and casual tourists, resulting in high volumes of commercial plastics, packaging and non-biodegradable litter that quickly overwhelm its modern bins.']
  ];
  const panel = $('.ghat-panel', w), tabs = $$('[role=tab]', w);
  const set = k => { tabs.forEach((t, i) => t.setAttribute('aria-selected', i === k)); const g = G[k];
    panel.innerHTML = `<div><h3>${g[0]}</h3><p class="g-sub">${g[1]}</p></div><p>${g[2]}</p>`; };
  tabs.forEach((t, k) => t.addEventListener('click', () => set(k)));
  w.addEventListener('keydown', e => { const k = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true'); if (e.key === 'ArrowRight') { set((k + 1) % 4); tabs[(k + 1) % 4].focus(); } if (e.key === 'ArrowLeft') { set((k + 3) % 4); tabs[(k + 3) % 4].focus(); } });
  set(0);
})();

/* ------------------------------------------------------------------
   COMPARE
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="compare"]'); if (!w) return;
  const tabs = $$('.seg button', w);
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(z => z.setAttribute('aria-selected', z === t));
    $$('.cpanel', w).forEach(p => p.hidden = p.dataset.side !== t.dataset.side);
  }));
})();

/* ------------------------------------------------------------------
   KUND HOTSPOTS
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="kund"]'); if (!w) return;
  const hs = $$('.hot', w), ns = $$('.notes-list li', w);
  const set = k => { hs.forEach(h => h.classList.toggle('is-on', +h.dataset.k === k)); ns.forEach(n => n.classList.toggle('is-on', +n.dataset.k === k)); };
  [...hs, ...ns].forEach(el => { el.addEventListener('mouseenter', () => set(+el.dataset.k)); el.addEventListener('click', () => set(+el.dataset.k)); el.addEventListener('focus', () => set(+el.dataset.k)); });
  set(0);
})();

/* ------------------------------------------------------------------
   CIRCULAR LOOP
------------------------------------------------------------------ */
(() => {
  const w = $('[data-widget="loop"]'); if (!w) return;
  const I = {
    shop:'<path d="M4 10h16v10H4z"/><path d="M3 10l2-5h14l2 5"/><path d="M9 20v-5h6v5"/>',
    temple:'<path d="M12 2v3"/><path d="M8 11c0-3 4-6 4-6s4 3 4 6"/><path d="M5 21V11h14v10"/><path d="M3 21h18"/><path d="M10 21v-4h4v4"/>',
    kund:'<path d="M3 18h18"/><path d="M5 18v-3h3v-3h3v-3h3"/><path d="M14 9v9"/><path d="M15 14c1.5-1 3-1 4.5 0"/>',
    boat:'<path d="M3 15l2 4h14l2-4z"/><path d="M12 15V5l6 7h-6"/>',
    truck:'<path d="M2 6h12v10H2z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    factory:'<path d="M3 21V10l6 4v-4l6 4V5h4v16z"/><path d="M7 18h2M12 18h2"/>',
    pack:'<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
    cart:'<circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M3 4h3l2 11h11l2-8H7"/>'
  };
  const S = [
    ['shop','Purchase','Shop: selling sacred offerings','Shops near temples and market areas sell ritual offerings such as flowers (marigold, rose, lotus), agarbatti (incense sticks), diyas (oil lamps), coconuts, sweets (prasad) and cloth. These items are increasingly packaged in recycled fibre-based materials, the direct output of this circular economy. The shop is both the starting point and the final destination of the loop.'],
    ['temple','Offers','Kashi Vishwanath temple (accumulates offerings in bulk)','The Kashi Vishwanath Jyotirlinga is one of the 12 most sacred Shiva temples in India. After the 2021 corridor expansion, footfall has increased dramatically: the temple now receives 1–3 lakh devotees on ordinary days and several lakhs on festival days. Flowers, coconuts, bilva leaves, sweets, milk and cloth accumulate in huge quantities inside the temple complex.'],
    ['kund','Offering immersion','Ganga Kund','A specially designed stepped pool built at the river ghat. Instead of offerings being thrown directly into the river, they are first immersed or placed into the Ganga Kund. This acts as a structured holding basin that separates the organic offering material from the flowing river water, so it can be collected in a controlled manner.'],
    ['boat','Collection','River route: overflow and downstream flow','The narrow galis (lanes) of Banaras make it physically impossible for vehicles to reach most temple ghats, so the river becomes the only viable collection route. Offering material, flowers, coconut shells and leaves from the Ganga Kund are loaded onto wooden boats at the ghat steps.'],
    ['truck','Transport','Truck: bulk collection and transport','Trucks and collection vehicles pick up the gathered offering material both from the Ganga Kund directly and from river ghat collection points, and take it to nearby recycling and processing facilities. The Kund’s direct pickup route is faster, cleaner, and reduces river contamination significantly.'],
    ['factory','Produce','Recycling and manufacturing unit','At the processing unit, the offering material is sorted and transformed into useful products. Flowers become natural dyes, agarbatti, vermicompost and essential oils. Coconut shells become activated charcoal or fibre. Leaf plates and cloth are pulped into recycled paper and packaging fibre. This is where sacred waste becomes a new raw material.'],
    ['pack','Produce','Finished goods: fibre-based packaging back to shops','The manufactured outputs, especially recycled fibre-based packaging, biodegradable bags, incense sticks and organic fertiliser, are supplied back to the shops. The offerings that devotees bought in a recycled packet eventually return as new recycled packets: a circular economy rooted in devotion.'],
    ['cart','Supply to the vendors','The last mile through the galis','Finished goods are driven to the edge of the old city, where the narrow galis force a transfer onto handcarts and cycle rickshaws for the last stretch. Shopkeepers stock the recycled products for the next devotee. The circle closes at the shop counter, where sacred waste completes its full journey back into sacred use.']
  ];
  const nodes = $('.loop-nodes', w), arc = $('#loopArc', w); let k = 0;
  const R = 230 / 600 * 100, ang = i => -90 + i * 360 / S.length;
  const btns = S.map((st, i) => {
    const a = ang(i) * Math.PI / 180, b = document.createElement('button');
    b.className = 'lnode'; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', st[2]);
    b.style.left = (50 + R * Math.cos(a)) + '%'; b.style.top = (50 + R * Math.sin(a)) + '%';
    b.innerHTML = `<svg viewBox="0 0 24 24">${I[st[0]]}</svg><span class="lbl">${st[1]}</span>`;
    b.addEventListener('click', () => set(i)); nodes.appendChild(b); return b;
  });
  function arcPath(i) {
    const a1 = ang(i) * Math.PI / 180, a0 = -Math.PI / 2, r = 230, cx = 300, cy = 300;
    if (i === 0) return '';
    const large = (i * 360 / S.length) > 180 ? 1 : 0;
    return `M ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
  }
  function set(i) {
    k = (i + S.length) % S.length; const st = S[k];
    btns.forEach((b, j) => b.setAttribute('aria-selected', j === k));
    arc.setAttribute('d', arcPath(k));
    $('#loopStep').textContent = String(k + 1).padStart(2, '0') + ' / ' + String(S.length).padStart(2, '0');
    $('#loopVerb').textContent = st[1]; $('#loopTitle').textContent = st[2]; $('#loopText').textContent = st[3];
  }
  $$('.circle', w).forEach(b => b.addEventListener('click', () => set(k + +b.dataset.dir)));
  set(0);
})();

/* ------------------------------------------------------------------
   REFERENCES (full list from the paper)
------------------------------------------------------------------ */
const REFS = [["Agence France-Presse (2018) Escaping death and rebirth on Varanasi’s sacred riverbanks. Phys.org, 26 November.", "https://phys.org/news/2018-11-death-rebirth-varanasi-sacred-riverbanks.html"], ["ANI (2025) Over 6.67 lakh devotees visit Kashi Vishwanath Dham on Maha Shivratri. Asian News International, 26 February.", "https://www.aninews.in/news/national/general-news/over-667-lakh-devotees-visit-kashi-vishwanath-dham-on-maha-shivratri20250226222620/"], ["ANI (2026) Ganga water level rising in Varanasi, official reviews flood preparedness. Asian News International, 20 August.", "https://aninews.in/news/national/general-news/ganga-water-level-rising-in-varanasi-official-reviews-flood-preparedness20260820051141/"], ["Atal, H.L. (2022) Sustainable management of floral waste to produce bioenergy and valuable products. Journal of the Indian Association for Environmental Management, 42(2), pp. 26–34.", "https://or.niscpr.res.in/index.php/JIAEM/article/download/1041/210/2466"], ["Central Pollution Control Board (2020) Revised Guidelines for Idol Immersion. New Delhi: CPCB, Ministry of Environment, Forest and Climate Change, 12 May.", "https://cpcb.nic.in/"], ["Conaway, C. (2015) The Ganges River is dying under the weight of modern India. Newsweek, 23 September.", "https://www.newsweek.com/2015/10/02/ganges-river-dying-under-weight-modern-india-375347.html"], ["District Administration Varanasi (n.d.) Namo Ghat – project details. Kashi Official Web Portal.", "https://kashi.gov.in/project-details/namo-ghat"], ["Free Press Journal (2026) Can faith save the Ganga? Kashi Vishwanath’s plastic-free Sawan offers a green pilgrimage. The Free Press Journal.", "https://www.freepressjournal.in/uttar-pradesh/can-faith-save-the-ganga-kashi-vishwanaths-plastic-free-sawan-offers-a-green-pilgrimage"], ["Kamboj, V., Devi, P., Jaan, I., Singh, R.B.P. and Bisht, A. (2024) A case study on characterization and management of solid waste at selected spiritual sites in Dehradun, India. AgroEnvironmental Sustainability, 2(4), pp. 205–215.", "https://doi.org/10.59983/s2024020406"], ["Kumar, A. and Rana, N.K. (2024) Significance of source segregation of solid waste in the course of solid waste management: an overview of Varanasi city, India. In: Solid Waste Management. London: IntechOpen.", "https://www.intechopen.com/chapters/1193901"], ["Malviya, A. (n.d.) Varanasi – Town Planning. SlideShare.", "https://www.slideshare.net/slideshow/varanasi-town-planning-pdf/110502287"], ["Mishra, N. (2013) Unholy mess: temple waste, a concern. The Times of India.", "https://timesofindia.indiatimes.com/city/varanasi/unholy-mess-temple-waste-a-concern/articleshow/21872439.cms"], ["Mishra, S., Sarkar, K., Dwivedi, S. et al. (2025) Work-related musculoskeletal disorders among various occupational workers in India: a systematic review and meta-analysis. Journal of Occupational Health, 67(1), uiae077.", "https://doi.org/10.1093/joccuh/uiae077"], ["National Mission for Clean Ganga (n.d.) CSR for Cleaning of Ghats. Ministry of Jal Shakti, Government of India.", "https://nmcg.nic.in/csr/csrcleaningghat.aspx"], ["National Mission for Clean Ganga (n.d.) River Surface Cleaning Using Trash Skimmer. Ministry of Jal Shakti, Government of India.", "https://nmcg.nic.in/csr/csrriversurfaceclean.aspx"], ["Organiser (2025) Varanasi surpasses Goa and Shimla to become India’s fastest growing tourism hub; over 11 crore visitors in 2024. Organiser, 7 October.", "https://organiser.org/2025/10/07/319729/bharat/up-varanasi-surpasses-goa-and-shimla-to-become-indias-fastest-growing-tourism-hub-over-11-crore-visitors-in-2024/"], ["Rai, P. (2018) Problems of Sustainable Solid Waste Management in Urban Area: A Case Study of Varanasi City of India.", "https://www.researchgate.net/profile/Praveen-Rai-10/publication/323110513_Problems_of_Sustainable_Solid_Waste_Management_in_Urban_Area_A_Case_Study_of_Varanasi_City_of_India"], ["Rozin, P., Millman, L. and Nemeroff, C. (1986) Operation of the laws of sympathetic magic in disgust and other domains. Journal of Personality and Social Psychology, 50(4), pp. 703–712.", "https://cognitionandculture.net/wp-content/uploads/89LawsSympMagicJPSP86-1wzdvkv.pdf"], ["Sandhi, A. and Rosenlund, J. (2023) Municipal solid waste management in Scandinavia and key factors for improved waste segregation: a review. Cleaner Waste Systems.", "https://www.sciencedirect.com/science/article/pii/S2772912524000162"], ["Singh, G., Chaudhary, S., Gupta, D. and Mishra, V.K. (2024) Assessing the water quality of River Ganga in Varanasi, India, through WQI, NPI and multivariate techniques: a comprehensive study. Water Practice and Technology, 19(4), pp. 1099–1118.", "https://iwaponline.com/wpt/article/19/4/1099/100433/"], ["Singh, P.K., Singh, A., Tripathi, K. et al. (2024) Insights into the seasonal variation, distribution, composition and dynamics of microplastics in the Ganga River ecosystem of Varanasi City, Uttar Pradesh, India. Environmental Monitoring and Assessment, 196(11), 1134.", "https://doi.org/10.1007/s10661-024-13307-5"], ["Sinha, A. (2018) Ghats on the Ganga in Varanasi, India: a sustainable model for waste management. Landscape Journal, 37(2), pp. 65–78.", "https://doi.org/10.3368/lj.37.2.65"], ["Toxics Link (2021) Quantitative Analysis of Microplastics along River Ganga. New Delhi: Toxics Link with CSIR–National Institute of Oceanography.", "https://toxicslink.org/publications/reports/quantitative-analysis-of-microplastics-along-river-ganga"], ["TNN (2015) Idol immersion routes, spots finalized. The Times of India.", "https://timesofindia.indiatimes.com/city/varanasi/idol-immersion-routes-spots-finalized/articleshow/49449361.cms"]];
const rl = $('#allRefs');
if (rl) REFS.forEach(([t, u]) => rl.insertAdjacentHTML('beforeend', `<li>${t}${u ? ` <a href="${u}" target="_blank" rel="noopener">${u.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>` : ''}</li>`));

/* ------------------------------------------------------------------
   COUNT-UP, REVEAL, PROGRESS, CHAPTER NAV
------------------------------------------------------------------ */
const counters = $$('[data-count]');
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0);
  if (reduce) return; const t0 = performance.now(), D = 1400;
  const tick = t => { const p = Math.min(1, (t - t0) / D), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = v.toFixed(dec); if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), {threshold: .6});
counters.forEach(c => cio.observe(c));

/* timeline: the offering floats along the line like on the river */
(() => {
  const tl = $('.tline'), boat = $('.tl-boat'); if (!tl || !boat) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const imgs = $$('img', boat), stages = $$('.tline > li:not(.tl-float)');
  const SPEED = 70;               // px per second
  let x = 0, stage = -1, raf = 0, last = 0, running = false, fading = false, W = 0, marks = [];
  function measure() {
    const r = tl.getBoundingClientRect(); W = r.width;
    marks = stages.map(li => { const d = $('.tl-dot', li).getBoundingClientRect(); return d.left + d.width / 2 - r.left; });
  }
  function setStage(s) {
    if (s === stage) return; stage = s;
    imgs.forEach((im, i) => im.classList.toggle('on', i === s));
    stages.forEach((li, i) => li.classList.toggle('here', i === s));
  }
  function frame(t) {
    const dt = last ? Math.min(.05, (t - last) / 1000) : 0; last = t;
    if (!fading) x += SPEED * dt;
    const start = 24, end = W - 24;
    if (x < start) x = start;
    setStage(x >= marks[2] ? 2 : x >= marks[1] ? 1 : 0);
    if (x >= end && !fading) {
      fading = true; imgs.forEach(im => im.classList.remove('on'));
      setTimeout(() => { x = start; stage = -1; fading = false; }, 900);
    }
    const bob = Math.sin(t / 420) * 2.2, tilt = Math.sin(t / 650) * 2.5;
    boat.style.transform = `translate(${x.toFixed(1)}px,${bob.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (running || matchMedia('(max-width:640px)').matches) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  measure(); addEventListener('resize', measure);
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? start() : stop())).observe(tl);
})();

/* first mile: the path draws as you scroll through it */
(() => {
  const fm = $('.fmile'), fp = $('.fmile-path'); if (!fm || !fp) return;
  const len = Math.ceil(fp.getTotalLength()); fp.style.setProperty('--len', len);
  const dots = $$('.fmile-dot', fm), pts = $$('.fm-pt', fm);
  // where along the path each dot sits (0..1)
  const samples = []; for (let k = 0; k <= 300; k++) { const q = fp.getPointAtLength(len * k / 300); samples.push([q.x, q.y, k / 300]); }
  const fr = dots.map(d => { const x = +d.getAttribute('cx'), y = +d.getAttribute('cy'); let best = 1e9, f = 0; samples.forEach(([sx, sy, t]) => { const dd = (sx - x) ** 2 + (sy - y) ** 2; if (dd < best) { best = dd; f = t; } }); return f; });
  const order = ['fm-a', 'fm-b', 'fm-c', 'fm-d'];
  let tick = false;
  function upd() {
    tick = false;
    const r = fm.getBoundingClientRect(), vh = innerHeight;
    const start = vh * .92, end = Math.max(vh * .12, vh - r.height - 60);  // done once the whole section is in view
    const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
    fp.style.strokeDashoffset = (len * (1 - p)).toFixed(1);
    dots.forEach((d, i) => { const on = p >= fr[i] - .005; d.classList.toggle('on', on); const li = $('.' + order[i], fm); if (li) li.classList.toggle('on', on); });
  }
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(upd); } }, {passive: true});
  addEventListener('resize', upd); upd();
})();
const revealEls = $$('.sec h2, .fig, .metric, .buses, .tline, .rows-list, .two, .tiers, .giga, .bento, .panel, .comp, .ghats, .dash, .opportunity, .steps, .compare, .kund, .gallery, .loop, .ba, .tradeoffs, .cards, .closing, .principles')
  .filter(el => !el.closest('.viewer'));
revealEls.forEach(el => el.classList.add('reveal'));
const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), {rootMargin: '0px 0px -6% 0px'});
revealEls.forEach(el => rio.observe(el));

const navLinks = $$('.nav-links a');
const MAPN = {introduction:'introduction', scale:'introduction', framing:'framing', timeline:'framing', stakeholders:'framing', wicked:'framing', translating:'translating', 'annual-cycle':'translating', 'first-mile':'translating', ghats:'translating', insights:'insights', 'how-might-we':'insights', collection:'insights', 'ganga-kund':'ganga-kund', 'circular-economy':'ganga-kund', 'system-dependencies':'ganga-kund', reflection:'reflection', authorship:'reflection'};
const secs = $$('section[id]');
let ticking = false;
function onScroll() {
  const mid = innerHeight * .35; let cur = '';
  for (const s of secs) if (s.getBoundingClientRect().top <= mid) cur = MAPN[s.id] || '';
  navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + cur));
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, {passive: true});
onScroll();
})();
