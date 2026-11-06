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
const TYPES = ['statement', 'bignumber', 'bars', 'versus', 'list', 'doc', 'quote', 'timeline', 'crowd', 'bigword', 'closer', 'hero'];
scenes.forEach((s, i) => { if (!TYPES.includes(s.type)) errs.push(`adegan ${i + 1}: type "${s.type}" tidak dikenal`); });
const artSrc = fs.readFileSync(path.join(root, 'src/art.tsx'), 'utf8');
const ARTS = [...artSrc.matchAll(/^  (\w+): \(k/gm)].map((m) => m[1]);
const chk = (a, where) => (Array.isArray(a) ? a : a ? [a] : []).forEach((x) => { const n = typeof x === 'string' ? x : x?.name; if (!ARTS.includes(n)) errs.push(`${where}: ilustrasi "${n}" tidak ada. Pilihan: ${ARTS.join(', ')}`); });
scenes.forEach((s, i) => chk(s.art, `adegan ${i + 1}`));
chk(meta.cover?.art, 'cover');
const nArt = scenes.filter((s) => s.art && (!Array.isArray(s.art) || s.art.length)).length;
if (nArt < Math.ceil(scenes.length * 0.6)) console.warn(`PERINGATAN: hanya ${nArt}/${scenes.length} adegan punya ilustrasi (target >= 60%)`);
if (!meta.cover?.art) console.warn('PERINGATAN: cover.art kosong (cover hanya teks)');
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
