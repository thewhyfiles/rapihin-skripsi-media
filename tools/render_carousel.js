// Render carousel: job/carousel.html (elemen .slide 1080x1350) -> out/carousel/slide-NN.jpg
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const job = JSON.parse(fs.readFileSync('job/job.json', 'utf8'));
if (!job.carousel) { console.log('tidak ada carousel di job.json, lewati'); process.exit(0); }
const W = job.carousel.width || 1080, H = job.carousel.height || 1350;

(async () => {
  fs.mkdirSync('out/carousel', { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.log('PAGEERR', e.message); process.exitCode = 1; });
  await p.goto('file://' + path.resolve('job/carousel.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([
    '800 40px "Bricolage Grotesque"', '700 40px "Bricolage Grotesque"',
    '500 40px "Plus Jakarta Sans"', '600 40px "Plus Jakarta Sans"', '700 40px "Plus Jakarta Sans"', '800 40px "Plus Jakarta Sans"',
    '700 40px "IBM Plex Mono"', '600 40px "IBM Plex Mono"'
  ].map(f => document.fonts.load(f))));
  const slides = await p.$$('.slide');
  const want = job.carousel.slides;
  if (want && slides.length !== want) { console.log(`ERROR: ada ${slides.length} slide, job.json minta ${want}`); process.exit(1); }
  let bad = 0;
  for (let i = 0; i < slides.length; i++) {
    const info = await slides[i].evaluate((el, [W, H]) => {
      const r = el.getBoundingClientRect();
      let over = 0;
      el.querySelectorAll('*').forEach(c => {
        const q = c.getBoundingClientRect();
        if (!q.width && !q.height) return;
        over = Math.max(over, q.bottom - r.bottom, q.right - r.right, r.top - q.top, r.left - q.left);
      });
      return { w: Math.round(r.width), h: Math.round(r.height), over: Math.round(over) };
    }, [W, H]);
    console.log(`slide ${i + 1}: ${info.w}x${info.h}, overflowBy ${info.over}`);
    if (info.w !== W || info.h !== H || info.over > 2) bad++;
    const buf = await slides[i].screenshot({ type: 'jpeg', quality: 92 });
    fs.writeFileSync(`out/carousel/slide-${String(i + 1).padStart(2, '0')}.jpg`, buf);
  }
  await b.close();
  if (bad) { console.log('ERROR: ada slide yang meluap atau ukurannya salah'); process.exit(1); }
  console.log('carousel selesai:', slides.length, 'slide');
})();
