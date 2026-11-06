import React from 'react';
import {useJob} from './core';

type TxProps = {
  x: number; y: number; size: number; fill?: string; weight?: number; font?: string;
  anchor?: 'start' | 'middle' | 'end'; ls?: number; op?: number; rot?: number; stroke?: string; children: React.ReactNode;
};
export const Tx: React.FC<TxProps> = ({x, y, size, fill, weight = 800, font, anchor = 'middle', ls = 0, op = 1, rot = 0, stroke, children}) => {
  const {P, F} = useJob();
  return (
    <text
      x={x} y={y} fontSize={size} fill={fill ?? P.text} fontWeight={weight} fontFamily={`"${font ?? F.head}", Inter, sans-serif`}
      textAnchor={anchor} letterSpacing={ls} opacity={op}
      transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}
      stroke={stroke} strokeWidth={stroke ? size * 0.12 : 0} paintOrder="stroke" strokeLinejoin="round"
    >
      {children}
    </text>
  );
};

export const Card: React.FC<{x: number; y: number; w: number; h: number; fill?: string; stroke?: string; op?: number; rot?: number; rx?: number; children?: React.ReactNode}> = ({
  x, y, w, h, fill, stroke, op = 1, rot = 0, rx = 14, children,
}) => {
  const {P, light} = useJob();
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
      <rect x={-w / 2 + 8} y={-h / 2 + 10} width={w} height={h} rx={rx} fill="#000" opacity={light ? 0.12 : 0.35} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={fill ?? P.paper} stroke={stroke ?? (light ? '#C9D6CF' : undefined)} strokeWidth={stroke || light ? 4 : 0} />
      {children}
    </g>
  );
};

export const Person: React.FC<{x: number; y: number; s?: number; fill?: string; op?: number}> = ({x, y, s = 1, fill, op = 1}) => {
  const {P} = useJob();
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={op}>
      <circle cx="0" cy="-26" r="15" fill={fill ?? P.text} />
      <rect x="-22" y="-6" width="44" height="40" rx="16" fill={fill ?? P.text} />
    </g>
  );
};

export const Stamp: React.FC<{x: number; y: number; w: number; h: number; text: string; color?: string; rot?: number; size?: number; op?: number; scale?: number}> = ({
  x, y, w, h, text, color, rot = -8, size = 64, op = 1, scale = 1,
}) => {
  const {P, F} = useJob();
  const c = color ?? P.alert;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} opacity={op}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="10" fill="none" stroke={c} strokeWidth="9" />
      <rect x={-w / 2 + 12} y={-h / 2 + 12} width={w - 24} height={h - 24} rx="4" fill="none" stroke={c} strokeWidth="3" />
      <Tx x={0} y={size * 0.35} size={size} fill={c} font={F.mono} weight={700} ls={4}>{text}</Tx>
    </g>
  );
};

export const Label: React.FC<{t: number; at: number; children: React.ReactNode; y?: number; color?: string}> = ({t, at, children, y = 340, color}) => {
  const {P, F} = useJob();
  const k = Math.min(1, Math.max(0, (t - at) / 0.25));
  return (
    <g opacity={k}>
      <rect x={500} y={y + 22} width="80" height="6" fill={P.accent} />
      <Tx x={540} y={y} size={30} fill={color ?? P.muted} font={F.mono} weight={700} ls={7}>{children}</Tx>
    </g>
  );
};
