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
  else if (o.type === 'text') { e = E('text', { ...a, 'text-anchor': 'middle', 'font-size': o.size ?? 40, 'font-weight': o.weight ?? 700, 'font-family': theme.fonts.caption, fill: col(o.fill ?? '#fff') }, g, o.text ?? ''); }
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
