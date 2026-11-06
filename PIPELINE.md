# Reel Engine (Remotion) — prosedur produksi malam

Branch `remotion-build` repo ini = mesin render. Push ke branch ini memicu workflow `render-remotion`
(build di GitHub Actions) yang menerbitkan `reel.mp4`, `cover.jpg`, `timing.json` ke branch **`reel-remotion`**.
Publikasi ke Instagram tetap lewat Composio (ambil file dari `reel-remotion`, aturan akun IG tidak berubah).

## Urutan (sesi terjadwal)
1. **Topik & riset** (sumber primer, catat angka + pengukur). Setiap angka di layar harus ada di tabel sumber.
2. **Naskah** 14±3 beat, satu beat = satu kalimat/ide. 170–200 kata total (≈ 55–60 dtk setelah TTS cepat). Hook paradoks di kalimat 1; beat terakhir mengikat ke hook. Angka & nama dieja untuk TTS (versi TTS terpisah dari teks layar).
3. **Adegan** — tulis `scenes.json` (satu objek per beat, urutan sama), skema di bawah. Pilih tipe yang paling cocok per beat dan variasikan (jangan 3 `statement` berturut-turut).
4. **Suara + timing + commit** — jalankan `scripts/tts_workbench.py` di COMPOSIO_REMOTE_WORKBENCH (isi `BEATS` dan `COMMIT`). Ia membuat suara Gemini Charon per beat, menghitung `timing.json`, membuat URL berbagi audio, lalu meng-commit `job/timing.json`, `job/audio.url`, `job/meta.json`, `job/scenes.json` ke `remotion-build` (memicu render). Indeks kata di `at` mengacu pada kata-kata beat itu (hitung dari teks TTS-nya).
5. **Tunggu workflow** `render-remotion` (±8–12 mnt) via `GITHUB_LIST_WORKFLOW_RUNS_FOR_A_REPOSITORY` (branch `remotion-build`). Bila gagal, baca job log, perbaiki `job/` (bukan engine), commit ulang. Maks 2 percobaan, lalu laporkan.
6. **QC** — unduh `reel.mp4` dari branch `reel-remotion` (raw.githubusercontent.com bila repo publik, atau GITHUB_GET_REPOSITORY_CONTENT), cek durasi (ffprobe), ambil frame tiap beat, cek tabrakan teks/zona aman. Perbaiki `scenes.json` bila ada.
7. **Publikasi** via Composio Instagram (Reels), caption + hashtag, lalu catat. Aturan akun IG tidak berubah.

## `job/meta.json`
```json
{"brand":"twf|rapihin","title":"...","fileNo":"BERKAS No. 002","source":"sumber: Penulis, tahun",
 "publishBranch":"reel-remotion",
 "cover":{"kicker":"The Why Files ID","lines":["Baris 1","Baris 2","Baris sorot"],"sub":"label kecil"}}
```
Baris terakhir `cover.lines` disorot (aksen/stabilo).

## `job/scenes.json` — array, panjang = jumlah beat
Semua adegan punya `label` (kicker kecil di atas, opsional) dan `at` (opsional): daftar **indeks kata** pada beat itu yang memicu kemunculan item ke-0, ke-1, … Tanpa `at`, item disebar rata sepanjang kalimat. Visual muncul 0,1 dtk SEBELUM kata.

| type | field | catatan |
|---|---|---|
| `statement` | `lines[]`, `hl[]` (indeks baris yang disorot), `style` (`card`/polos), `tab`, `sub`, `size` | kalimat besar; `card` = kartu dokumen |
| `bignumber` | `value`, `prefix`, `suffix`, `unit`, `caption[]`, `tone` | angka menghitung naik; desimal pakai koma ("22,1") |
| `bars` | `bars[{label,value,tone?,hl?}]` (1–4), `unit`, `delta{text,tone}`, `decimals`, `max` | batang animasi; tone: alert/good/muted |
| `versus` | `left{title,items[],tone}`, `right{...}` | dua kolom; `\n` memecah baris item |
| `list` | `items[string atau {t,sub}]` (2–5) | daftar bernomor |
| `doc` | `lines[]`, `mark[]`, `tab`, `date`, `mono`, `stamp{text,tone}` | kartu dokumen / kutipan sumber + stempel |
| `quote` | `lines[]`, `by` | kutipan serif besar |
| `timeline` | `items[{k,v}]` | garis waktu vertikal (k = tahun/label) |
| `crowd` | `total` (maks 60), `mark`, `caption`, `sub` | grid orang (sampel/peserta) |
| `bigword` | `word`, `caption[]`, `tone` | satu kata/simbol raksasa ("?", "≠") |
| `closer` | `lines[]`, `hl[]`, `stamp` | penutup + handle brand |

Aturan: teks per baris sekitar 22 karakter atau kurang untuk `statement`/`closer` (otomatis mengecil bila lebih panjang); konten utama otomatis di zona aman (y 260–1290), caption di y 1318–1468. Angka di layar harus ada di tabel sumber. Parafrase diberi label. Tanpa logo/karakter milik kanal lain. Tanpa emoji (font tidak memuatnya).

## Brand
Brand repo ini: `rapihin` (`job/meta.json` → `"brand":"rapihin"`). Brand lain: `brands/twf.json` (gelap, kuning/biru, JetBrains Mono) dan `brands/rapihin.json` (terang: Hijau Margin #0E5C4E, Stabilo #FFE45C, Tinta #12201D, Merah Koreksi #C23B22, Garis Panduan #3B82B0, latar #F6F8F5; Plus Jakarta Sans + IBM Plex Mono). Brand baru = salin file JSON + tambah paket `@fontsource` di `package.json` bila perlu.

## Batas jujur
- Claude tidak bisa mendengar audio: intonasi/logat dinilai manusia.
- Timing per kata diperkirakan dari jumlah suku kata (akurat sekitar 0,1 dtk).
- Aset visual = SVG/CSS buatan kode; tidak ada gambar/musik/SFX bawaan.
