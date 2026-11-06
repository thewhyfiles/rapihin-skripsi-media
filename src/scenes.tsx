import React from 'react';
import {useJob, CX, clamp, lin, ramp, pop, fmt, triggers, fit} from './core';
import {Tx, Card, Person, Stamp, Label} from './ui';

export type SceneProps = {t: number; b: number; s: any};

const useTone = () => {
  const {P, light} = useJob();
  const num = light ? P.accent2 : P.accent; // warna angka/penekanan
  const toneColor = (tone?: string) =>
    tone === 'alert' ? P.alert : tone === 'good' ? P.good : tone === 'muted' ? P.muted : num;
  return {num, toneColor};
};

/** teks sorot: gelap = teks berwarna aksen; terang = stabilo (kotak kuning) di belakang teks */
const Em: React.FC<{x: number; y: number; size: number; text: string; on: boolean; op?: number; dy?: number; weight?: number}> = ({x, y, size, text, on, op = 1, dy = 0, weight = 800}) => {
  const {P, light} = useJob();
  const w = text.length * size * 0.62 + 40;
  return (
    <g opacity={op} transform={`translate(0 ${dy})`}>
      {on && light && <rect x={x - w / 2} y={y - size * 0.86} width={w} height={size * 1.12} rx={10} fill={P.accent} />}
      <Tx x={x} y={y} size={size} weight={weight} fill={on ? (light ? P.ink : P.accent) : P.text}>{text}</Tx>
    </g>
  );
};

const up = (s: string, on = true) => (on ? s.toUpperCase() : s);

/* ---------- statement: baris-baris teks besar (opsional dalam kartu dokumen) ---------- */
export const Statement: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, light} = useJob();
  const lines: string[] = (s.lines ?? [s.text ?? '']).map((l: string) => up(l, s.upper !== false));
  const tr = triggers(beats, b, lines.length, s.at);
  const hl: number[] = s.hl ?? [];
  const card = s.style === 'card';
  const maxW = card ? 800 : 940;
  const size = Math.min(s.size ?? 112, ...lines.map((l) => fit(l, maxW, 120, 0.68)));
  const lh = size * 1.22;
  const y0 = 790 - ((lines.length - 1) * lh) / 2;
  const intro = ramp(t, 0.05, 0.4);
  const body = lines.map((l, i) => {
    const p = ramp(t, tr[i], tr[i] + 0.35);
    const y = y0 + i * lh + (card ? 22 : 0);
    return <Em key={i} x={CX} y={y} size={size} text={l} on={hl.includes(i)} op={p} dy={(1 - p) * 34} />;
  });
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      {card ? (
        <g opacity={intro} transform={`translate(0 ${(1 - intro) * 40})`}>
          <Card x={CX} y={790} w={900} h={lines.length * lh + 190}>
            <rect x={-450} y={-(lines.length * lh + 190) / 2} width="900" height="48" rx="14" fill={P.ink} />
            <Tx x={-420} y={-(lines.length * lh + 190) / 2 + 33} size={22} fill={P.paper} font={F.mono} anchor="start" ls={5} weight={700}>{up(s.tab ?? 'BERKAS')}</Tx>
          </Card>
        </g>
      ) : null}
      {card ? <g>{lines.map((l, i) => {
        const p = ramp(t, tr[i], tr[i] + 0.35);
        const y = y0 + i * lh + 22;
        return (
          <g key={i} opacity={p} transform={`translate(0 ${(1 - p) * 34})`}>
            {hl.includes(i) && <rect x={CX - (l.length * size * 0.62 + 40) / 2} y={y - size * 0.86} width={l.length * size * 0.62 + 40} height={size * 1.12} rx={10} fill={light ? P.accent : 'none'} />}
            <Tx x={CX} y={y} size={size} fill={hl.includes(i) ? (light ? P.ink : P.alert) : P.ink}>{l}</Tx>
          </g>
        );
      })}</g> : body}
      {s.sub && <Tx x={CX} y={1215} size={30} fill={P.muted} font={F.mono} weight={700} ls={4} op={ramp(t, tr[tr.length - 1] + 0.2, tr[tr.length - 1] + 0.6)}>{up(s.sub)}</Tx>}
    </g>
  );
};

/* ---------- bignumber: angka raksasa menghitung naik ---------- */
export const BigNumber: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats} = useJob();
  const {toneColor} = useTone();
  const tr = triggers(beats, b, 3, s.at);
  const raw = String(s.value);
  const numeric = parseFloat(raw.replace(',', '.'));
  const dec = (raw.split(/[,.]/)[1] || '').replace(/\D/g, '').length;
  const k = ramp(t, tr[0], tr[0] + 0.9);
  const shown = isNaN(numeric) ? raw : fmt(numeric * k, dec);
  const full = `${s.prefix ?? ''}${raw}${s.suffix ?? ''}`;
  const size = fit(full, 940, 360, 0.6);
  const pp = pop(t, tr[0], 0.4);
  const caps: string[] = s.caption ?? [];
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <g opacity={clamp(pp)} transform={`translate(${CX} 780) scale(${0.85 + 0.15 * clamp(pp)}) translate(${-CX} -780)`}>
        <Tx x={CX} y={780 + size * 0.34} size={size} fill={toneColor(s.tone)} weight={800}>{`${s.prefix ?? ''}${shown}${s.suffix ?? ''}`}</Tx>
      </g>
      {s.unit && <Tx x={CX} y={780 + size * 0.34 + 110} size={40} fill={P.muted} font={F.mono} weight={700} ls={5} op={ramp(t, tr[1], tr[1] + 0.3)}>{up(s.unit)}</Tx>}
      {caps.map((c, i) => (
        <Tx key={i} x={CX} y={780 + size * 0.34 + (s.unit ? 205 : 110) + i * 72} size={fit(c, 920, 58)} fill={P.text} op={ramp(t, tr[2] + i * 0.2, tr[2] + i * 0.2 + 0.35)}>{c}</Tx>
      ))}
    </g>
  );
};

/* ---------- bars: perbandingan batang ---------- */
export const Bars: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, light} = useJob();
  const {toneColor} = useTone();
  const bars: {label: string; value: number; tone?: string; hl?: boolean}[] = s.bars;
  const n = bars.length;
  const tr = triggers(beats, b, n + 1, s.at, 0, beats[b - 1].words.length - 2);
  const max = s.max ?? Math.max(...bars.map((x) => x.value)) * 1.12;
  const base = 1130, H = 560;
  const bw = Math.min(260, 820 / n - 40);
  const gap = (900 - bw * n) / Math.max(1, n - 1 || 1);
  const dec = s.decimals ?? 1;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <line x1="80" x2="1000" y1={base} y2={base} stroke={P.muted} strokeWidth="3" opacity="0.8" />
      {bars.map((x, i) => {
        const cx = n === 1 ? CX : 90 + bw / 2 + i * (bw + gap);
        const k = ramp(t, tr[i], tr[i] + 0.8);
        const h = (x.value / max) * H * k;
        const col = x.tone ? toneColor(x.tone) : x.hl ? toneColor('') : light ? P.faint : P.muted;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={base - h} width={bw} height={h} rx={12} fill={col} />
            <Tx x={cx} y={base - h - 24} size={fit(fmt(x.value, dec), bw + 40, 76, 0.62)} fill={P.text} op={clamp(k * 2)}>{fmt(x.value * k, dec)}</Tx>
            <Tx x={cx} y={base + 54} size={fit(x.label, bw + gap * 0.8, 34, 0.62)} fill={P.text} font={F.head} weight={700} op={ramp(t, tr[i], tr[i] + 0.3)}>{x.label}</Tx>
          </g>
        );
      })}
      {s.unit && <Tx x={CX} y={base + 120} size={28} fill={P.muted} font={F.mono} weight={700} ls={3} op={ramp(t, 0.2, 0.5)}>{up(s.unit)}</Tx>}
      {s.delta && (
        <g opacity={clamp(pop(t, tr[n], 0.4))} transform={`translate(${CX} 480) scale(${0.7 + 0.3 * clamp(pop(t, tr[n], 0.4))}) translate(${-CX} -480)`}>
          <rect x={CX - 170} y={430} width="340" height="100" rx="24" fill={toneColor(s.delta.tone ?? 'alert')} />
          <Tx x={CX} y={503} size={64} fill="#fff">{s.delta.text}</Tx>
        </g>
      )}
    </g>
  );
};

/* ---------- versus: dua kolom ---------- */
export const Versus: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, light} = useJob();
  const {toneColor} = useTone();
  const cols = [s.left, s.right];
  const total = cols.reduce((a, c) => a + 1 + c.items.length, 0);
  const tr = triggers(beats, b, total, s.at);
  const maxItems = Math.max(...cols.map((c) => c.items.length));
  const H = 150 + maxItems * 150;
  const top = 800 - H / 2;
  let k = 0;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      {cols.map((c, ci) => {
        const x = ci === 0 ? 290 : 790;
        const tone = toneColor(c.tone ?? (ci === 0 ? 'muted' : ''));
        const t0 = tr[k++];
        const p = ramp(t, t0, t0 + 0.4);
        return (
          <g key={ci}>
            <g opacity={p} transform={`translate(0 ${(1 - p) * 40})`}>
              <Card x={x} y={800} w={470} h={H} fill={P.paper}>
                <rect x={-235} y={-H / 2} width="470" height="90" rx="14" fill={tone} />
                <Tx x={0} y={-H / 2 + 60} size={fit(up(c.title), 420, 44, 0.68)} fill={c.tone === 'muted' || (!c.tone && ci === 0) ? P.ink : light && !c.tone ? P.ink : '#fff'}>{up(c.title)}</Tx>
              </Card>
            </g>
            {c.items.map((it: string, ii: number) => {
              const ti = tr[k++];
              const q = ramp(t, ti, ti + 0.35);
              const lines = it.split('\n');
              const y = top + 190 + ii * 150;
              return (
                <g key={ii} opacity={q} transform={`translate(0 ${(1 - q) * 24})`}>
                  {lines.map((ln, li) => (
                    <Tx key={li} x={x} y={y + li * 46} size={fit(ln, 420, 38, 0.58)} fill={P.ink} weight={700}>{ln}</Tx>
                  ))}
                </g>
              );
            })}
          </g>
        );
      })}
      <g opacity={ramp(t, tr[0] + 0.2, tr[0] + 0.5)}>
        <circle cx={CX} cy={800} r={46} fill={P.ink} />
        <Tx x={CX} y={816} size={40} fill={P.paper} font={F.mono} weight={700}>VS</Tx>
      </g>
    </g>
  );
};

/* ---------- list: daftar bernomor ---------- */
export const List: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, light} = useJob();
  const {num} = useTone();
  const items: (string | {t: string; sub?: string})[] = s.items;
  const tr = triggers(beats, b, items.length, s.at);
  const step = Math.min(190, 760 / items.length);
  const y0 = 760 - ((items.length - 1) * step) / 2 - 20;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      {items.map((it, i) => {
        const o = typeof it === 'string' ? {t: it} : it;
        const p = ramp(t, tr[i], tr[i] + 0.4);
        const y = y0 + i * step;
        return (
          <g key={i} opacity={p} transform={`translate(${(1 - p) * -120} 0)`}>
            <circle cx={140} cy={y + 20} r={52} fill={num} />
            <Tx x={140} y={y + 44} size={64} fill={light ? '#fff' : P.ink}>{String(i + 1)}</Tx>
            <Tx x={230} y={y + (o.sub ? 8 : 38)} size={fit(o.t, 760, 54, 0.6)} anchor="start" fill={P.text}>{o.t}</Tx>
            {o.sub && <Tx x={230} y={y + 62} size={fit(o.sub, 760, 32, 0.56)} anchor="start" fill={P.muted} weight={700} font={F.body}>{o.sub}</Tx>}
          </g>
        );
      })}
    </g>
  );
};

/* ---------- doc: kartu dokumen berisi baris teks + cap ---------- */
export const Doc: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, light} = useJob();
  const lines: string[] = s.lines;
  const mark: number[] = s.mark ?? [];
  const tr = triggers(beats, b, lines.length + 1, s.at);
  const h = 260 + lines.length * 96 + (s.stamp ? 70 : 0);
  const intro = ramp(t, 0.05, 0.4);
  const top = 800 - h / 2;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <g opacity={intro} transform={`translate(0 ${(1 - intro) * 40})`}>
        <Card x={CX} y={800} w={900} h={h}>
          <rect x={-450} y={-h / 2} width="900" height="56" rx="14" fill={P.ink} />
          <Tx x={-420} y={-h / 2 + 38} size={24} fill={P.paper} font={F.mono} anchor="start" ls={5} weight={700}>{up(s.tab ?? 'DOKUMEN')}</Tx>
          {s.date && <Tx x={420} y={-h / 2 + 38} size={24} fill={P.paper} font={F.mono} anchor="end" ls={3} weight={500}>{s.date}</Tx>}
        </Card>
      </g>
      {lines.map((l, i) => {
        const p = ramp(t, tr[i], tr[i] + 0.4);
        const y = top + 160 + i * 96;
        const m = mark.includes(i);
        const sz = fit(l, 780, 54, 0.58);
        return (
          <g key={i} opacity={p}>
            {m && <rect x={CX - 400} y={y - sz * 0.8} width={800 * p} height={sz * 1.1} fill={P.accent} opacity={light ? 1 : 0.9} />}
            <Tx x={CX - 380} y={y} size={sz} anchor="start" fill={P.ink} font={s.mono ? F.mono : F.serif} weight={s.mono ? 500 : 400}>{l}</Tx>
          </g>
        );
      })}
      {s.stamp && <Stamp x={CX + 450 - Math.min(800, up(s.stamp.text).length * 26 + 80) / 2 - 36} y={800 + h / 2 - 70} w={Math.min(800, up(s.stamp.text).length * 26 + 80)} h={96} text={up(s.stamp.text)} color={s.stamp.tone === 'good' ? P.good : P.alert} size={40}
        op={clamp(pop(t, tr[lines.length], 0.3))} scale={2.2 - 1.2 * clamp(pop(t, tr[lines.length], 0.3))} />}
    </g>
  );
};

/* ---------- quote ---------- */
export const Quote: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats} = useJob();
  const {num} = useTone();
  const lines: string[] = s.lines;
  const tr = triggers(beats, b, lines.length + 1, s.at);
  const sz = Math.min(76, ...lines.map((l) => fit(l, 860, 76, 0.5)));
  const y0 = 760 - ((lines.length - 1) * sz * 1.25) / 2;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <Tx x={CX} y={600} size={300} fill={num} font={F.serif} weight={400} op={0.35 * ramp(t, 0.05, 0.4)}>“</Tx>
      {lines.map((l, i) => {
        const p = ramp(t, tr[i], tr[i] + 0.4);
        return <Tx key={i} x={CX} y={y0 + i * sz * 1.25} size={sz} fill={P.text} font={F.serif} weight={400} op={p}>{l}</Tx>;
      })}
      {s.by && <Tx x={CX} y={y0 + lines.length * sz * 1.25 + 40} size={34} fill={P.muted} font={F.mono} weight={700} ls={3} op={ramp(t, tr[lines.length], tr[lines.length] + 0.4)}>{`— ${s.by}`}</Tx>}
    </g>
  );
};

/* ---------- timeline vertikal ---------- */
export const Timeline: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats} = useJob();
  const {num} = useTone();
  const items: {k: string; v: string}[] = s.items;
  const tr = triggers(beats, b, items.length, s.at);
  const step = Math.min(230, 700 / items.length);
  const y0 = 480;
  const prog = items.length ? ramp(t, tr[0], tr[items.length - 1] + 0.5) : 0;
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <line x1={330} x2={330} y1={y0} y2={y0 + (items.length - 1) * step * prog} stroke={P.muted} strokeWidth="5" />
      {items.map((it, i) => {
        const p = pop(t, tr[i], 0.4);
        const y = y0 + i * step;
        return (
          <g key={i} opacity={clamp(p)}>
            <circle cx={330} cy={y} r={20 * clamp(p)} fill={num} />
            <Tx x={290} y={y + 22} size={fit(it.k, 220, 64, 0.62)} anchor="end" fill={num} font={F.mono} weight={700}>{it.k}</Tx>
            <Tx x={375} y={y + 18} size={fit(it.v, 620, 46, 0.58)} anchor="start" fill={P.text}>{it.v}</Tx>
          </g>
        );
      })}
    </g>
  );
};

/* ---------- crowd: N orang, M ditandai ---------- */
export const Crowd: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats} = useJob();
  const {num} = useTone();
  const N = Math.min(s.total ?? 30, 60), M = Math.min(s.mark ?? 0, N);
  const tr = triggers(beats, b, 3, s.at);
  const cols = N <= 24 ? 6 : N <= 40 ? 8 : 10;
  const rows = Math.ceil(N / cols);
  const sp = Math.min(104, 900 / cols);
  const t0 = tr[0], t1 = tr[1] + 0.3;
  const people = Array.from({length: N}, (_, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const inRow = Math.min(cols, N - r * cols);
    const at = t0 + (i / N) * (t1 - t0);
    const p = pop(t, at, 0.3);
    const marked = i < M && t > t1 + 0.1;
    const px = CX + (c - (inRow - 1) / 2) * sp, py = 620 + r * sp * 1.05;
    return (
      <g key={i}>
        <Person x={px} y={py} s={0.85} fill={P.muted} op={0.16 * (1 - clamp(p))} />
        <Person x={px} y={py} s={0.85 * clamp(p)} fill={marked ? P.alert : P.text} op={clamp(p)} />
      </g>
    );
  });
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      {people}
      <Tx x={CX} y={620 + rows * sp * 1.05 + 90} size={fit(String(s.caption ?? ''), 900, 80)} fill={num} op={ramp(t, tr[2], tr[2] + 0.3)}>{up(s.caption ?? '')}</Tx>
      {s.sub && <Tx x={CX} y={620 + rows * sp * 1.05 + 150} size={32} fill={P.muted} font={F.mono} weight={700} ls={4} op={ramp(t, tr[2] + 0.2, tr[2] + 0.5)}>{up(s.sub)}</Tx>}
    </g>
  );
};

/* ---------- bigword: satu kata/simbol raksasa ---------- */
export const BigWord: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats} = useJob();
  const {toneColor} = useTone();
  const tr = triggers(beats, b, 2, s.at);
  const word = String(s.word);
  const size = fit(word, 900, 600, 0.78);
  const p = pop(t, tr[0], 0.5);
  const caps: string[] = s.caption ?? [];
  return (
    <g>
      {s.label && <Label t={t} at={0.05}>{up(s.label)}</Label>}
      <g opacity={clamp(p)} transform={`translate(${CX} 760) scale(${0.6 + 0.4 * clamp(p)}) translate(${-CX} -760)`}>
        <Tx x={CX} y={760 + size * 0.34} size={size} fill={toneColor(s.tone)}>{word}</Tx>
      </g>
      {caps.map((c, i) => (
        <Tx key={i} x={CX} y={1090 + i * 70} size={fit(c, 920, 54)} fill={P.text} op={ramp(t, tr[1] + i * 0.2, tr[1] + i * 0.2 + 0.35)}>{c}</Tx>
      ))}
    </g>
  );
};

/* ---------- closer: penutup merek ---------- */
export const Closer: React.FC<SceneProps> = ({t, b, s}) => {
  const {P, F, beats, job} = useJob();
  const lines: string[] = (s.lines ?? []).map((l: string) => up(l, s.upper !== false));
  const tr = triggers(beats, b, lines.length + 1, s.at);
  const size = Math.min(100, ...lines.map((l) => fit(l, 900, 100)));
  const y0 = 650 - ((lines.length - 1) * size * 1.2) / 2;
  const sp = clamp(pop(t, tr[lines.length], 0.35));
  return (
    <g>
      {lines.map((l, i) => {
        const p = ramp(t, tr[i], tr[i] + 0.4);
        return <Em key={i} x={CX} y={y0 + i * size * 1.2} size={size} text={l} on={(s.hl ?? []).includes(i)} op={p} dy={(1 - p) * 30} />;
      })}
      {s.stamp && <Stamp x={CX} y={980} w={560} h={130} text={up(s.stamp)} color={P.alert} size={64} op={sp} scale={2.2 - 1.2 * sp} />}
      <Tx x={CX} y={1200} size={44} fill={P.text} font={F.mono} weight={700} ls={3} op={ramp(t, tr[lines.length] + 0.3, tr[lines.length] + 0.7)}>{job.brand.handle}</Tx>
    </g>
  );
};

export const SCENE_TYPES: Record<string, React.FC<SceneProps>> = {
  statement: Statement, bignumber: BigNumber, bars: Bars, versus: Versus, list: List,
  doc: Doc, quote: Quote, timeline: Timeline, crowd: Crowd, bigword: BigWord, closer: Closer,
};
