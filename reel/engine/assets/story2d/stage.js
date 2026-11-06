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
      E('rect', { x: -0.028 * h, y: 0, width: 0.056 * h, height: 0.08 * h, rx: 4, fill: '#3a2b1c', stroke: '#1a120a', 'stroke-width': 1.5 }, pg);
      const glow = E('circle', { cx: 0, cy: 0.04 * h, r: 0.55 * h, fill: rad([[0, col('light'), 0.95], [0.18, col('light'), 0.5], [1, col('light'), 0]]) }, pg);
      E('rect', { x: -0.018 * h, y: 0.012 * h, width: 0.036 * h, height: 0.056 * h, rx: 3, fill: col('light') }, pg);
      return { pg, glow, counter: true };
    }
    if (kind === 'flashlight') {
      E('rect', { x: -0.018 * h, y: -0.01 * h, width: 0.036 * h, height: 0.1 * h, rx: 4, fill: '#555a66' }, pg);
      E('polygon', { points: `${-0.022 * h},${0.1 * h} ${0.022 * h},${0.1 * h} ${0.24 * h},${0.9 * h} ${-0.24 * h},${0.9 * h}`, fill: lin([[0, col('light'), 0.75], [1, col('light'), 0]]) }, pg);
      return { pg, counter: false };
    }
    if (kind === 'bucket') { E('path', { d: `M${-0.05 * h},0.02 L${0.05 * h},0.02 L${0.04 * h},${0.1 * h} L${-0.04 * h},${0.1 * h} Z`, fill: col(o.prop_color ?? '#b83a2e') }, pg); E('path', { d: `M${-0.05 * h},0.02 q${0.05 * h},${-0.05 * h} ${0.1 * h},0`, fill: 'none', stroke: '#222', 'stroke-width': 2 }, pg); return { pg, counter: true }; }
    if (kind === 'oar') { E('line', { x1: 0, y1: -0.35 * h, x2: 0, y2: 0.5 * h, stroke: '#7a5a3c', 'stroke-width': 0.014 * h, 'stroke-linecap': 'round' }, pg); E('rect', { x: -0.025 * h, y: 0.42 * h, width: 0.05 * h, height: 0.18 * h, rx: 4, fill: '#8a6a46' }, pg); return { pg, counter: false }; }
    if (kind === 'briefcase') { E('rect', { x: -0.07 * h, y: 0.01 * h, width: 0.14 * h, height: 0.1 * h, rx: 4, fill: '#5a3a24' }, pg); return { pg, counter: true }; }
    return { pg, counter: false };
  };
  const props = [];
  if (o.hold) props.push({ ...holdProp(arms[1].hand, o.hold, 1), arm: 1 });
  if (o.holdL) props.push({ ...holdProp(arms[0].hand, o.holdL, 0), arm: 0 });
  // head
  const cy = -lg - th - 0.115 * h, head = E('g', { transform: `translate(0,${cy})` }, upper);
  E('circle', { cx: 0, cy: 0, r: hr, fill: skin }, head);
  const face = E('g', null, head);
  const hat = o.hat;
  if (o.hair === 'long') E('path', { d: `M${-hr},${-hr * 0.1} A${hr},${hr} 0 0 1 ${hr},${-hr * 0.1} Q0,${-hr * 0.95} ${-hr},${-hr * 0.1} Z`, fill: '#141418' }, head);
  if (hat === 'straw') {
    E('path', { d: `M${-hr * 1.75},${-hr * 0.45} Q0,${-hr * 0.1} ${hr * 1.75},${-hr * 0.45} L0,${-hr * 2.15} Z`, fill: col('straw') }, head);
    E('path', { d: `M0,${-hr * 2.15} L${hr * 1.75},${-hr * 0.45} Q${hr * 0.9},${-hr * 0.25} 0,${-hr * 0.22} Z`, fill: 'rgba(0,0,0,.12)' }, head);
    E('path', { d: `M${-hr * 1.75},${-hr * 0.45} Q0,${-hr * 0.1} ${hr * 1.75},${-hr * 0.45}`, fill: 'none', stroke: 'rgba(80,55,15,.55)', 'stroke-width': 2 }, head);
  } else if (hat === 'cap') {
    E('path', { d: `M${-hr * 1.02},${-hr * 0.2} A${hr * 1.02},${hr * 1.02} 0 0 1 ${hr * 1.02},${-hr * 0.2} Z`, fill: col('cap') }, head);
    E('path', { d: `M${hr * 0.3},${-hr * 0.22} L${hr * 1.55},${-hr * 0.2} Q${hr * 1.62},${-hr * 0.02} ${hr * 1.3},${-hr * 0.02} L${hr * 0.3},${-hr * 0.06} Z`, fill: col('cap_dark') }, head);
  } else if (hat === 'beanie') {
    E('path', { d: `M${-hr * 1.04},${-hr * 0.25} A${hr * 1.04},${hr * 1.1} 0 0 1 ${hr * 1.04},${-hr * 0.25} Z`, fill: col('cap') }, head);
    E('rect', { x: -hr * 1.06, y: -hr * 0.42, width: hr * 2.12, height: hr * 0.24, rx: hr * 0.1, fill: col('cap_dark') }, head);
    E('circle', { cx: 0, cy: -hr * 1.18, r: hr * 0.2, fill: col('cap_dark') }, head);
  }
  if (o.glasses) { E('rect', { x: -hr * 0.82, y: -hr * 0.2, width: hr * 1.64, height: hr * 0.3, rx: hr * 0.1, fill: '#0a0a0c' }, head); }
  const eyeY = -hr * 0.02, eyeX = hr * 0.38;
  const eyes = [-1, 1].map((s) => E('ellipse', { cx: s * eyeX, cy: eyeY, rx: hr * 0.1, ry: hr * 0.16, fill: line }, face));
  const brows = [-1, 1].map(() => E('line', { stroke: line, 'stroke-width': hr * 0.085, 'stroke-linecap': 'round' }, face));
  const mouth = E('path', { fill: 'none', stroke: line, 'stroke-width': hr * 0.085, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
  const setFace = (name, look, blink) => {
    const [ba, bl, mk, es] = FACE[name] || FACE.neutral, lx = (look?.[0] ?? 0) * hr * 0.12, ly = (look?.[1] ?? 0) * hr * 0.1;
    eyes.forEach((e, i) => { e.setAttribute('cx', (i ? 1 : -1) * eyeX + lx); e.setAttribute('cy', eyeY + ly); e.setAttribute('rx', hr * 0.1 * es); e.setAttribute('ry', hr * 0.16 * es * (blink ? 0.12 : 1)); e.setAttribute('display', o.glasses ? 'none' : ''); });
    brows.forEach((b, i) => {
      const sg = i ? 1 : -1, cx = sg * eyeX, by = eyeY - hr * 0.36 + bl * hr * 0.05, a = ba * Math.PI / 180, L = hr * 0.26;
      b.setAttribute('x1', cx - sg * L * Math.cos(a)); b.setAttribute('y1', by + L * Math.sin(a));
      b.setAttribute('x2', cx + sg * L * Math.cos(a)); b.setAttribute('y2', by - L * Math.sin(a));
    });
    const my = hr * 0.5, mw = hr * 0.34;
    let d, fill = 'none';
    if (mk === 'smile') d = `M${-mw},${my - 3} Q0,${my + hr * 0.38} ${mw},${my - 3}`;
    else if (mk === 'smirk') d = `M${-mw * 0.7},${my} Q${mw * 0.3},${my + hr * 0.1} ${mw * 1.1},${my - hr * 0.16}`;
    else if (mk === 'frown') d = `M${-mw},${my + hr * 0.12} Q0,${my - hr * 0.22} ${mw},${my + hr * 0.12}`;
    else if (mk === 'wave') d = `M${-mw},${my + 2} q${mw * 0.5},${-hr * 0.2} ${mw},0 t${mw},0`;
    else if (mk === 'o') { d = `M0,${my - hr * 0.12} a${hr * 0.17},${hr * 0.24} 0 1 0 0.01,0 Z`; fill = '#17171a'; }
    else if (mk === 'grin') { d = `M${-mw * 1.1},${my - hr * 0.08} Q0,${my + hr * 0.62} ${mw * 1.1},${my - hr * 0.08} Z`; fill = '#fff'; }
    else d = `M${-mw * 0.9},${my} L${mw * 0.9},${my}`;
    mouth.setAttribute('d', d); mouth.setAttribute('fill', fill);
  };
  return { g: root, upd(t) {
    const pose = POSE[o.pose] || POSE.idle;
    let aL = tv(o, 'aL', t, pose[0]), bL = tv(o, 'bL', t, pose[1]), aR = tv(o, 'aR', t, pose[2]), bR = tv(o, 'bR', t, pose[3]);
    let lL = tv(o, 'lL', t, 0), lR = tv(o, 'lR', t, 0);
    if (o.wave) { bR += Math.sin(t * 7) * 18; }
    if (o.walk) { const ph = t * o.walk * 6.283; const wa = o.walk_amp ?? 20; lL += Math.sin(ph) * wa; lR -= Math.sin(ph) * wa; aL -= Math.sin(ph) * wa * 0.7; aR += Math.sin(ph) * wa * 0.7; }
    legs[0].setAttribute('transform', `translate(${-0.065 * h},${-lg}) rotate(${lL})`);
    legs[1].setAttribute('transform', `translate(${0.065 * h},${-lg}) rotate(${-lR})`);
    const lean = tv(o, 'lean', t, 0), br = Math.sin(t * 2.4) * 0.006 * h;
    upper.setAttribute('transform', `translate(0,${br}) rotate(${lean} 0 ${-lg})`);
    [[arms[0], aL, bL, 1], [arms[1], aR, bR, -1]].forEach(([a, ang, bend, s]) => {
      a.sh.setAttribute('transform', `translate(${(s === 1 ? -1 : 1) * (tw / 2 - 0.012 * h)},${-lg - th + 0.045 * h}) rotate(${s * ang})`);
      a.fo.setAttribute('transform', `translate(0,${0.17 * h}) rotate(${s * bend})`);
    });
    props.forEach((p) => {
      const ang = p.arm === 1 ? -(aR + bR) : (aL + bL);
      p.pg.setAttribute('transform', p.counter ? `rotate(${-ang + (p.arm === 1 ? 0 : 0)})` : '');
      if (p.glow) p.glow.setAttribute('opacity', clamp(tv(o, 'lit', t, 1)));
    });
    let fname = o.face || 'neutral';
    (o.faces || []).forEach((f) => { if (t >= f.t) fname = f.face; });
    const blink = !o.noblink && (t % 3.4) < 0.11 && fname === 'neutral';
    setFace(fname, [tv(o, 'lookx', t, o.look?.[0] ?? 0), tv(o, 'looky', t, o.look?.[1] ?? 0)], blink);
  } };
}

// ----------------------------------------------------------------- vehicles and animals
function buildBoat(o, g) {
  const L = o.len ?? 300, hull = col(o.hull ?? 'hull'), stripe = col(o.stripe ?? 'stripe');
  const gg = E('g', null, g);
  E('path', { d: `M${-L / 2},-26 Q${-L / 2 + 26},4 ${-L * 0.34},12 L${L * 0.36},12 Q${L / 2 - 20},0 ${L / 2},-34 Q${L * 0.1},-14 ${-L * 0.1},-14 Q${-L * 0.3},-14 ${-L / 2},-26 Z`, fill: hull }, gg);
  E('path', { d: `M${-L / 2 + 8},-24 Q${-L * 0.3},-12 ${-L * 0.1},-12 Q${L * 0.1},-12 ${L / 2 - 6},-31`, fill: 'none', stroke: col(o.rim ?? '#8a6a46'), 'stroke-width': 4, 'stroke-linecap': 'round' }, gg);
  E('path', { d: `M${-L * 0.36},4 Q0,8 ${L * 0.38},0`, fill: 'none', stroke: stripe, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, gg);
  E('circle', { cx: L / 2 - 14, cy: -20, r: 3, fill: stripe }, gg);
  return { g: gg };
}
function buildShip(o, g) {
  const s = o.s ?? 1, gg = E('g', { transform: `scale(${s})` }, g);
  E('path', { d: 'M-340,-120 L330,-120 L290,0 L-310,0 Z', fill: '#0b0b0e' }, gg);
  E('rect', { x: -340, y: -50, width: 650, height: 14, fill: col('red') }, gg);
  E('rect', { x: -70, y: -250, width: 150, height: 130, fill: '#ececec' }, gg);
  E('rect', { x: -40, y: -330, width: 100, height: 82, fill: '#f4f4f4' }, gg);
  for (let i = 0; i < 4; i++) E('rect', { x: -34 + i * 24, y: -312, width: 14, height: 14, fill: col('window') }, gg);
  for (let i = 0; i < 6; i++) E('rect', { x: -56 + i * 24, y: -226, width: 14, height: 14, fill: col('window'), opacity: 0.85 }, gg);
  E('line', { x1: 10, y1: -330, x2: 10, y2: -430, stroke: '#ddd', 'stroke-width': 4 }, gg);
  E('line', { x1: 10, y1: -420, x2: 230, y2: -128, stroke: '#cfcfcf', 'stroke-width': 2 }, gg);
  return { g: gg };
}
function buildGull(o, g) {
  const s = o.s ?? 1, gg = E('g', { transform: `scale(${s})` }, g), fly = o.fly ?? 0;
  const legs = E('g', null, gg);
  [-8, 12].forEach((x) => E('rect', { x, y: -72, width: 8, height: 72, fill: col('beak') }, legs));
  if (fly) legs.setAttribute('display', 'none');
  E('polygon', { points: '-90,-122 -170,-136 -108,-86', fill: '#f4f4f6' }, gg);
  E('ellipse', { cx: 0, cy: -105, rx: 98, ry: 40, fill: '#f6f6f8' }, gg);
  const wing = E('g', null, gg);
  E('ellipse', { cx: -8, cy: -116, rx: 76, ry: 27, fill: '#aeb4c2', stroke: '#8b92a3', 'stroke-width': 3, transform: 'rotate(-6 -8 -116)' }, wing);
  E('circle', { cx: 80, cy: -150, r: 38, fill: '#f8f8fa' }, gg);
  E('polygon', { points: '108,-152 154,-130 110,-130', fill: col('beak') }, gg);
  E('circle', { cx: 94, cy: -158, r: 7, fill: '#17171a' }, gg);
  E('line', { x1: 80, y1: -176, x2: 108, y2: -162, stroke: '#17171a', 'stroke-width': 6, 'stroke-linecap': 'round' }, gg);
  return { g: gg, upd(t) { if (fly) wing.setAttribute('transform', `rotate(${Math.sin(t * 9 * fly) * 38} -10 -125)`); } };
}
function buildFlock(o, g) {
  const R = rng(o.seed ?? 2), n = o.n ?? 8, A = o.area ?? [0, 80, W, 300], birds = [], sz = o.size ?? 1;
  for (let i = 0; i < n; i++) birds.push({ e: E('path', { fill: 'none', stroke: col(o.color ?? '#f2f2f4'), 'stroke-width': 3 * sz, 'stroke-linecap': 'round' }, g), x: R(), y: R(), ph: R() * 6.28, sp: 0.7 + R() * 0.6, s: 0.7 + R() * 0.6 });
  const [vx, vy] = o.speed ?? [30, -4];
  return { upd(t) {
    birds.forEach((b) => {
      const w = A[2] - A[0] + 200, x = (((b.x * w + t * vx * b.sp) % w) + w) % w + A[0] - 100, y = lerp(A[1], A[3], b.y) + Math.sin(t * 0.8 + b.ph) * 12 + t * vy * b.sp * 0.3;
      const f = Math.sin(t * 8 * b.sp + b.ph) * 7 * b.s * sz, L = 15 * b.s * sz;
      b.e.setAttribute('d', `M${x - L},${y + f * 0.3} Q${x - L / 2},${y - f} ${x},${y} Q${x + L / 2},${y - f} ${x + L},${y + f * 0.3}`);
    });
  } };
}
function buildSchool(o, g) {
  const R = rng(o.seed ?? 4), n = o.n ?? 30, F = [], c = col(o.color ?? '#dfe8f2');
  const body = (e) => E('g', null, g);
  for (let i = 0; i < n; i++) {
    const gg = E('g', null, g);
    if (o.shape === 'square') E('rect', { x: -4, y: -4, width: 8, height: 8, fill: c }, gg);
    else { E('ellipse', { cx: 0, cy: 0, rx: 13, ry: 5.5, fill: c }, gg); E('polygon', { points: '-11,0 -22,-6 -22,6', fill: c }, gg); E('circle', { cx: 7, cy: -1, r: 1.2, fill: '#10202e' }, gg); }
    F.push({ gg, a: R() * 6.283, r: 0.35 + R() * 0.65, ph: R() * 6.283, dir: R() < 0.5 ? 1 : -1, sz: 0.8 + R() * 0.5, x: R(), y: R() });
  }
  const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, rr = o.r ?? 180, sp = o.speed ?? 0.5, mode = o.mode ?? 'ring', tgt = o.target ?? [cx, cy];
  const pos = (f, t) => {
    const conv = o.converge === undefined ? 0 : numTrack(o.converge, t, 0);
    let x, y;
    if (mode === 'ring') { const a = f.a + t * sp * f.dir; const r = rr * (0.78 + 0.22 * f.r) * (1 - 0.15 * Math.sin(t * 0.7 + f.ph)); x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r * (o.squash ?? 0.8); }
    else { x = cx + (f.x - 0.5) * rr * 2.2 + Math.sin(t * sp + f.ph) * 26; y = cy + (f.y - 0.5) * rr * 1.6 + Math.cos(t * sp * 0.8 + f.ph * 1.3) * 18; }
    return [lerp(x, tgt[0] + Math.cos(f.ph) * rr * 0.12 * f.r, conv), lerp(y, tgt[1] + Math.sin(f.ph) * rr * 0.12 * f.r, conv)];
  };
  return { upd(t) {
    F.forEach((f) => {
      const [x, y] = pos(f, t), [x2, y2] = pos(f, t + 0.05), ang = Math.atan2(y2 - y, x2 - x) * 180 / Math.PI;
      const flip = Math.cos(ang * Math.PI / 180) < 0 ? -1 : 1;
      f.gg.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${o.shape === 'square' ? 0 : (flip < 0 ? ang - 180 : ang)}) scale(${f.sz * (o.size ?? 1)},${flip * f.sz * (o.size ?? 1)})`);
    });
  } };
}
function buildRadar(o, g) {
  const r = o.r ?? 150, gc = col(o.color ?? '#27d16a'), R = rng(o.seed ?? 9);
  E('circle', { r: r + 8, fill: '#2b2f33' }, g);
  E('circle', { r, fill: rad([[0, '#0d2a1a'], [1, '#04120a']]) }, g);
  [0.33, 0.66, 1].forEach((k) => E('circle', { r: r * k, fill: 'none', stroke: gc, 'stroke-opacity': 0.35, 'stroke-width': 2 }, g));
  E('line', { x1: -r, y1: 0, x2: r, y2: 0, stroke: gc, 'stroke-opacity': 0.3 }, g); E('line', { x1: 0, y1: -r, x2: 0, y2: r, stroke: gc, 'stroke-opacity': 0.3 }, g);
  const sweep = E('path', { d: `M0,0 L${r},0 A${r},${r} 0 0 0 ${r * Math.cos(-0.7)},${r * Math.sin(-0.7)} Z`, fill: lin([[0, gc, 0.0], [1, gc, 0.55]], 0, 0, 1, 0) }, g);
  const blips = [];
  for (let i = 0; i < (o.blips ?? 22); i++) { const a = R() * 6.283, d = Math.sqrt(R()) * r * (o.spread ?? 0.8), cxp = (o.cluster ? o.cluster[0] * r : 0), cyp = (o.cluster ? o.cluster[1] * r : 0); const k = o.cluster ? 0.35 : 1; blips.push({ e: E('circle', { cx: cxp + Math.cos(a) * d * k, cy: cyp + Math.sin(a) * d * k, r: o.blip ?? 5, fill: gc }, g), a: Math.atan2(cyp + Math.sin(a) * d * k, cxp + Math.cos(a) * d * k) }); }
  const sp = o.sweep ?? 0.5;
  return { upd(t) {
    const ang = (t * sp * 6.283) % 6.283; sweep.setAttribute('transform', `rotate(${ang * 180 / Math.PI})`);
    blips.forEach((b) => { let d = (ang - b.a) % 6.283; if (d < 0) d += 6.283; b.e.setAttribute('opacity', 0.3 + 0.7 * Math.exp(-d * 1.4)); });
  } };
}

// ----------------------------------------------------------------- lights and plain shapes
function buildGlow(o, g) { return { g: E('circle', { r: o.r ?? 200, fill: rad([[0, col(o.color ?? 'light'), 0.9], [0.25, col(o.color ?? 'light'), 0.45], [1, col(o.color ?? 'light'), 0]]) }, g) }; }
function buildCone(o, g) {
  const L = o.len ?? 500, sp = o.spread ?? 260, c = col(o.color ?? 'light');
  return { g: E('polygon', { points: `0,0 ${-sp / 2},${L} ${sp / 2},${L}`, fill: lin([[0, c, o.alpha ?? 0.6], [1, c, 0]]) }, g) };
}
function paint(spec) { return spec && typeof spec === 'object' && spec.grad ? lin(spec.grad.map(([a, b, c]) => [a, col(b), c]), 0, 0, spec.dir === 'h' ? 1 : 0, spec.dir === 'h' ? 0 : 1) : col(spec); }
function buildShape(o, g) {
  const a = { fill: paint(o.fill ?? 'none'), stroke: col(o.stroke ?? 'none'), 'stroke-width': o.sw ?? 0, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  if (o.fill_opacity !== undefined) a['fill-opacity'] = o.fill_opacity;
  let e;
  if (o.type === 'rect') e = E('rect', { ...a, x: -(o.w ?? 100) / 2, y: -(o.h ?? 100) / 2, width: o.w ?? 100, height: o.h ?? 100, rx: o.r ?? 0 }, g);
  else if (o.type === 'circle') e = E('circle', { ...a, r: o.r ?? 50 }, g);
  else if (o.type === 'ellipse') e = E('ellipse', { ...a, rx: o.rx ?? 80, ry: o.ry ?? 40 }, g);
  else if (o.type === 'poly') e = E('polygon', { ...a, points: (o.points || []).map((p) => p.join(',')).join(' ') }, g);
  else if (o.type === 'path') e = E('path', { ...a, d: o.d }, g);
  else if (o.type === 'line') e = E('line', { ...a, x1: o.x1 ?? 0, y1: o.y1 ?? 0, x2: o.x2 ?? 100, y2: o.y2 ?? 0 }, g);
  else if (o.type === 'text') { e = E('text', { ...a, 'text-anchor': 'middle', 'font-size': o.size ?? 40, 'font-weight': o.weight ?? 700, 'font-family': (o.font === 'mono' ? theme.fonts.mono : o.font === 'serif' ? theme.fonts.serif : theme.fonts.caption), 'letter-spacing': o.ls ?? 0, fill: col(o.fill ?? '#fff') }, g, o.text ?? ''); }
  else if (o.type === 'image') { const src = o.src.startsWith('/') || o.src.startsWith('http') ? o.src : '/kit/' + o.src; e = E('image', { href: src, x: -(o.w ?? 400) / 2, y: -(o.h ?? 400) / 2, width: o.w ?? 400, height: o.h ?? 400, preserveAspectRatio: 'xMidYMid slice' }, g); }
  return { g: e };
}
const BUILDERS = { sky: buildSky, sea: buildSea, deep: buildDeep, city: buildCity, person: buildPerson, boat: buildBoat, ship: buildShip, gull: buildGull, flock: buildFlock, school: buildSchool, radar: buildRadar, glow: buildGlow, cone: buildCone };

const NOPOS = new Set(['sky', 'sea', 'deep', 'city']);
// ----------------------------------------------------------------- scene objects
function buildObject(o, parentG, reg) {
  o._T = makeTracks(o.keys);
  const holder = E('g', null, parentG);          // transform holder (position, rotation, scale, opacity)
  const inner = E('g', null, holder);
  const type = o.type, b = (BUILDERS[type] || buildShape)(o, inner) || {};
  const obj = { o, holder, b };
  if (o.id) reg[o.id] = obj;
  obj.children = inner;
  return obj;
}
function updateObject(obj, t, top) {
  const o = obj.o, par = o.par ?? (top ? 1 : 1);
  const pp = (k) => (NOPOS.has(o.type) && !o._T[k] ? 0 : tv(o, k, t, 0));   // background types use x/y as builder parameters
  let x = pp('x'), y = pp('y'), rot = tv(o, 'rot', t, 0), sc = tv(o, 'scale', t, 1), sx = tv(o, 'sx', t, 1), sy = tv(o, 'sy', t, 1);
  if (o.bob) { x += Math.sin(t * (o.bob.speed ?? 1.2) * 6.283 + (o.bob.phase ?? 0)) * (o.bob.ax ?? 0); y += Math.sin(t * (o.bob.speed ?? 1.2) * 6.283 + (o.bob.phase ?? 0)) * (o.bob.amp ?? 5); rot += Math.sin(t * (o.bob.speed ?? 1.2) * 6.283 * 0.8 + (o.bob.phase ?? 0)) * (o.bob.rot ?? 0); }
  if (o.drift) { x += o.drift[0] * t; y += o.drift[1] * t; }
  if (top && par !== 1) { x += cam.px * (1 - par); y += cam.py * (1 - par); }
  const flip = o.flip ? -1 : 1;
  obj.holder.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)}) rotate(${rot.toFixed(3)}) scale(${(sc * sx * flip).toFixed(4)},${(sc * sy).toFixed(4)})`);
  const op = clamp(tv(o, 'opacity', t, 1)); obj.holder.setAttribute('opacity', op); obj.holder.setAttribute('display', op <= 0.001 ? 'none' : '');
  if (obj.b.upd) obj.b.upd(t);
}

// ----------------------------------------------------------------- caption, watermark, fx
function buildCaption(c) {
  const el = $('caption'); el.textContent = '';
  if (!c) return null;
  const words = String(c.text).replace(/\*\*/g, '').split(/\s+/).filter(Boolean), from = c.from ?? 0.2, to = c.to ?? 3;
  const wts = words.map((w) => w.length + 2), tot = wts.reduce((a, b) => a + b, 0);
  let acc = 0; const st = [];
  words.forEach((w, i) => { st.push(c.word_times ? c.word_times[i] : from + (to - from) * acc / tot); acc += wts[i]; });
  st.push(c.word_times ? (c.word_times[words.length] ?? to) : to);
  return { c, words, st, chunk: Math.max(1, c.chunk ?? 1) };
}
function updateCaption(cp, t) {
  const el = $('caption'), S = theme.story;
  if (!cp || t < cp.st[0] || t >= cp.st[cp.words.length]) { el.style.display = 'none'; return; }
  let i = 0; while (i < cp.words.length - 1 && t >= cp.st[i + 1]) i++;
  const c0 = i - (i % cp.chunk), c1 = Math.min(cp.words.length, c0 + cp.chunk);
  el.style.display = 'block'; el.textContent = cp.words.slice(c0, c1).join(' ');
  el.style.top = ((cp.c.y ?? S.caption_y) * 100) + '%'; el.style.fontSize = ((cp.c.size ?? S.caption_size) * U) + 'px';
  el.style.fontFamily = theme.fonts.caption; el.style.transform = 'translateY(-50%)'; el.style.padding = `0 ${60 * U}px`; el.style.boxSizing = 'border-box';
}
function buildFx(b) {
  fxg.textContent = '';
  const f = b.fx || {}, S = theme.story, objs = {};
  if (f.grade) objs.grade = E('rect', { x: 0, y: 0, width: W, height: H, fill: col(f.grade.color), opacity: f.grade.opacity ?? 0.2 }, fxg);
  if (f.mask === 'binoculars') {            // two overlapping lenses; everything outside is black
    const r = f.mask_r ?? 215, cx = W / 2, cy = f.mask_y ?? H * 0.37, dx = f.mask_dx ?? r * 0.55, id = 'm' + (gid++);
    const m = E('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
    E('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff' }, m);
    E('circle', { cx: cx - dx, cy, r, fill: '#000' }, m); E('circle', { cx: cx + dx, cy, r, fill: '#000' }, m);
    objs.mask = E('rect', { x: 0, y: 0, width: W, height: H, fill: '#000', mask: `url(#${id})` }, fxg);
  }
  const vg = f.vignette ?? S.vignette;
  if (vg > 0) objs.vig = E('rect', { x: 0, y: 0, width: W, height: H, fill: rad([[0.45, '#000', 0], [1, '#000', Math.min(1, vg)]], 0.5, 0.5, 0.78) }, fxg);
  objs.flash = E('rect', { x: 0, y: 0, width: W, height: H, fill: '#fff', opacity: 0 }, fxg);
  return objs;
}

// ----------------------------------------------------------------- public API
let noise = null;
window.initStage = async (cfg) => {
  CFG = cfg; U = cfg.width / 720; W = 720; H = cfg.height / U; theme = cfg.theme; P = theme.story.palette;   // scenes are always laid out on a 720-wide canvas
  $('fontcss').textContent = cfg.fontCss;
  const root = $('root'); root.style.width = cfg.width + 'px'; root.style.height = cfg.height + 'px'; root.style.setProperty('--u', U + 'px');
  svg = $('stage'); svg.setAttribute('width', cfg.width); svg.setAttribute('height', cfg.height);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  await Promise.all(cfg.fontLoads.map((f) => document.fonts.load(f).catch(() => null)));
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256), R = rng(77);
  for (let i = 0; i < im.data.length; i += 4) { const v = 90 + R() * 110; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
};
window.loadBeat = async (b) => {
  svg.textContent = ''; defs = E('defs', null, svg); world = E('g', null, svg); fxg = E('g', null, svg); gid = 0;
  const reg = {}, tops = [], list = (b.layers || []).map((o, i) => ({ o, i })).sort((a, c) => (a.o.z ?? 0) - (c.o.z ?? 0) || a.i - c.i);
  list.forEach(({ o }) => {
    const parent = o.parent && reg[o.parent] ? reg[o.parent].children : world;
    const obj = buildObject(o, parent, reg); obj.top = !(o.parent && reg[o.parent]); tops.push(obj);
  });
  const fx = buildFx(b);
  beat = { b, objs: tops, reg, fx, caption: buildCaption(b.caption), camT: makeTracks(b.camera?.keys || []), dur: b.duration };
  const wm = $('wm'), S = theme.story, wmo = b.watermark === false ? null : (b.watermark || {});
  wm.textContent = wmo === null ? '' : theme.handle;
  wm.style.fontFamily = theme.fonts.sub; wm.style.fontSize = (S.wm_size * U) + 'px'; wm.style.color = '#fff';
  wm.style.opacity = wmo && wmo.opacity !== undefined ? wmo.opacity : S.wm_opacity; wm.style.top = (((wmo && wmo.y) ?? S.wm_y) * 100) + '%';
  wm.style.textShadow = `0 ${1.5 * U}px ${5 * U}px rgba(0,0,0,.5)`;
  $('grain').style.display = (b.fx?.grain ?? S.grain) > 0 ? 'block' : 'none';
};
window.renderAt = (t) => {
  const B = beat, b = B.b, C = b.camera || {};
  const z0 = C.zoom ? (Array.isArray(C.zoom) ? C.zoom[0] : C.zoom) : 1, z1 = C.zoom ? (Array.isArray(C.zoom) ? C.zoom[1] : C.zoom) : 1;
  const p0 = C.pan ? C.pan[0] : [0, 0], p1 = C.pan ? C.pan[1] : [0, 0], k = ease(C.ease || 'inout', t / B.dur);
  let z = lerp(z0, z1, k), px = lerp(p0[0], p1[0], k), py = lerp(p0[1], p1[1], k);
  if (B.camT.zoom) z = sampleTrack(B.camT.zoom, t); if (B.camT.px) px = sampleTrack(B.camT.px, t); if (B.camT.py) py = sampleTrack(B.camT.py, t);
  if (C.shake) { px += Math.sin(t * 41) * C.shake * U; py += Math.cos(t * 37) * C.shake * U; }
  cam = { px, py, z };
  const ox = C.origin ? C.origin[0] : W / 2, oy = C.origin ? C.origin[1] : H / 2;
  world.setAttribute('transform', `translate(${ox},${oy}) scale(${z}) translate(${-ox + px},${-oy + py})`);
  B.objs.forEach((obj) => updateObject(obj, t, obj.top));
  // children are updated through the same call (they carry their own tracks)
  const S = theme.story, f = b.fx || {};
  if (B.fx.flash) B.fx.flash.setAttribute('opacity', clamp(numTrack(f.flash, t, 0)));
  updateCaption(B.caption, t);
  const fi = b.fade_in ?? 0, fo = b.fade_out ?? 0;
  $('fade').style.opacity = Math.max(fi > 0 ? 1 - clamp(t / fi) : 0, fo > 0 ? clamp((t - (B.dur - fo)) / fo) : 0);
  const gr = f.grain ?? S.grain; $('grain').style.opacity = gr;
  const fr = Math.floor(t * 30); $('grain').style.backgroundPosition = `${(fr * 53) % 256}px ${(fr * 97) % 256}px`;
};
})();
