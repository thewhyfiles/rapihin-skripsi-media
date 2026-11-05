// Cover Reels: job/cover.html (satu elemen .cover 1080x1920) -> out/cover.jpg (q92).
// Frame hasil render_reel.js disimpan dulu sebagai out/cover_frame.jpg. Bila job/cover.html tidak ada, out/cover.jpg tetap frame.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('job/cover.html')) { console.log('tidak ada job/cover.html, cover = frame video'); process.exit(0); }
if (fs.existsSync('out/cover.jpg')) fs.renameSync('out/cover.jpg', 'out/cover_frame.jpg');

(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.log('PAGEERR', e.message); process.exitCode = 1; });
  await p.goto('file://' + path.resolve('job/cover.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([
    '800 40px "Bricolage Grotesque"', '700 40px "Bricolage Grotesque"',
    '600 40px "Plus Jakarta Sans"', '800 40px "Plus Jakarta Sans"', '700 40px "IBM Plex Mono"'
  ].map(f => document.fonts.load(f))));
  const el = await p.$('.cover');
  if (!el) { console.log('ERROR: tidak ada elemen .cover'); process.exit(1); }
  const info = await el.evaluate(root => {
    const r = root.getBoundingClientRect();
    let over = 0, minTop = 1e9, maxBottom = 0;
    root.querySelectorAll('.brand,.main,.foot').forEach(c => {
      const q = c.getBoundingClientRect();
      over = Math.max(over, q.right - r.right, r.left - q.left);
      minTop = Math.min(minTop, q.top - r.top); maxBottom = Math.max(maxBottom, q.bottom - r.top);
    });
    return { w: Math.round(r.width), h: Math.round(r.height), over: Math.round(over), top: Math.round(minTop), bottom: Math.round(maxBottom) };
  });
  console.log(`cover: ${info.w}x${info.h}, overflowX ${info.over}, isi y ${info.top}-${info.bottom} (aman 240-1680)`);
  let bad = info.w !== 1080 || info.h !== 1920 || info.over > 2;
  if (info.top < 240 || info.bottom > 1680) { console.log('ERROR: isi cover keluar zona aman grid 3:4 (y 240-1680)'); bad = true; }
  fs.writeFileSync('out/cover.jpg', await el.screenshot({ type: 'jpeg', quality: 92 }));
  await b.close();
  if (bad) { console.log('ERROR: cover tidak lolos pemeriksaan'); process.exit(1); }
  console.log('cover.jpg selesai');
})();
