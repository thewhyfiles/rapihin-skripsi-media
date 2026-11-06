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
