import React from 'react';
import {useJob, clamp, pop, wAt} from './core';
import {Tx} from './ui';

/* Pustaka ilustrasi 2D flat (SVG buatan kode). Semua digambar di kotak 400x400 berpusat di (0,0).
   Warna mengikuti palet brand. `ti` = detik sejak ilustrasi muncul (untuk gerak idle), `v` = varian. */
export type K = {c1: string; c2: string; c3: string; c4: string; paper: string; ink: string; bg: string; text: string; F: any; light: boolean};
type Art = (k: K, ti: number, v?: string) => React.ReactNode;
const SW = 11;
const ln = (k: K) => ({stroke: k.ink, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const});
const blink = (ti: number) => {
  const m = ti % 3.4;
  return m > 3.2 ? 1 - Math.sin(((m - 3.2) / 0.2) * Math.PI) * 0.9 : 1;
};

export const ART: Record<string, Art> = {
  brain: (k, ti) => {
    const half = (
      <g>
        <path d="M-8 -135 C-60 -165 -135 -140 -140 -80 C-190 -70 -200 10 -155 35 C-180 90 -130 140 -80 120 C-60 155 -15 150 -8 120 Z" fill={k.c3} {...ln(k)} />
        <path d="M-100 -95 C-65 -85 -65 -50 -100 -40 M-60 5 C-105 15 -112 58 -68 66 M-42 -112 C-30 -82 -52 -62 -32 -30" fill="none" {...ln(k)} strokeWidth={8} />
      </g>
    );
    const pulse = 0.5 + 0.5 * Math.sin(ti * 4);
    return (
      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={Math.cos((i - 2) * 0.55 - Math.PI / 2) * 170} y1={Math.sin((i - 2) * 0.55 - Math.PI / 2) * 170} x2={Math.cos((i - 2) * 0.55 - Math.PI / 2) * (195 + pulse * 20)} y2={Math.sin((i - 2) * 0.55 - Math.PI / 2) * (195 + pulse * 20)} stroke={k.c1} strokeWidth={12} strokeLinecap="round" />
        ))}
        {half}
        <g transform="scale(-1 1)">{half}</g>
        <path d="M-70 160 H70" stroke={k.ink} strokeWidth={SW} strokeLinecap="round" />
      </g>
    );
  },
  bulb: (k, ti) => {
    const on = 0.6 + 0.4 * Math.sin(ti * 5);
    return (
      <g>
        {Array.from({length: 8}, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + ti * 0.4;
          return <line key={i} x1={Math.cos(a) * 150} y1={-30 + Math.sin(a) * 150} x2={Math.cos(a) * (185 + on * 12)} y2={-30 + Math.sin(a) * (185 + on * 12)} stroke={k.c1} strokeWidth={12} strokeLinecap="round" />;
        })}
        <path d="M0 -150 C-95 -150 -125 -60 -80 -5 C-60 20 -55 45 -55 70 H55 C55 45 60 20 80 -5 C125 -60 95 -150 0 -150 Z" fill={k.c1} {...ln(k)} />
        <rect x="-58" y="70" width="116" height="26" rx="8" fill={k.paper} {...ln(k)} />
        <rect x="-48" y="100" width="96" height="26" rx="8" fill={k.paper} {...ln(k)} />
        <path d="M-25 130 H25" stroke={k.ink} strokeWidth={SW} strokeLinecap="round" />
        <path d="M-30 -20 L0 35 L30 -20" fill="none" stroke={k.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  },
  clock: (k, ti) => (
    <g>
      <circle cx="-105" cy="-125" r="42" fill={k.c3} {...ln(k)} />
      <circle cx="105" cy="-125" r="42" fill={k.c3} {...ln(k)} />
      <circle cx="0" cy="0" r="150" fill={k.paper} {...ln(k)} />
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={Math.sin(a) * 124} y1={-Math.cos(a) * 124} x2={Math.sin(a) * 138} y2={-Math.cos(a) * 138} stroke={k.ink} strokeWidth={i % 3 ? 6 : 11} strokeLinecap="round" />;
      })}
      <line x1="0" y1="0" x2={Math.sin(ti * 0.6) * 62} y2={-Math.cos(ti * 0.6) * 62} stroke={k.ink} strokeWidth={16} strokeLinecap="round" />
      <line x1="0" y1="0" x2={Math.sin(ti * 5) * 105} y2={-Math.cos(ti * 5) * 105} stroke={k.c3} strokeWidth={10} strokeLinecap="round" />
      <circle cx="0" cy="0" r="14" fill={k.ink} />
    </g>
  ),
  magnifier: (k, ti) => (
    <g transform={`rotate(${Math.sin(ti * 2) * 6})`}>
      <line x1="55" y1="55" x2="165" y2="165" stroke={k.ink} strokeWidth={42} strokeLinecap="round" />
      <line x1="55" y1="55" x2="165" y2="165" stroke={k.c1} strokeWidth={22} strokeLinecap="round" />
      <circle cx="-30" cy="-30" r="115" fill={k.paper} fillOpacity={0.9} {...ln(k)} strokeWidth={18} />
      <path d="M-100 -50 A80 80 0 0 1 -40 -108" fill="none" stroke={k.c2} strokeWidth={14} strokeLinecap="round" opacity={0.8} />
      <text x="-30" y="5" fontSize="130" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.c3}>?</text>
    </g>
  ),
  doc: (k, ti, v) => (
    <g>
      <path d="M-110 -160 H50 L110 -100 V160 H-110 Z" fill={k.paper} {...ln(k)} />
      <path d="M50 -160 V-100 H110" fill={k.c1} {...ln(k)} />
      {[-60, -20, 20, 60, 100].map((y, i) => (
        <line key={i} x1="-72" y1={y} x2={i % 2 ? 40 : 72} y2={y} stroke={i === 1 ? k.c3 : k.c2} strokeWidth={14} strokeLinecap="round" opacity={0.9} />
      ))}
      {v && (
        <g transform={`translate(95 120) scale(${1 + Math.sin(ti * 4) * 0.05})`}>
          <circle r="52" fill={v === 'cross' ? k.c3 : k.c4} {...ln(k)} />
          <path d={v === 'cross' ? 'M-20 -20 L20 20 M20 -20 L-20 20' : 'M-24 2 L-8 20 L26 -18'} fill="none" stroke={k.paper} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </g>
  ),
  book: (k) => (
    <g>
      <path d="M-175 -105 L0 -75 L175 -105 V135 L0 105 L-175 135 Z" fill={k.c2} {...ln(k)} />
      <path d="M0 -85 L-160 -115 V115 L0 85 Z" fill={k.paper} {...ln(k)} />
      <path d="M0 -85 L160 -115 V115 L0 85 Z" fill={k.paper} {...ln(k)} />
      {[-55, -15, 25, 65].map((y, i) => (
        <g key={i}>
          <line x1="-130" y1={y - 8 + i * 1.5} x2="-30" y2={y + 8 + i * 1.5} stroke={k.c2} strokeWidth={10} strokeLinecap="round" />
          <line x1="30" y1={y + 8 + i * 1.5} x2="130" y2={y - 8 + i * 1.5} stroke={k.c2} strokeWidth={10} strokeLinecap="round" />
        </g>
      ))}
      <path d="M-20 -80 V-25 L0 -40 L20 -25 V-80" fill={k.c3} {...ln(k)} strokeWidth={8} />
    </g>
  ),
  lock: (k, ti) => (
    <g transform={`rotate(${Math.sin(ti * 9) * (ti < 1.2 ? 4 : 0)})`}>
      <path d="M-62 -10 V-75 A62 62 0 0 1 62 -75 V-10" fill="none" stroke={k.ink} strokeWidth={38} strokeLinecap="round" />
      <path d="M-62 -10 V-75 A62 62 0 0 1 62 -75 V-10" fill="none" stroke={k.paper} strokeWidth={16} strokeLinecap="round" />
      <rect x="-110" y="-12" width="220" height="165" rx="28" fill={k.c1} {...ln(k)} />
      <circle cx="0" cy="55" r="24" fill={k.ink} />
      <rect x="-9" y="62" width="18" height="50" rx="8" fill={k.ink} />
    </g>
  ),
  eye: (k, ti) => {
    const b = blink(ti);
    return (
      <g transform={`scale(1 ${b})`}>
        <path d="M-175 0 Q0 -150 175 0 Q0 150 -175 0 Z" fill={k.paper} {...ln(k)} />
        <circle cx={Math.sin(ti * 1.5) * 38} cy={Math.cos(ti * 1.1) * 12} r="78" fill={k.c2} {...ln(k)} />
        <circle cx={Math.sin(ti * 1.5) * 38} cy={Math.cos(ti * 1.1) * 12} r="36" fill={k.ink} />
        <circle cx={Math.sin(ti * 1.5) * 38 + 22} cy={Math.cos(ti * 1.1) * 12 - 24} r="13" fill={k.paper} />
      </g>
    );
  },
  thought: (k, ti, v) => (
    <g>
      <circle cx="-95" cy="150" r="22" fill={k.paper} {...ln(k)} />
      <circle cx="-135" cy="105" r="32" fill={k.paper} {...ln(k)} />
      <path d="M-120 55 C-190 55 -200 -45 -130 -60 C-150 -140 -50 -170 -5 -120 C30 -175 140 -150 135 -80 C200 -75 205 25 140 45 C150 100 55 105 15 70 C-20 100 -95 95 -120 55 Z" fill={k.paper} {...ln(k)} />
      <text x="0" y={5 + Math.sin(ti * 3) * 5} fontSize="150" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.c3}>{v ?? '?'}</text>
    </g>
  ),
  person: (k, ti, v) => {
    const wave = v === 'wave' ? Math.sin(ti * 6) * 18 : 0;
    return (
      <g>
        <line x1="-34" y1="60" x2="-40" y2="165" stroke={k.ink} strokeWidth={34} strokeLinecap="round" />
        <line x1="34" y1="60" x2="40" y2="165" stroke={k.ink} strokeWidth={34} strokeLinecap="round" />
        <line x1="-48" y1="-20" x2="-100" y2="55" stroke={k.c2} strokeWidth={30} strokeLinecap="round" />
        <g transform={`rotate(${wave} 48 -20)`}>
          <line x1="48" y1="-20" x2="102" y2={v === 'wave' ? -75 : 55} stroke={k.c2} strokeWidth={30} strokeLinecap="round" />
        </g>
        <rect x="-62" y="-50" width="124" height="130" rx="46" fill={k.c2} {...ln(k)} />
        <circle cx="0" cy="-105" r="48" fill={k.paper} {...ln(k)} />
        <circle cx="-17" cy="-108" r="6" fill={k.ink} />
        <circle cx="17" cy="-108" r="6" fill={k.ink} />
        <path d="M-16 -85 Q0 -72 16 -85" fill="none" stroke={k.ink} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  },
  bear: (k, ti) => {
    const b = blink(ti);
    return (
      <g>
        <circle cx="-108" cy="-112" r="44" fill={k.paper} {...ln(k)} />
        <circle cx="108" cy="-112" r="44" fill={k.paper} {...ln(k)} />
        <circle cx="-108" cy="-112" r="20" fill={k.c3} opacity={0.7} />
        <circle cx="108" cy="-112" r="20" fill={k.c3} opacity={0.7} />
        <ellipse cx="0" cy="-5" rx="152" ry="136" fill={k.paper} {...ln(k)} />
        <ellipse cx="-56" cy="-25" rx="12" ry={13 * b} fill={k.ink} />
        <ellipse cx="56" cy="-25" rx="12" ry={13 * b} fill={k.ink} />
        <ellipse cx="0" cy="48" rx="66" ry="50" fill={k.paper} {...ln(k)} />
        <ellipse cx="0" cy="26" rx="26" ry="17" fill={k.ink} />
        <path d="M0 43 V64 M-24 74 Q0 92 24 74" fill="none" stroke={k.ink} strokeWidth={8} strokeLinecap="round" />
        <circle cx="-95" cy="30" r="18" fill={k.c3} opacity={0.35} />
        <circle cx="95" cy="30" r="18" fill={k.c3} opacity={0.35} />
      </g>
    );
  },
  gear: (k, ti) => {
    const G = (r: number, teeth: number, rot: number, fill: string) => (
      <g transform={`rotate(${rot})`}>
        {Array.from({length: teeth}, (_, i) => (
          <rect key={i} x={-r * 0.2} y={-r * 1.28} width={r * 0.4} height={r * 0.42} rx={6} fill={fill} {...ln(k)} strokeWidth={8} transform={`rotate(${(i / teeth) * 360})`} />
        ))}
        <circle r={r} fill={fill} {...ln(k)} />
        <circle r={r * 0.4} fill={k.bg} {...ln(k)} strokeWidth={8} />
      </g>
    );
    return (
      <g>
        <g transform="translate(-45 -35)">{G(95, 8, ti * 40, k.c1)}</g>
        <g transform="translate(110 100)">{G(58, 6, -ti * 66 + 15, k.c2)}</g>
      </g>
    );
  },
  chart: (k, ti, v) => {
    const down = v === 'down';
    const hs = down ? [210, 160, 115, 70] : [70, 115, 160, 210];
    const g = clamp(ti / 0.9);
    return (
      <g>
        <path d="M-175 165 H175 M-175 165 V-170" fill="none" stroke={k.ink} strokeWidth={SW} strokeLinecap="round" />
        {hs.map((h, i) => (
          <rect key={i} x={-140 + i * 78} y={165 - h * g} width="56" height={h * g} rx="8" fill={i === (down ? 3 : 3) ? (down ? k.c3 : k.c1) : k.c2} {...ln(k)} strokeWidth={8} />
        ))}
        <path d={down ? 'M-150 -130 L-40 -20 L20 -60 L130 60' : 'M-150 60 L-40 -30 L20 -10 L130 -130'} fill="none" stroke={down ? k.c3 : k.c4} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="600" strokeDashoffset={600 * (1 - g)} />
        <path d={down ? 'M95 70 H138 V28' : 'M95 -125 H138 V-82'} fill="none" stroke={down ? k.c3 : k.c4} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={g} />
      </g>
    );
  },
  page: (k, ti, v) => (
    <g>
      <rect x="-125" y="-165" width="250" height="330" rx="14" fill={k.paper} {...ln(k)} />
      <path d="M-82 -165 V165 M82 -165 V165 M-125 -122 H125 M-125 122 H125" fill="none" stroke={k.c2} strokeWidth={6} strokeDasharray="14 10" opacity={0.85} />
      {[-80, -45, -10, 25, 60, 95].map((y, i) => (
        <line key={i} x1="-64" y1={y} x2={i === 5 ? 10 : 64} y2={y} stroke={k.ink} strokeWidth={9} strokeLinecap="round" opacity={0.7} />
      ))}
      <rect x="-70" y="-30" width="140" height="22" fill={k.c1} opacity={0.65} />
      <g transform={`translate(${-165 + Math.sin(ti * 2) * 4} 0)`}>
        <rect x="-26" y="-150" width="52" height="300" rx="8" fill={k.c1} {...ln(k)} strokeWidth={8} />
        {Array.from({length: 11}, (_, i) => (
          <line key={i} x1="26" y1={-130 + i * 26} x2={i % 2 ? 6 : -8} y2={-130 + i * 26} stroke={k.ink} strokeWidth={5} />
        ))}
      </g>
      {v && (
        <g transform="translate(120 150)">
          <rect x="-72" y="-30" width="144" height="60" rx="30" fill={k.c2} {...ln(k)} strokeWidth={8} />
          <text x="0" y="14" fontSize="38" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.mono}", monospace`} fill={k.light ? '#fff' : k.paper}>{v}</text>
        </g>
      )}
    </g>
  ),
  laptop: (k, ti) => (
    <g>
      <rect x="-150" y="-135" width="300" height="200" rx="18" fill={k.ink} {...ln(k)} />
      <rect x="-128" y="-113" width="256" height="156" rx="8" fill={k.c2} />
      {[-85, -55, -25].map((y, i) => (
        <rect key={i} x="-105" y={y} width={[120, 170, 90][i]} height="14" rx="7" fill={i === 1 ? k.c1 : k.paper} opacity={0.9} />
      ))}
      <rect x={-105 + 92} y="0" width="14" height="22" fill={k.paper} opacity={ti % 1 < 0.5 ? 1 : 0} />
      <path d="M-185 80 H185 L160 112 H-160 Z" fill={k.paper} {...ln(k)} />
    </g>
  ),
  cap: (k, ti) => (
    <g>
      <path d="M-105 15 V90 Q0 145 105 90 V15 L0 58 Z" fill={k.c2} {...ln(k)} />
      <path d="M0 -105 L180 -25 L0 55 L-180 -25 Z" fill={k.c2} {...ln(k)} />
      <path d="M0 -105 L180 -25 L0 55 Z" fill={k.paper} opacity={0.18} />
      <g transform={`rotate(${Math.sin(ti * 3) * 6} 135 -12)`}>
        <line x1="135" y1="-12" x2="135" y2="95" stroke={k.c1} strokeWidth={10} strokeLinecap="round" />
        <circle cx="135" cy="104" r="16" fill={k.c1} {...ln(k)} strokeWidth={7} />
      </g>
    </g>
  ),
  pen: (k, ti) => {
    const g = clamp(ti / 1.2);
    return (
      <g>
        <path d="M-150 150 C-90 110 -40 175 20 135 S110 125 160 150" fill="none" stroke={k.c2} strokeWidth={12} strokeLinecap="round" strokeDasharray="420" strokeDashoffset={420 * (1 - g)} />
        <g transform="rotate(35)">
          <rect x="-32" y="-175" width="64" height="48" rx="12" fill={k.c3} {...ln(k)} />
          <rect x="-32" y="-132" width="64" height="215" fill={k.c1} {...ln(k)} />
          <path d="M-32 83 L0 150 L32 83 Z" fill={k.paper} {...ln(k)} />
          <path d="M-12 120 L0 150 L12 120 Z" fill={k.ink} />
          <line x1="0" y1="-120" x2="0" y2="75" stroke={k.ink} strokeWidth={6} opacity={0.35} />
        </g>
      </g>
    );
  },
  warning: (k, ti) => (
    <g transform={`scale(${1 + Math.sin(ti * 6) * 0.04})`}>
      <path d="M0 -150 L165 125 H-165 Z" fill={k.c1} {...ln(k)} strokeWidth={16} />
      <rect x="-12" y="-70" width="24" height="115" rx="12" fill={k.ink} />
      <circle cx="0" cy="82" r="15" fill={k.ink} />
    </g>
  ),
  check: (k, ti) => {
    const g = clamp(ti / 0.6);
    return (
      <g>
        <circle r="150" fill={k.c4} {...ln(k)} />
        <path d="M-70 5 L-20 58 L75 -52" fill="none" stroke={k.paper} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="260" strokeDashoffset={260 * (1 - g)} />
      </g>
    );
  },
  cross: (k, ti) => {
    const g = clamp(ti / 0.5);
    return (
      <g>
        <circle r="150" fill={k.c3} {...ln(k)} />
        <path d="M-62 -62 L62 62 M62 -62 L-62 62" fill="none" stroke={k.paper} strokeWidth={34} strokeLinecap="round" strokeDasharray="200" strokeDashoffset={200 * (1 - g)} />
      </g>
    );
  },
  loop: (k, ti) => (
    <g transform={`rotate(${ti * 70})`}>
      <path d="M-115 0 A115 115 0 0 1 80 -82" fill="none" stroke={k.c2} strokeWidth={30} strokeLinecap="round" />
      <path d="M115 0 A115 115 0 0 1 -80 82" fill="none" stroke={k.c1} strokeWidth={30} strokeLinecap="round" />
      <path d="M45 -118 L105 -92 L72 -35 Z" fill={k.c2} {...ln(k)} strokeWidth={8} />
      <path d="M-45 118 L-105 92 L-72 35 Z" fill={k.c1} {...ln(k)} strokeWidth={8} />
    </g>
  ),
  phone: (k, ti) => (
    <g transform={`rotate(${Math.sin(ti * 12) * (ti % 2 < 0.5 ? 4 : 0)})`}>
      <rect x="-92" y="-170" width="184" height="340" rx="34" fill={k.ink} {...ln(k)} />
      <rect x="-76" y="-140" width="152" height="270" rx="14" fill={k.c2} />
      {[-100, -60, -20, 20].map((y, i) => (
        <rect key={i} x="-56" y={y} width={[100, 112, 70, 96][i]} height="22" rx="11" fill={k.paper} opacity={0.9} />
      ))}
      <circle cx="68" cy="-148" r="30" fill={k.c3} {...ln(k)} strokeWidth={7} />
      <text x="68" y="-136" fontSize="36" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.paper}>1</text>
    </g>
  ),
  coin: (k, ti, v) => (
    <g transform={`scale(${Math.cos(ti * 2.6)} 1)`}>
      <circle r="140" fill={k.c1} {...ln(k)} />
      <circle r="102" fill="none" stroke={k.ink} strokeWidth={7} strokeDasharray="4 14" strokeLinecap="round" />
      <text x="0" y="32" fontSize="100" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.ink}>{v ?? 'Rp'}</text>
    </g>
  ),
  heart: (k, ti) => (
    <g transform={`scale(${1 + Math.max(0, Math.sin(ti * 6)) * 0.08})`}>
      <path d="M0 150 C-190 20 -150 -130 -70 -130 C-30 -130 -8 -105 0 -80 C8 -105 30 -130 70 -130 C150 -130 190 20 0 150 Z" fill={k.c3} {...ln(k)} />
      <path d="M-100 -60 C-95 -88 -75 -95 -60 -92" fill="none" stroke={k.paper} strokeWidth={12} strokeLinecap="round" opacity={0.8} />
    </g>
  ),
  shield: (k, ti) => (
    <g>
      <path d="M0 -165 L135 -115 V10 C135 90 70 140 0 170 C-70 140 -135 90 -135 10 V-115 Z" fill={k.c2} {...ln(k)} />
      <path d="M0 -125 L100 -90 V10 C100 70 55 108 0 132 Z" fill={k.paper} opacity={0.18} />
      <path d="M-52 5 L-12 48 L58 -35" fill="none" stroke={k.paper} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="220" strokeDashoffset={220 * (1 - clamp(ti / 0.6))} />
    </g>
  ),
  question: (k, ti) => (
    <g transform={`rotate(${Math.sin(ti * 2.4) * 6})`}>
      <text x="8" y="130" fontSize="420" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.ink} stroke={k.ink} strokeWidth={22} strokeLinejoin="round">?</text>
      <text x="0" y="122" fontSize="420" fontWeight={800} textAnchor="middle" fontFamily={`"${k.F.head}", Inter, sans-serif`} fill={k.c1}>?</text>
    </g>
  ),
  ruler: (k, ti) => (
    <g transform="rotate(-18)">
      <rect x="-185" y="-52" width="370" height="104" rx="14" fill={k.c1} {...ln(k)} />
      {Array.from({length: 19}, (_, i) => (
        <line key={i} x1={-165 + i * 18.3} y1="-52" x2={-165 + i * 18.3} y2={i % 5 === 0 ? -8 : -26} stroke={k.ink} strokeWidth={i % 5 === 0 ? 7 : 5} />
      ))}
      <path d={`M-150 ${24} H${150 * Math.min(1, 0.3 + (ti % 3) / 2.4 * 0.7)}`} stroke={k.c2} strokeWidth={9} strokeLinecap="round" />
    </g>
  ),
};

export const ART_NAMES = Object.keys(ART);

export const useK = (): K => {
  const {P, F, light} = useJob();
  return {c1: P.accent, c2: P.accent2, c3: P.alert, c4: P.good, paper: P.paper, ink: P.ink, bg: P.bg, text: P.text, F, light};
};

export type ArtSpec = string | {name: string; x?: number; y?: number; s?: number; at?: number; rot?: number; flip?: boolean; halo?: boolean; v?: string};

/** satu ilustrasi dengan halo, pop-in, dan gerak idle; t0 = detik muncul */
export const ArtItem: React.FC<{name: string; t: number; t0: number; x: number; y: number; s: number; rot?: number; flip?: boolean; halo?: boolean; v?: string; i?: number}> = ({
  name, t, t0, x, y, s, rot = 0, flip, halo = true, v, i = 0,
}) => {
  const k = useK();
  const R = ART[name];
  if (!R) return null;
  const p = pop(t, t0, 0.5);
  const ti = Math.max(0, t - t0);
  const sc = s * (0.55 + 0.45 * p) * (1 + Math.sin(ti * 1.7 + i) * 0.015);
  return (
    <g transform={`translate(${x} ${y + Math.sin(ti * 2 + i) * 9}) rotate(${rot})`} opacity={clamp(p * 1.6)}>
      <g transform={`scale(${flip ? -sc : sc} ${sc})`}>
        {halo && (
          <g>
            <circle r="228" fill={k.c1} opacity={k.light ? 0.28 : 0.13} />
            <circle r="248" fill="none" stroke={k.c1} strokeWidth={5} strokeDasharray="10 22" strokeLinecap="round" opacity={0.55} transform={`rotate(${ti * 14})`} />
          </g>
        )}
        {R(k, ti, v)}
      </g>
    </g>
  );
};

export const hasArt = (s: any) => !!s?.art && (!Array.isArray(s.art) || s.art.length > 0);

/** posisi bawaan: 1 item di tengah, 2-3 item berjajar; y/s bisa ditimpa per adegan */
export const ArtLayer: React.FC<{t: number; b: number; art?: ArtSpec | ArtSpec[]; y?: number; s?: number}> = ({t, b, art, y = 415, s = 0.68}) => {
  const {beats} = useJob();
  if (!art) return null;
  const list = Array.isArray(art) ? art : [art];
  const n = Math.min(3, list.length);
  const xs = n === 1 ? [540] : n === 2 ? [330, 750] : [210, 540, 870];
  const sc = n === 1 ? s : n === 2 ? s * 0.8 : s * 0.62;
  return (
    <g>
      {list.slice(0, 3).map((a, i) => {
        const o: any = typeof a === 'string' ? {name: a} : a;
        const t0 = o.at != null ? wAt(beats, b, o.at) : beats[b - 1].start + 0.05 + i * 0.18;
        return <ArtItem key={i} i={i} name={o.name} t={t} t0={t0} x={o.x ?? xs[i]} y={o.y ?? y} s={o.s ?? sc} rot={o.rot} flip={o.flip} halo={o.halo} v={o.v} />;
      })}
    </g>
  );
};
