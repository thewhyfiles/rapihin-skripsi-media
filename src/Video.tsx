import React, {useEffect, useState} from 'react';
import {AbsoluteFill, useCurrentFrame, Audio, staticFile, delayRender, continueRender} from 'remotion';
import {Job, JobCtx, FPS, WIDTH, HEIGHT, clamp, durationOf, windowsOf, Ctx} from './core';
import {SCENE_TYPES, Statement} from './scenes';
import {Tx} from './ui';

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
  return (
    <AbsoluteFill style={{opacity: op}}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{position: 'absolute', inset: 0}}>
        <g transform={`translate(540 760) scale(${sc}) translate(-540 -760)`}>
          <Comp t={t} b={b} s={s} />
        </g>
      </svg>
      {flash > 0 && <AbsoluteFill style={{background: ctxLight ? P.accent2 : '#fff', opacity: ctxLight ? flash * 0.5 : flash}} />}
    </AbsoluteFill>
  );
};

const Background: React.FC<{frame: number}> = ({frame}) => {
  const {P} = React.useContext(JobCtx);
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
  const {P, F} = ctx;
  const cv = job.meta.cover ?? {lines: [job.meta.title ?? '']};
  const lines = cv.lines;
  const size = Math.min(150, ...lines.map((l) => (880 / Math.max(1, l.length * 0.64))));
  const y0 = 860 - ((lines.length - 1) * size * 1.15) / 2;
  const light = ctx.light;
  return (
    <JobCtx.Provider value={ctx}>
      <AbsoluteFill style={{backgroundColor: P.bg}}>
        <Background frame={0} />
        <AbsoluteFill>
          <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <Tx x={540} y={y0 - size - 60} size={34} fill={P.muted} font={F.mono} weight={700} ls={8}>{(cv.kicker ?? job.brand.name).toUpperCase()}</Tx>
            <rect x={500} y={y0 - size - 30} width="80" height="6" fill={P.accent} />
            {lines.map((l, i) => {
              const hl = i === lines.length - 1;
              const w = l.length * size * 0.62 + 50;
              return (
                <g key={i}>
                  {hl && light && <rect x={540 - w / 2} y={y0 + i * size * 1.15 - size * 0.86} width={w} height={size * 1.1} rx={14} fill={P.accent} />}
                  <Tx x={540} y={y0 + i * size * 1.15} size={size} fill={hl ? (light ? P.ink : P.accent) : P.text}>{l.toUpperCase()}</Tx>
                </g>
              );
            })}
            {cv.sub && <Tx x={540} y={y0 + lines.length * size * 1.15 + 40} size={34} fill={P.muted} font={F.mono} weight={700} ls={3}>{cv.sub}</Tx>}
            <Tx x={540} y={1180} size={30} fill={P.muted} font={F.mono} weight={700} ls={4}>{job.brand.handle}</Tx>
          </svg>
        </AbsoluteFill>
      </AbsoluteFill>
    </JobCtx.Provider>
  );
};
