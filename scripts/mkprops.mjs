// Gabungkan brand + job/{meta,timing,scenes}.json -> src/props.generated.json, dan salin font brand ke public/fonts
import fs from 'fs';
import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const meta = rd('job/meta.json');
const brand = rd(`brands/${meta.brand}.json`);
const timing = rd('job/timing.json');
const scenes = rd('job/scenes.json');
const errs = [];
if (timing.length !== scenes.length) errs.push(`jumlah beat timing (${timing.length}) != jumlah adegan (${scenes.length})`);
const TYPES = ['statement', 'bignumber', 'bars', 'versus', 'list', 'doc', 'quote', 'timeline', 'crowd', 'bigword', 'closer'];
scenes.forEach((s, i) => { if (!TYPES.includes(s.type)) errs.push(`adegan ${i + 1}: type "${s.type}" tidak dikenal`); });
if (errs.length) { console.error('JOB TIDAK VALID:\n- ' + errs.join('\n- ')); process.exit(1); }
const m = { ...meta, withAudio: fs.existsSync(path.join(root, 'public/narasi.wav')) };
fs.writeFileSync(path.join(root, 'src/props.generated.json'), JSON.stringify({ brand, meta: m, timing, scenes }));
const fdir = path.join(root, 'public/fonts');
fs.mkdirSync(fdir, { recursive: true });
for (const [, , pkg, v] of brand.fontFiles) {
  const f = `${pkg}-${v}.woff2`;
  const src = path.join(root, 'node_modules/@fontsource', pkg, 'files', f);
  fs.copyFileSync(src, path.join(fdir, f));
}
const d = timing[timing.length - 1];
console.log(`ok: brand=${brand.id} beats=${timing.length} audio=${(d.start + d.dur).toFixed(1)}s withAudio=${m.withAudio}`);
