// story2d stage: flat-vector "stickfolk" storytelling in SVG. Every frame is a pure function of t
// (loadBeat builds the scene once, renderAt(t) poses it), so any beat can be rendered alone.
(() => {
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const EASE = {
  linear: (k) => k, in: (k) => k * k * k, out: (k) => 1 - Math.pow(1 - k, 3),
  inout: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  back: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  spring: (k) => (k >= 1 ? 1 : 1 - Math.cos(k * 4.5 * Math.PI) * Math.exp(-k * 6)),
};
const ease = (name, k) => (EASE[name] || EASE.inout)(clamp(k));
function rng(seed) { let q = seed | 0; return () => { q = (q + 0x6D2B79F5) | 0; let t = Math.imul(q ^ (q >>> 15), 1 | q); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hexRgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const rgbHex = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => lerp(v, B[i], k))); };

let CFG, W, H, U, theme, P, svg, defs, world, fxg, beat = null, cam = { px: 0, py: 0, z: 1 }, gid = 0;

function E(tag, attrs, parent, text) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  if (text !== undefined) e.textContent = text;
  return e;
}
function lin(stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
  const id = 'g' + (gid++), g = E('linearGradient', { id, x1, y1, x2, y2 }, defs);
  stops.forEach(([o, c, op]) => E('stop', { offset: o, 'stop-color': c, 'stop-opacity': op ?? 1 }, g));
  return `url(#${id})`;
}
function rad(stops, cx = 0.5, cy = 0.5, r = 0.5) {
  const id = 'g' + (gid++), g = E('radialGradient', { id, cx, cy, r }, defs);
  stops.forEach(([o, c, op]) => E('stop', { offset: o, 'stop-color': c, 'stop-opacity': op ?? 1 }, g));
  return `url(#${id})`;
}
const col = (c) => (c && P[c]) || c;

// ----------------------------------------------------------------- keyframe tracks
function makeTracks(keys) {
  const T = {};
  (keys || []).slice().sort((a, b) => a.t - b.t).forEach((k) => {
    for (const p in k) { if (p === 't' || p === 'ease') continue; (T[p] = T[p] || []).push({ t: k.t, v: k[p], ease: k.ease || 'inout' }); }
  });
  return T;
}
function sampleTrack(tr, t) {
  if (t <= tr[0].t) return tr[0].v;
  for (let i = 1; i < tr.length; i++) {
    if (t <= tr[i].t) { const a = tr[i - 1], b = tr[i]; const k = ease(b.ease, (t - a.t) / Math.max(1e-6, b.t - a.t)); return typeof a.v === 'number' ? lerp(a.v, b.v, k) : (k < 0.5 ? a.v : b.v); }
  }
  return tr[tr.length - 1].v;
}
// value of property p at time t: tracks win, otherwise the static value, otherwise the default
const tv = (o, p, t, d) => (o._T[p] ? sampleTrack(o._T[p], t) : (o[p] !== undefined ? o[p] : d));
const numTrack = (v, t, d = 0) => (v === undefined ? d : typeof v === 'number' ? v : sampleTrack(makeTracks(v.map((k) => ({ t: k.t, v: k.v, ease: k.ease })))['v'], t));

// ----------------------------------------------------------------- backgrounds
function buildSky(o, g) {
  const top = col(o.top ?? 'sky_top'), bot = col(o.bottom ?? 'sky_bottom'), to = o.to ?? H * 0.62;
  E('rect', { x: -600, y: -900, width: W + 1200, height: to + 900 + 40, fill: lin(o.stops || [[0, top], [1, bot]], 0, 0, 0, 1) }, g);
  const R = rng(o.seed ?? 11), stars = [];
  for (let i = 0; i < (o.stars ?? 0); i++) stars.push(E('circle', { cx: R() * (W + 600) - 300, cy: R() * to * 0.8 - 200, r: 0.8 + R() * 1.6, fill: '#fff' }, g));
  const ph = stars.map(() => R() * 6.28);
  if (o.sun) {
    const s = o.sun, c = col(s.color ?? 'sun');
    E('circle', { cx: s.x, cy: s.y, r: s.r * 3.2, fill: rad([[0, c, 0.42], [1, c, 0]]) }, g);
    E('circle', { cx: s.x, cy: s.y, r: s.r, fill: c }, g);
  }
  return { upd(t) { stars.forEach((e, i) => e.setAttribute('opacity', 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + ph[i])))); } };
}
function buildSea(o, g) {
  const y0 = o.y ?? 640, top = col(o.top ?? 'sea_top'), bot = col(o.bottom ?? 'sea_bottom');
  E('rect', { x: -600, y: y0, width: W + 1200, height: H + 1200 - y0, fill: lin([[0, top], [1, bot]]) }, g);
  E('rect', { x: -600, y: y0 - 1, width: W + 1200, height: 3, fill: col(o.haze ?? '#ffffff'), opacity: o.haze_opacity ?? 0.12 }, g);
  const R = rng(o.seed ?? 5), n = o.lines ?? 70, D = [];
  for (let i = 0; i < n; i++) { const k = Math.pow(R(), 1.4); D.push({ y: y0 + 8 + k * (H + 300 - y0), x: R() * (W + 700) - 350, len: 18 + k * 90 + R() * 30, sp: 0.4 + R(), k }); }
  const path = E('path', { fill: 'none', stroke: col(o.line ?? '#9fb6d6'), 'stroke-linecap': 'round', opacity: o.line_opacity ?? 0.2 }, g);
  const span = W + 700, speed = o.speed ?? 14;
  return { upd(t) {
    let d = '';
    D.forEach((q) => { const x = ((q.x + t * speed * q.sp * (0.5 + q.k)) % span + span) % span - 350; d += `M${x.toFixed(1)} ${q.y.toFixed(1)}h${q.len.toFixed(1)}`; });
    path.setAttribute('d', d); path.setAttribute('stroke-width', 2.5);
  } };
}
function buildDeep(o, g) {
  const top = col(o.top ?? '#0f3a63'), bot = col(o.bottom ?? '#04101f');
  E('rect', { x: -600, y: -900, width: W + 1200, height: H + 1800, fill: lin([[0, top], [1, bot]]) }, g);
  const R = rng(o.seed ?? 8), rays = [], parts = [];
  for (let i = 0; i < (o.rays ?? 6); i++) { const x = R() * W, w = 40 + R() * 80; rays.push({ e: E('polygon', { points: `${x - w * 0.3},-200 ${x + w * 0.3},-200 ${x + w * 1.4},${H} ${x - w * 1.0},${H}`, fill: lin([[0, '#bfe6ff', 0.32], [1, '#bfe6ff', 0]]) }, g), ph: R() * 6.28, sp: 0.3 + R() * 0.4 }); }
  for (let i = 0; i < (o.particles ?? 50); i++) parts.push({ e: E('circle', { r: 1 + R() * 2.2, fill: '#cfe9ff' }, g), x: R() * W, y: R() * H, sp: 6 + R() * 16, a: 0.2 + R() * 0.4, ph: R() * 6.28 });
  if (o.surface !== undefined) E('path', { d: `M-600 ${o.surface} q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0`, fill: 'none', stroke: '#d9f0ff', 'stroke-width': 4, opacity: 0.7 }, g);
  return { upd(t) {
    rays.forEach((r) => r.e.setAttribute('transform', `translate(${Math.sin(t * r.sp + r.ph) * 30},0)`));
    parts.forEach((p) => { const y = ((p.y - t * p.sp) % (H + 100) + H + 100) % (H + 100) - 50; p.e.setAttribute('cx', p.x + Math.sin(t + p.ph) * 8); p.e.setAttribute('cy', y); p.e.setAttribute('opacity', p.a); });
  } };
}
function buildCity(o, g) {
  const R = rng(o.seed ?? 3), base = o.y ?? 760, n = o.n ?? 8, body = col(o.color ?? '#090a10'), win = col(o.window ?? '#d7a85a');
  let x = -40;
  for (let i = 0; i < n; i++) {
    const w = 90 + R() * 90, h = (o.min ?? 260) + R() * ((o.max ?? 620) - (o.min ?? 260));
    E('rect', { x, y: base - h, width: w, height: h + 600, fill: body, stroke: 'rgba(130,150,185,.35)', 'stroke-width': 2 }, g);
    for (let wy = base - h + 22; wy < base - 20; wy += 34) for (let wx = x + 14; wx < x + w - 18; wx += 28) if (R() < (o.lit ?? 0.35)) E('rect', { x: wx, y: wy, width: 15, height: 17, fill: win, opacity: 0.55 + R() * 0.4 }, g);
    x += w + (R() * 14);
    if (x > W + 100) break;
  }
  return {};
}

// ----------------------------------------------------------------- people
const OUTFIT = {
  fisher: { shirt: 'shirt', sleeve: 'sleeve', pants: 'pants' }, suit: { shirt: '#0d0d10', sleeve: '#0d0d10', pants: '#0d0d10', tie: 'red' },
  hero: { shirt: 'hero', sleeve: 'hero', pants: '#1c1c20' }, gray: { shirt: '#858996', sleeve: '#858996', pants: '#34363c' },
  blue: { shirt: '#566a8e', sleeve: '#566a8e', pants: '#2a2f3a' },
};
const POSE = {
  idle: [6, 4, 6, 4], hands_up: [170, 8, 170, 8], point_r: [6, 4, 92, 0], point_l: [92, 0, 6, 4], wave_r: [6, 4, 140, 40],
  hips: [30, -75, 30, -75], arms_out: [88, 0, 88, 0], reach: [6, 4, 70, 30],
};
const FACE = { // brow angle, brow lift, mouth kind, eye scale
  neutral: [0, 0, 'flat', 1], smile: [0, 0, 'smile', 1], smirk: [-4, 0, 'smirk', 1], sad: [-16, -2, 'frown', 1], angry: [20, 2, 'frown', 0.9],
  shock: [0, -9, 'o', 1.25], grin: [0, -2, 'grin', 1], worry: [-12, -3, 'wave', 1.1],
};
function buildPerson(o, g) {
  const h = o.h ?? 220, hr = 0.135 * h, lg = 0.43 * h, th = 0.31 * h, tw = 0.27 * h, uw = 0.056 * h;
  const out = Object.assign({}, OUTFIT[o.outfit] || OUTFIT.fisher, o.colors || {});
  const C = (k) => col(out[k]) || '#888';
  const skin = col(o.skin ?? 'skin'), line = '#17171a';
  const root = E('g', null, g);
  const legs = [-1, 1].map((s) => {
    const lgg = E('g', { transform: `translate(${s * 0.065 * h},${-lg})` }, root);
    E('line', { x1: 0, y1: 0, x2: 0, y2: lg - 0.02 * h, stroke: C('pants'), 'stroke-width': 0.075 * h, 'stroke-linecap': 'round' }, lgg);
    E('rect', { x: -0.05 * h + s * 0.012 * h, y: lg - 0.032 * h, width: 0.1 * h, height: 0.034 * h, rx: 0.014 * h, fill: '#141416' }, lgg);
    return lgg;
  });
  const upper = E('g', null, root);
  if (o.hair === 'long') E('path', { d: `M${-hr * 1.05},${-lg - th - 0.12 * h} Q${-hr * 1.5},${-lg - th * 0.4} ${-hr * 1.1},${-lg - th * 0.55} L${hr * 1.1},${-lg - th * 0.55} Q${hr * 1.5},${-lg - th * 0.4} ${hr * 1.05},${-lg - th - 0.12 * h} Z`, fill: '#141418' }, upper);
  E('rect', { x: -tw / 2, y: -lg - th, width: tw, height: th, rx: 0.06 * h, fill: C('shirt') }, upper);
  if (out.tie) {
    E('polygon', { points: `${-0.04 * h},${-lg - th} ${0.04 * h},${-lg - th} 0,${-lg - th + 0.07 * h}`, fill: '#e8e8e8' }, upper);
    E('polygon', { points: `${-0.016 * h},${-lg - th + 0.015 * h} ${0.016 * h},${-lg - th + 0.015 * h} ${0.022 * h},${-lg - th * 0.45} 0,${-lg - th * 0.38} ${-0.022 * h},${-lg - th * 0.45}`, fill: col('tie') }, upper);
  }
  const arms = [-1, 1].map((s) => {
    const sh = E('g', { transform: `translate(${s * (tw / 2 - 0.012 * h)},${-lg - th + 0.045 * h})` }, upper);
    E('line', { x1: 0, y1: 0, x2: 0, y2: 0.17 * h, stroke: C('sleeve'), 'stroke-width': uw, 'stroke-linecap': 'round' }, sh);
    const fo = E('g', { transform: `translate(0,${0.17 * h})` }, sh);
    E('line', { x1: 0, y1: 0, x2: 0, y2: 0.16 * h, stroke: C('sleeve'), 'stroke-width': uw * 0.92, 'stroke-linecap': 'round' }, fo);
    E('circle', { cx: 0, cy: 0.16 * h, r: 0.033 * h, fill: skin }, fo);
    const hand = E('g', { transform: `translate(0,${0.16 * h})` }, fo);
    return { sh, fo, hand };
  });
  // held props (drawn in the hand group; they counter-rotate so lanterns hang down)
  const holdProp = (hand, kind, side) => {
    const pg = E('g', null, hand);
    if (kind === 'lantern') {
      E('path', { d: `M${-0.02 * h},0 q${0.02 * h},${-0.05 * h} ${0.04 * h},0`, fill: 'none', stroke: '#222', 'stroke-width': 2 }, pg);
