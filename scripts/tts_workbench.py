# Dijalankan DI DALAM COMPOSIO_REMOTE_WORKBENCH (shell sandbox tidak bisa menjangkau Google AI).
# Pakai: isi BEATS (satu string TTS per beat) dan COMMIT, lalu jalankan. Hasil: /mnt/files/job/{narasi.wav,timing.json} + URL berbagi.
# Satu panggilan GEMINI_GENERATE_CONTENT per beat (respons panjang ditolak lewat jalur biasa).
import base64, json, os, re, wave
import numpy as np
from concurrent.futures import ThreadPoolExecutor

BEATS = [
    # "Kalimat beat 1 (angka dan nama sudah dieja).",
]
VOICE = 'Charon'                       # TWF & Rapihin: Charon (Indonesia, laki-laki)
MODEL = 'gemini-2.5-flash-preview-tts'
STYLE = ('Bacakan dengan SANGAT CEPAT, tempo cepat seperti narator video pendek viral, '
         'hampir tanpa jeda antar kalimat, tetap jelas dan tenang. Teks: ')
SR, GAP, LEAD, TAIL, THR = 24000, 0.14, 0.04, 0.06, 400
OUT = '/mnt/files/job'; os.makedirs(OUT, exist_ok=True)

def gen(i):
    last = '?'
    for _ in range(3):
        res, err = run_composio_tool('GEMINI_GENERATE_CONTENT', {'model': MODEL, 'voice_name': VOICE, 'prompt': STYLE + BEATS[i]})
        if not err:
            ad = (res.get('data', res)).get('audio_data')
            if ad: return i, np.frombuffer(base64.b64decode(ad), dtype=np.int16)
        last = str(err)[:150]
    return i, last

def syl(w): return max(1, len(re.findall(r'[aeiouAEIOU]', w)))
def pause(w): return {',': .12, '.': .25, '?': .25, ':': .15, '!': .25}.get(w[-1], 0)

with ThreadPoolExecutor(4) as ex: raw = dict(ex.map(gen, range(len(BEATS))))
bad = {k: v for k, v in raw.items() if isinstance(v, str)}
assert not bad, f'TTS gagal: {bad}'

segs, timing, t = [], [], 0.0
for i, text in enumerate(BEATS):
    x = raw[i]; idx = np.where(np.abs(x) > THR)[0]
    a = max(0, idx[0] - int(LEAD * SR)); b = min(len(x), idx[-1] + int(TAIL * SR))
    seg = x[a:b]; d = len(seg) / SR
    words = text.split()
    wt = [syl(w) * 0.17 + pause(w) for w in words]
    span = max(0.1, d - LEAD - TAIL); k = span / sum(wt); c = LEAD; ws = []
    for w, q in zip(words, wt):
        ws.append([w, round(t + c, 3), round(t + c + q * k - pause(w) * k, 3)]); c += q * k
    timing.append({'beat': i + 1, 'start': round(t, 3), 'dur': round(d, 3), 'words': ws})
    segs.append(seg); t += d + GAP
    if i + 1 < len(BEATS): segs.append(np.zeros(int(GAP * SR), dtype=np.int16))
pcm = np.concatenate(segs)
with wave.open(f'{OUT}/narasi.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
json.dump(timing, open(f'{OUT}/timing.json', 'w'), ensure_ascii=False)
url, err = get_mount_file_url(f'{OUT}/narasi.wav'); assert not err, err
print('TOTAL', round(len(pcm) / SR, 2), 's | beats', len(timing), '| kata/dtk', round(sum(len(b['words']) for b in timing) / (len(pcm) / SR), 2))
print('AUDIO_URL', url)

# Opsional: commit langsung dari sini (hemat token, tanpa menyalin ulang timing). Isi COMMIT untuk mengaktifkan.
COMMIT = None   # {'owner': 'thewhyfiles', 'repo': 'thewhyfiles-media', 'branch': 'remotion-build',
                #  'extra': {'job/meta.json': '<json str>', 'job/scenes.json': '<json str>'}}
if COMMIT:
    up = [{'path': 'job/timing.json', 'content': json.dumps(timing, ensure_ascii=False)},
          {'path': 'job/audio.url', 'content': url}]
    up += [{'path': p, 'content': c} for p, c in COMMIT['extra'].items()]
    r, e = run_composio_tool('GITHUB_COMMIT_MULTIPLE_FILES', {'owner': COMMIT['owner'], 'repo': COMMIT['repo'], 'branch': COMMIT['branch'],
                             'message': 'job: ' + json.loads(COMMIT['extra'].get('job/meta.json', '{}')).get('title', 'reel'), 'upserts': up})
    print('COMMIT', e or 'ok')
