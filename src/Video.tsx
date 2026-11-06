import React, {useEffect, useState} from 'react';
import {AbsoluteFill, useCurrentFrame, Audio, staticFile, delayRender, continueRender} from 'remotion';
import {Job, JobCtx, FPS, WIDTH, HEIGHT, clamp, durationOf, windowsOf, Ctx} from './core';
import {SCENE_TYPES, Statement} from './scenes';
import {Tx} from './ui';
import {ArtLayer, ArtItem, hasArt} from './art';

const useFonts = (job: Job) => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(
      job.brand.fontFiles.map(([fam, w, pkg, v]) =>
        new FontFace(fam, `url(${staticFile(`fonts/${pkg}-${v}.woff2`)})`, {weight: String(w)}).load().then((ff) => document.fonts.add(ff)),
      ),
    )
      .catch((e) => console.error('font error', e))
      .finally(() => continueRender(h));
  }, []);
};

const mkCtx = (job: Job): Ctx => ({job, P: job.brand.palette, F: job.brand.fonts, beats: job.timing, light: job.brand.mode === 'light'});

/* ---------- caption ---------- */
type Word = {w: string; s: number; e: number};
type Chunk = {s: number; e: number; words: Word[]};
const makeChunks = (job: Job): Chunk[] => {
  const BEATS = job.timing;
  const out: Chunk[] = [];
  BEATS.forEach((b, bi) => {
    const nextStart = bi + 1 < BEATS.length ? BEATS[bi + 1].start : Infinity;
    let cur: Word[] = [];
    const flush = () => {
      if (cur.length) { out.push({s: cur[0].s - 0.1, e: 0, words: cur}); cur = []; }
    };
    b.words.forEach(([w, s, e], idx) => {
      cur.push({w, s, e});
      const chars = cur.reduce((a, x) => a + x.w.length + 1, 0);
      const next = b.words[idx + 1];
      if (/[,.?:!]$/.test(w)) flush();
      else if (cur.length >= 3 || chars > 20) {
        if (next && /[,.?:!]$/.test(next[0]) && cur.length < 4 && chars + next[0].length < 34) return;
        flush();
      }
    });
    flush();
    const mine = out.filter((c) => c.e === 0);
    mine.forEach((c, i) => {
      const nx = mine[i + 1];
      const lastE = c.words[c.words.length - 1].e;
      c.e = nx ? nx.s : Math.min(lastE + 0.25, nextStart);
    });
  });
  return out;
};

const Captions: React.FC<{t: number; chunks: Chunk[]}> = ({t, chunks}) => {
  const {P, F} = React.useContext(JobCtx);
  const c = chunks.find((x) => t >= x.s && t < x.e);
  if (!c) return null;
  const text = c.words.map((x) => x.w).join(' ');
  const size = Math.min(76, 960 / (text.length * 0.64));
  const k = clamp((t - c.s) / 0.1);
  const hl = P.capStyle === 'highlight';
  return (
    <div style={{position: 'absolute', left: 0, width: WIDTH, top: 1318, height: 150, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: size * 0.28, transform: `scale(${0.92 + 0.08 * k})`, opacity: k}}>
      {c.words.map((x, i) => {
        const active = t >= x.s - 0.02 && t < x.e + 0.05;
        return (
          <span key={i} style={{
            fontFamily: `"${F.head}", Inter, sans-serif`, fontWeight: 800, fontSize: size, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap',
            color: hl ? P.capText : active ? P.capActive : P.capText,
            background: hl && active ? P.capHl : 'transparent',
            padding: hl ? `0 ${size * 0.14}px` : 0, borderRadius: size * 0.16,
            WebkitTextStroke: hl ? undefined : `${size * 0.14}px ${P.capStroke}`, paintOrder: 'stroke fill',
            textShadow: hl ? `0 0 ${size * 0.2}px ${P.capStroke}` : undefined,
          }}>{x.w}</span>
        );
      })}
    </div>
  );
};

/* ---------- scene wrapper ---------- */
const Scene: React.FC<{b: number; frame: number; spec: any; from: number; to: number}> = ({b, frame, spec, from, to}) => {
  const {P, light: ctxLight} = React.useContext(JobCtx);
  if (frame < from - 3 || frame >= to) return null;
  const t = frame / FPS;
  const lt = (frame - from) / (to - from);
  const op = clamp((frame - (from - 3)) / 5);
  const sc = 1 + 0.05 * clamp(lt);
  const flash = b > 1 ? Math.max(0, 1 - (frame - from + 3) / 4) * 0.18 : 0;
  const Comp = SCENE_TYPES[spec?.type] ?? Statement;
  const s = SCENE_TYPES[spec?.type] ? spec : {...spec, lines: spec?.lines ?? [String(spec?.text ?? '')]};
  const extra = spec?.type !== 'hero' && hasArt(spec);
  const K = 0.7; // konten dirapatkan ke bawah supaya ilustrasi punya ruang di atas
  const lt0 = (frame - from) / FPS;
  const sweep = b > 1 ? clamp(lt0 / 0.45) : 1;
  return (
    <AbsoluteFill style={{opacity: op}}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540 760) scale(${sc}) translate(-540 -760)`}>
          <g transform={extra ? `translate(540 1290) scale(${K}) translate(-540 -1290)` : undefined}>
            <Comp t={t} b={b} s={s} />
          </g>
          {extra && <ArtLayer t={t} b={b} art={spec.art} y={spec.artY} s={spec.artS} />}
        </g>
        {sweep < 1 && (
          <g opacity={(1 - sweep) * (ctxLight ? 0.35 : 0.5)}>
            <polygon points={`${-300 + sweep * 1700},0 ${-60 + sweep * 1700},0 ${-360 + sweep * 1700},1920 ${-600 + sweep * 1700},1920`} fill={ctxLight ? P.accent : P.accent} />
          </g>
        )}
      </svg>
      {flash > 0 && <AbsoluteFill style={{background: ctxLight ? P.accent2 : '#fff', opacity: ctxLight ? flash * 0.5 : flash}} />}
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => {
  const {P, light} = React.useContext(JobCtx);
  const drift = ((frame / FPS) * 14) % 60;
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <defs>
          <radialGradient id="vg" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor={P.vig0} /><stop offset="60%" stopColor={P.vig1} /><stop offset="100%" stopColor={P.vig2} />
          </radialGradient>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform={`translate(0 ${drift})`}>
            <path d="M60 0H0V60" fill="none" stroke={P.grid} strokeOpacity={P.gridOp} strokeWidth="2" />
          </pattern>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#vg)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />
        {Array.from({length: 16}, (_, i) => {
          const sp = 18 + (i * 37) % 26;
          const x0 = (i * 211) % 1080;
          const y = 1700 - ((((i * 173) % 1700) + (frame / FPS) * sp) % 1500);
          const x = x0 + Math.sin(frame / FPS * 0.8 + i) * 26;
          const r = 8 + (i * 7) % 16;
          const col = i % 3 === 0 ? P.accent : i % 3 === 1 ? P.accent2 : P.muted;
          const op = (light ? 0.22 : 0.16) * (y > 200 && y < 1500 ? 1 : 0.3);
          return i % 4 === 0
            ? <g key={i} transform={`translate(${x} ${y}) rotate(${frame * 0.8 + i * 30})`} opacity={op * 1.6}><path d="M-14 0H14M0 -14V14" stroke={col} strokeWidth={5} strokeLinecap="round" /></g>
            : i % 4 === 1
            ? <circle key={i} cx={x} cy={y} r={r + 6} fill="none" stroke={col} strokeWidth={4} opacity={op * 1.5} />
            : <circle key={i} cx={x} cy={y} r={r} fill={col} opacity={op} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

const Chrome: React.FC<{frame: number; D: number}> = ({frame, D}) => {
  const {P, F, job} = React.useContext(JobCtx);
  const rule = P.text;
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <rect x="0" y="0" width={(WIDTH * frame) / D} height="8" fill={job.brand.mode === 'light' ? P.accent2 : P.accent} />
        <Tx x={60} y={118} size={26} fill={P.muted} font={F.mono} weight={700} ls={5} anchor="start">{job.brand.name}</Tx>
        {job.meta.fileNo && <Tx x={1020} y={118} size={26} fill={P.muted} font={F.mono} weight={500} ls={3} anchor="end">{job.meta.fileNo}</Tx>}
        <line x1="60" x2="1020" y1="146" y2="146" stroke={rule} strokeOpacity="0.18" strokeWidth="2" />
        <Tx x={60} y={1530} size={26} fill={P.muted} font={F.mono} weight={500} ls={2} anchor="start" op={0.85}>{job.brand.handle}</Tx>
        {job.meta.source && <Tx x={1020} y={1530} size={22} fill={P.faint} font={F.mono} weight={500} ls={1} anchor="end" op={0.9}>{job.meta.source}</Tx>}
      </svg>
    </AbsoluteFill>
  );
};

export const Video: React.FC<{job: Job}> = ({job}) => {
  useFonts(job);
  const frame = useCurrentFrame();
  const ctx = React.useMemo(() => mkCtx(job), [job]);
  const chunks = React.useMemo(() => makeChunks(job), [job]);
  const wins = React.useMemo(() => windowsOf(job.timing), [job]);
  const D = durationOf(job.timing);
  return (
    <JobCtx.Provider value={ctx}>
      <AbsoluteFill style={{backgroundColor: ctx.P.bg}}>
        <Background frame={frame} />
        {job.scenes.map((spec, i) => (i < wins.length ? <Scene key={i} b={i + 1} frame={frame} spec={spec} from={wins[i].from} to={wins[i].to} /> : null))}
        <Chrome frame={frame} D={D} />
        <Captions t={frame / FPS} chunks={chunks} />
        {job.meta.withAudio ? <Audio src={staticFile('narasi.wav')} /> : null}
      </AbsoluteFill>
    </JobCtx.Provider>
  );
};

/* ---------- sampul (still) ---------- */
export const Cover: React.FC<{job: Job}> = ({job}) => {
  useFonts(job);
  const ctx = React.useMemo(() => mkCtx(job), [job]);
  const {P, F, light} = ctx;
  const cv: any = job.meta.cover ?? {lines: [job.meta.title ?? '']};
  const lines: string[] = cv.lines.map((l: string) => l.toUpperCase());
  const size = Math.min(128, ...lines.map((l) => 930 / Math.max(1, l.length * 0.66)));
  const lh = size * 1.12;
  const yEnd = 1500; // baris terakhir berhenti di sini (aman untuk crop grid 3:4 -> y 240..1680)
  const y0 = yEnd - (lines.length - 1) * lh;
  const arts: any[] = (Array.isArray(cv.art) ? cv.art : [cv.art ?? 'question']).slice(0, 2);
  const kick = (cv.kicker ?? job.brand.name).toUpperCase();
  const kw = kick.length * 21 + 70;
  const AX = 540, AY = 760;
  const rays = Array.from({length: 18}, (_, i) => {
    const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 0.5) / 18) * Math.PI * 2, R = 1700;
    return <polygon key={i} points={`${AX},${AY} ${AX + Math.cos(a0) * R},${AY + Math.sin(a0) * R} ${AX + Math.cos(a1) * R},${AY + Math.sin(a1) * R}`} fill={P.accent} opacity={light ? 0.3 : 0.11} />;
  });
  return (
    <JobCtx.Provider value={ctx}>
      <AbsoluteFill style={{backgroundColor: P.bg}}>
        <Background frame={20} />
        <AbsoluteFill>
          <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <defs>
              <radialGradient id="cvg" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor={P.accent} stopOpacity={light ? 0.4 : 0.22} /><stop offset="100%" stopColor={P.accent} stopOpacity="0" />
              </radialGradient>
            </defs>
            {rays}
            <rect width={WIDTH} height={HEIGHT} fill="url(#cvg)" />
            <circle cx={AX} cy={AY} r={385} fill={light ? '#ffffff' : P.bg2} stroke={P.accent} strokeWidth={14} />
            <circle cx={AX} cy={AY} r={425} fill="none" stroke={P.accent} strokeWidth={5} strokeDasharray="6 22" strokeLinecap="round" opacity={0.8} />
            {arts.map((a, i) => {
              const o: any = typeof a === 'string' ? {name: a} : a;
              const two = arts.length > 1;
              return <ArtItem key={i} i={i} name={o.name} t={1.2} t0={0} x={o.x ?? (two ? (i ? 735 : 345) : AX)} y={o.y ?? AY} s={o.s ?? (two ? 1.05 : 1.7)} halo={false} v={o.v} rot={o.rot} />;
            })}
            <g transform={`translate(${540 - kw / 2} 292)`}>
              <rect width={kw} height="68" rx="34" fill={P.accent} />
              <Tx x={kw / 2} y={46} size={30} fill={P.ink} font={F.mono} weight={700} ls={5}>{kick}</Tx>
            </g>
            {cv.badge && (
              <g transform="translate(850 455) rotate(9)">
                <rect x="-130" y="-52" width="260" height="104" rx="22" fill={P.alert} stroke={P.ink} strokeWidth={7} />
                <Tx x={0} y={20} size={Math.min(54, 230 / Math.max(1, cv.badge.length * 0.66))} fill="#ffffff">{String(cv.badge).toUpperCase()}</Tx>
              </g>
            )}
            {lines.map((l, i) => {
              const hl = i === lines.length - 1;
              const w = l.length * size * 0.64 + 60;
              const y = y0 + i * lh;
              return (
                <g key={i}>
                  {hl && <rect x={540 - w / 2} y={y - size * 0.86} width={w} height={size * 1.08} rx={16} fill={P.accent} stroke={P.ink} strokeWidth={6} />}
                  <Tx x={540} y={y} size={size} fill={hl ? P.ink : P.text} stroke={hl ? undefined : light ? P.bg : P.ink}>{l}</Tx>
                </g>
              );
            })}
            {cv.sub && <Tx x={540} y={yEnd + 78} size={32} fill={P.muted} font={F.mono} weight={700} ls={3}>{cv.sub}</Tx>}
            <Tx x={540} y={yEnd + 140} size={30} fill={P.muted} font={F.mono} weight={700} ls={4}>{job.brand.handle}</Tx>
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    </JobCtx.Provider>
  );
};
