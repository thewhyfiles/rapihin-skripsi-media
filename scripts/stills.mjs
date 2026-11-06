// QC: render cuplikan frame. Pakai: node scripts/stills.mjs mid|end|<detik...>  (default: akhir tiap beat - 0.25 dtk)
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const props = JSON.parse(fs.readFileSync(path.join(root, 'src/props.generated.json'), 'utf8'));
const arg = process.argv.slice(2);
let times;
if (!arg.length || arg[0] === 'end') times = props.timing.map((b, i) => (i + 1 < props.timing.length ? props.timing[i + 1].start : b.start + b.dur) - 0.25);
else if (arg[0] === 'mid') times = props.timing.map((b) => b.start + b.dur * 0.6);
else times = arg.map(Number);
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.tsx'), publicDir: path.join(root, 'public')});
const opts = process.env.CHROME ? {browserExecutable: process.env.CHROME, chromeMode: 'chrome-for-testing'} : {};
const comp = await selectComposition({serveUrl, id: 'Reel', ...opts});
for (const t of times) {
  const frame = Math.round(t * 30);
  await renderStill({composition: comp, serveUrl, frame, output: path.join(root, `out/stills/t${String(frame).padStart(4, '0')}.png`), scale: 0.5, ...opts});
}
const cover = await selectComposition({serveUrl, id: 'Cover', ...opts});
await renderStill({composition: cover, serveUrl, frame: 0, output: path.join(root, 'out/stills/cover.png'), scale: 0.5, ...opts});
console.log('stills ok', times.length);
