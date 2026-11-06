import React from 'react';

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const CX = 540;

export type Word = [string, number, number];
export type BeatT = {beat: number; start: number; dur: number; words: Word[]};
export type Brand = {
  id: string; name: string; handle: string; tagline: string; mode: 'dark' | 'light';
  palette: Record<string, any>;
  fonts: {head: string; mono: string; serif: string; body: string};
  fontFiles: [string, number, string, string][];
};
export type Job = {
  brand: Brand;
  meta: {fileNo?: string; source?: string; title?: string; withAudio?: boolean; cover?: {kicker?: string; lines: string[]; sub?: string}};
  timing: BeatT[];
  scenes: any[];
};

export type Ctx = {job: Job; P: Brand['palette']; F: Brand['fonts']; beats: BeatT[]; light: boolean};
export const JobCtx = React.createContext<Ctx>(null as any);
export const useJob = () => React.useContext(JobCtx);

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lin = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const eo = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const ramp = (t: number, a: number, b: number) => eo((t - a) / (b - a));
export const back = (x: number) => {
  x = clamp(x);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const pop = (t: number, a: number, d = 0.35) => back((t - a) / d);
export const fmt = (n: number, d = 1) => (Math.round((n + 1e-9) * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');

export const audioEnd = (b: BeatT[]) => b[b.length - 1].start + b[b.length - 1].dur;
export const durationOf = (b: BeatT[]) => Math.ceil((audioEnd(b) + 0.8) * FPS);
export const windowsOf = (b: BeatT[]) => {
  const D = durationOf(b);
  return b.map((x, i) => ({from: Math.round(x.start * FPS), to: i + 1 < b.length ? Math.round(b[i + 1].start * FPS) : D}));
};

/** waktu mulai kata ke-i pada beat b (1-based), dikurangi 0,1 dtk supaya visual mendahului suara */
export const wAt = (beats: BeatT[], b: number, i: number) => {
  const ws = beats[b - 1].words;
  const k = clamp(Math.round(i), 0, ws.length - 1);
  return ws[k][1] - 0.1;
};

/** pemicu: at[k] bila ada, selain itu sebar rata di sepanjang kata beat */
export const triggers = (beats: BeatT[], b: number, n: number, at?: number[], from = 0, to?: number) => {
  const ws = beats[b - 1].words.length;
  const end = to ?? ws - 1;
  return Array.from({length: n}, (_, k) =>
    at && typeof at[k] === 'number' ? wAt(beats, b, at[k]) : wAt(beats, b, from + (n <= 1 ? 0 : (k / n) * (end - from))),
  );
};

/** perkiraan lebar teks tebal (px) untuk fit */
export const fit = (text: string, maxW: number, maxSize: number, k = 0.62) => Math.min(maxSize, maxW / Math.max(1, text.length * k));
