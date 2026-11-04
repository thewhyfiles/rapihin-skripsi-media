// Render Reels: job/reel.html (fungsi seek(t)) + out/audio/v*.wav -> out/reel.mp4 + out/cover.jpg
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const job = JSON.parse(fs.readFileSync('job/job.json', 'utf8'));
const fps = job.fps || 30;
const scenes = job.scene_seconds.map(s => Math.round(s * fps));
const total = scenes.reduce((a, b) => a + b, 0) / fps;

(async () => {
  fs.mkdirSync('out/reel', { recursive: true });
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.log('PAGEERR', e.message); process.exitCode = 1; });
  await p.goto('file://' + path.resolve('job/reel.html'));
  await p.evaluate(() => window.__ready);

  // cek konsistensi timeline halaman dengan job.json (bila halaman mengekspornya)
  const tl = await p.evaluate(() => ({ S: window.__S || null, A: window.__A || null }));
  if (tl.S) {
    let acc = 0; const starts = [0];
    for (const s of job.scene_seconds) { acc += s; starts.push(+acc.toFixed(3)); }
    const bad = tl.S.some((v, i) => Math.abs(v - starts[i]) > 0.02);
    if (bad) { console.log('ERROR: scene_seconds di job.json tidak cocok dengan S di reel.html', tl.S, starts); process.exit(1); }
  }
  if (tl.A) {
    const bad = tl.A.some((v, i) => job.lines[i] && Math.abs(v - job.lines[i].at) > 0.02);
    if (bad) { console.log('ERROR: lines[].at di job.json tidak cocok dengan A di reel.html', tl.A); process.exit(1); }
  }

  const files = [];
  let f0 = 0;
  for (let s = 0; s < scenes.length; s++) {
    const tmp = `out/reel/tmp_s${s + 1}.mp4`, fin = `out/reel/s${s + 1}.mp4`;
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', String(fps), tmp]);
    const done = new Promise(r => ff.on('close', c => r(c)));
    ff.stderr.on('data', d => process.stderr.write(d));
    for (let i = 0; i < scenes[s]; i++) {
      await p.evaluate(t => window.seek(t), (f0 + i) / fps);
      const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    if ((await done) !== 0) { console.log('ffmpeg gagal di adegan', s + 1); process.exit(1); }
    fs.renameSync(tmp, fin);
    files.push(path.basename(fin));
    console.log('adegan', s + 1, 'selesai');
    f0 += scenes[s];
  }
  await b.close();

  fs.writeFileSync('out/reel/list.txt', files.map(f => `file '${f}'`).join('\n') + '\n');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/reel/list.txt', '-c', 'copy', 'out/reel/silent.mp4']);

  // audio: tiap VO di posisi "at", mix, loudnorm
  const inputs = [], parts = [];
  job.lines.forEach((l, i) => {
    inputs.push('-i', `out/audio/v${i + 1}.wav`);
    const ms = Math.round(l.at * 1000);
    parts.push(`[${i}]adelay=${ms}|${ms}[a${i}]`);
  });
  const mix = job.lines.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${job.lines.length}:normalize=0,aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=7,aresample=48000,apad,atrim=0:${total}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', parts.join(';') + ';' + mix, '-ac', '1', '-ar', '48000', 'out/reel/vo.wav']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'out/reel/silent.mp4', '-i', 'out/reel/vo.wav', '-map', '0:v', '-map', '1:a',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', 'out/reel.mp4']);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(job.cover_t || 1.5), '-i', 'out/reel.mp4', '-frames:v', '1', '-q:v', '2', 'out/cover.jpg']);
  fs.rmSync('out/reel', { recursive: true, force: true });
  console.log('reel.mp4 dan cover.jpg selesai');
})();
