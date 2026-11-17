# Kunang — Spectacular Upgrade Brief

Premis (kata-kata Arya): "kurang spektakuler" — game orang lain kayak game asli yang niat, Kunang masih polos. Upgrade ini bikin Kunang terasa seperti game beneran: ada boss, ada pilihan, ada musuh yang beda-beda, ada hadiah yang layak dikejar.

## Core loop (tetap)

Geser lentera, tarik kunang ke cahaya, selamatkan sebelum jatuh. Kelelawar memburu kunang; Spasi mengusir mereka dengan kilau. Lima malam, makin malam makin susah, fajar kalau bertahan.

## Menit pertama (tetap)

Malam 1 tidak berubah: kelelawar Hunter saja, lambat, jarang. Pemain belajar gerak + kilau tanpa ditekan.

## Yang dibangun (urut)

1. [x] Tiga jenis kelelawar: Swift (kecil, cepat, menyelam lurus), Hunter (perilaku lama), Tank (besar, lambat, butuh 2 kilau). Malam 1 Hunter saja, campuran naik tiap malam. (unit 33/33 + live: tank stagger lalu kabur di kilau ke-2, campuran malam 5 terukur)
2. [x] Kunang Emas: 1 dari 12 mulai malam 2, jatuh lebih cepat, skor 5x, kelelawar lebih suka memburunya. (live: save emas bayar tepat 5x)
3. [x] Pilihan upgrade antar malam: 3 kartu acak dari 6 opsi (kerucut lebar, kilau cepat, kilau ganda, lentera kuat, tarik cahaya, kilau luas), pilih 1 pakai 1/2/3 atau klik. Pilihan ditampilkan di layar malam-terlewati dan di HUD. (live: 4 malam, 4 pilihan, semua maju ke malam berikut)
4. [x] Boss "Raja Kelelawar" malam 5: banner intro, 3 HP kilau, serangan menyelam ke lentera, memanggil kelelawar biasa tiap beberapa detik. Kalahkan dia, malam 5 berakhir lebih cepat + bonus 500. (live: muncul ~2 dtk, kalah setelah 3 kilau, fajar)
5. [x] Spektakel: shake + hit-stop lebih besar saat boss kena kilau, ledakan partikel besar saat kunang emas diselamatkan dan saat boss kalah. (trauma 0.9 + hit-stop 0.12 dtk + 60 partikel; terlihat di live test)
6. [x] Screenshot baru (tepat 4, masing-masing <=256 KiB): judul, boss, pilihan upgrade, fajar. Screenshot lama pindah ke screenshots-old/. (59 KB, 44 KB, 65 KB, 61 KB; ?shot=boss dan ?shot=upgrade baru)

## Anti-pilar

- Jangan ubah kontrol (panah/mouse, Spasi, P, M, Enter, R).
- Jangan buat malam 1 lebih susah.
- Jangan tambah aset gambar (tetap canvas prosedural; sprite PNG v2 adalah tryout terpisah).
- Jangan ubah struktur 5 malam atau layar judul / malam-terlewati / fajar / game over.
- Jangan ubah frame ?shot= yang sudah ada (start/play/end tetap deterministik).

## Design read

Arcade malam kecil, "still, watchful, warm", satu aksen amber di atas indigo gelap. Kartu upgrade: panel gelap solid, border amber tipis, font yang sama (Georgia judul, system-ui HUD), grid 4px. Tanpa gradient generik, tanpa glassmorphism, tanpa pill di mana-mana.

## Handover (diisi di akhir)

- Yang lolos: semua 4 sistem + spektakel, unit 33/33, live 32/32 tanpa error konsol/page, semua state render (judul, main, pilihan upgrade, boss, fajar, game over), malam 1 tetap Hunter saja dan bot bertahan dengan nyawa sisa, boss kalah dalam 3 kilau, screenshot tepat 4 di bawah 65 KB.
- Yang masih rusak: bulan sabit masih render seperti cakram gelap menimpa halo (sudah begitu sejak v2, bukan regresi; tidak disentuh). Sayap boss dari jauh terbaca sebagai satu bentuk lebar, urat sayap tidak kelihatan dari jauh. Kilau sekarang berbasis radius 720 px, jadi kelelawar di sudut langit paling jauh lolos dari kilau (sengaja, upgrade Kilau Luas menutup celah ini; malam 1 tidak terasa karena kelelawar jarang dan lambat).
- Yang ditebak: campuran kelelawar per malam (angka dari rasa, belum playtest manusia); tarif kunang emas 1/12 dan bonus boss 500 belum diuji manusia; bot headless bukan pemain manusia.
- Not yet played by a person.

---

# Kunang — Rame Pass (di atas spectacular)

Premis (kata-kata Arya): "kayak kurang rame dan heboh kek game game top 1". Game top (Lanternkeep, 94%) layarnya padat: banyak musuh dan banyak sistem jalan bareng. Kunang masih tenang. Putaran ini menambah kepadatan dan spektakel, BUKAN sistem baru: layar lebih ramai dari malam 2, ada gelombang kelelawar, ada hujan kunang emas, kombo x5/x10 meledak, dan semua feedback lewat satu `feedback(tier, pos)` supaya tetap proporsional.

Skill yang dipakai: `awesome-gamedev-agent-skills/skills/disciplines/game-feel` (tier + feedback tunggal + verifikasi headless), `.../disciplines/create-game-assets` (visual target yang sudah disetujui, keluarga visual yang sama, validasi di skala asli game), plus antislop-ui + design-taste-frontend + game-studio-workflow.

## Design read

Arcade malam kecil, "still, watchful, warm", satu aksen amber di atas indigo gelap. Rame di sini berarti padat dan hidup, bukan berisik: warna dan font tetap sama, banner gelombang/hujan pakai tipografi yang sama dengan banner boss.

## Yang dibangun (urut)

1. [x] Kepadatan: malam 2+ jauh lebih ramai (kunang ~3-4/dtk, kelelawar ~1.0-2.2/dtk di malam puncak) dengan cap (kunang 48, kelelawar 12) supaya tetap bisa dimainkan. Malam 1 TIDAK berubah. (unit 35/35 + live: malam 2 real-time 28-30 kunang hidup, cap tertahan; bat rate awal 0.7 terbukti terlalu rendah karena kelelawar cepat mati setelah makan, dinaikkan ke 1.0-2.2)
2. [x] Gelombang kelelawar: mulai malam 2, banner peringatan dulu, lalu 5-8 kelelawar datang bareng. 1 gelombang di malam 2-3, 2 di malam 4-5. (live: banner muncul, 5+ kelelawar tiba sekaligus)
3. [x] Hujan Kunang Emas: mulai malam 3, sekali per malam, 5 kunang emas sekaligus + banner kecil. Aturan emas tetap (jatuh 1.5x, skor 5x, kelelawar memburunya dulu). (live: banner + 4+ emas di layar)
4. [x] Spektakel kombo lewat tier game-feel: satu `feedback(tier, pos)` untuk semua event. Kombo x5 = medium, x10 = large, save emas = large, boss kena kilau = large, kena kelelawar = large + flash merah. Save biasa tetap small. Hit-stop tidak pernah ditumpuk; flash amber dibatasi 3/detik. Pop lentera pakai back ease-out dan kembali tepat ke 1. (unit: double large 30ms -> timeScale kembali 1.0, trauma 0 dalam 1/decay, pop berakhir tepat 1; live: milestone x5/x10 menyala, save emas tetap 5x)
5. [x] Toggle goyangan layar (G): 100% / 50% / 0%, tercantum di layar judul. (live: G bersiklus 1 -> 0.5 -> 0 -> 1)
6. [x] Screenshot baru: 2-wave.jpg (momen gelombang yang padat) menggantikan 2-boss.jpg; 1-start, 3-upgrade, 4-end di-render ulang dari kode baru. Tepat 4, masing-masing <=256 KiB. (54 KB, 51 KB, 58 KB, 52 KB; deterministik: render 2x byte-identik; 2-boss.jpg lama pindah ke screenshots-old/)

## Anti-pilar

- Jangan ubah kontrol yang ada (panah/mouse, Spasi, P, M, Enter, R); G hanya menambah toggle.
- Jangan buat malam 1 lebih susah; jangan ubah durasi malam.
- Jangan tambah aset gambar (tetap canvas prosedural, nol aset AI).
- Jangan ubah boss, upgrade, 3 jenis kelelawar, kunang emas, atau struktur 5 malam.
- Jangan over-juice aksi rutin: save biasa tetap small tier, tanpa hit-stop dan tanpa flash.

## Handover (diisi di akhir)

- Yang lolos: semua 6 item rame pass; unit baru 35/35 + unit lama 33/33; live 42/42 tanpa error konsol/page (semua ?shot= render, G bersiklus, malam 1 tetap tenang dan bot bertahan, gelombang + hujan menyala, milestone x5/x10 menyala, save emas tetap 5x, boss kalah -> fajar, game over); screenshot tepat 4 di bawah 58 KB dan deterministik; staging main.ts exit 0, dossier menyebut gelombang/hujan/kombo/feedback/shake.
- Yang masih rusak: bulan sabit masih render seperti cakram gelap menimpa halo (sudah begitu sejak v2, bukan regresi; tidak disentuh). Satu kelelawar gelombang di screenshot 2-wave.jpg bertumpuk di atas bulan. Siluet jenis kelelawar beda dari dekat tapi kecil di layar; di ukuran contact sheet bedanya kebanyakan ukuran + kecepatan.
- Yang ditebak: tarif spawn malam 2-5 (angka dari rasa, belum playtest manusia; bat rate sudah dinaikkan sekali setelah pengukuran live membuktikan 0.7/dtk terlalu sepi); aturan kombo hilang -1 per kunang jatuh (baru di putaran ini, supaya milestone tetap bisa dicapai di layar padat); campuran gelombang dan titik hujan (40-70% malam) belum diuji manusia; bot headless bukan pemain manusia.
- Not yet played by a person.

---

# Kunang — Round 5 Visual Overhaul (di atas rame pass)

Premis (kata-kata Arya): game top terlihat seperti "game game asli yg niat", lebih ke aset-asetnya yang bagus. Juri best-game-01 tidak pernah memainkan game, dia menilai dari 4 screenshot + outline source, jadi putaran ini murni visual: sprite v2 menjadi art yang dirender game. Gameplay LOGIC tidak disentuh sama sekali.

Skill yang dipakai: `game_asset_delivery` (mulai dari referensi nyata, cek logika sebelum gaya, label jujur, revisi = nama baru berversi), `awesome-gamedev-agent-skills/skills/disciplines/create-game-assets` (frame teknis terkunci, keluarga aset, validasi di skala asli, provenance dicatat), `.../disciplines/game-feel` (tier juice yang sudah ada, tidak ditambah), plus antislop-ui + design-taste-frontend + game-studio-workflow.

Provenance (jujur): sprite v2 di `~/workspace/makefun/kunang-sprites/` adalah PNG prosedural yang dipoles dari referensi FOTO nyata (siluet kelelawar, palem malam, lampu minyak, close-up kunang), BUKAN AI-generated, dan BUKAN art final gambar tangan. Kelasnya placeholder prosedural yang dipoles, bukan art final. File sumber v2 tidak ditimpa; halo kilau turunan (`pulse-halo-v2.png`) dibuat baru dari `lantern-pulse-v2.png` dengan kotak lentera dihapus.

Anti-pilar putaran rame yang sengaja DILANGGAR (disetujui Arya 2026-11-17 20:52 WIB, "Gas, round 5 visual"): "Jangan tambah aset gambar (tetap canvas prosedural)". Putaran ini menambah 15 PNG di `game/assets/` (total 312 KB, game/ tetap 414 KB, jauh di bawah cap 48 MiB / 993 file).

## Design read

Arcade malam kecil, "still, watchful, warm", satu aksen amber di atas indigo gelap, bahasa siluet datar ala buku cerita. Palet verbatim dari `config.js` (langit #0b1026→#131a3d→#1d2547, amber #ffb347, kunang #d8ff7a, mata kelelawar #ff4d4d). Sprite menggantikan gambar prosedural di tempat sprite jelas lebih bagus; glow/cone prosedural dipertahankan di tempat sprite kalah (cone cahaya, glow lentera, kabut, vignette, fajar).

## Yang dibangun (urut)

1. [x] Latar: `bg-sky-v2` (gradasi + bintang + bulan sabit yang benar) menggantikan gradasi prosedural di malam hari; fajar tetap prosedural (gradasi + matahari). `bg-trees-v2` dan `bg-grass-v2` digambar di atas bukit prosedural (bukit tetap di bawahnya, karena grass hanya pita rumput di bawah). Bintang/bulan prosedural dilewati saat sky sprite aktif.
2. [x] Bulan sabit DIPERBAIKI (akhirnya): fallback prosedural sekarang pakai satu path dua busur (lingkaran luar + lingkaran dalam berlawanan arah), bukan menimpa dengan warna langit. Bulan di `bg-sky-v2` sudah benar dari sumbernya. Bug cakram gelap sejak v2 hilang di semua frame.
3. [x] Kunang: trail ribbon sprite (diputar mengikuti kecepatan, kepala di kunang, panjang 14-70px) + badan dim (y<220, perspektif atmosfer) / bright. Kunang emas tetap prosedural penuh (emas tidak pernah jadi hijau). Cap trail naik 9 -> 18 supaya ribbon terbaca sebagai komet (visual only, tidak ada logika yang membaca trail).
4. [x] Kelelawar: sprite + flap squash vertikal (0.14, boss 0.08), fallback prosedural dipertahankan. Mapping: Swift -> bat-swift-v2 84px, Hunter -> bat-big-v2 96px, Tank -> bat-big-v2 150px (satu file, beda ukuran + kecepatan + perilaku), Boss -> bat-boss-v2 460px. Hitbox tidak berubah (dari config.js).
5. [x] Boss: sprite 460px + pip HP dipindah ke y-150 (di atas sprite, bukan -62). Fallback prosedural dipertahankan.
6. [x] Lentera: sprite lit 44x59 (footprint sama dengan badan vektor lama, cone dan radius save tetap sejajar); sprite off saat game over ("Lentera Padam" terlihat di gambar). Pop squash-and-stretch + blink invuln dipertahankan.
7. [x] Juice: halo kilau turunan `pulse-halo-v2.png` (kotak lentera dihapus, alpha tengah 3) mengembang 300->520px selama flash 1.4 dtk; sparkle-v2 untuk partikel emas, titik untuk sisanya. Glow lentera tetap gradasi prosedural (lebih bagus dari sprite glow).
8. [x] Boot async: `loadSprites()` sebelum frame pertama; `window.__kunangReady = true` setelah draw pertama; `window.__kunangSprites = Sprites`. Mode ?shot= menunggu load penuh; mode live mulai paling lambat 3 dtk (race timeout) supaya game tetap jalan kalau ada file yang macet. File gagal -> fallback prosedural, deterministik.
9. [x] Scene baru `?shot=shower` (malam 3, 5 kunang emas + banner "Hujan Kunang Emas!"). TIDAK dipakai di 4 screenshot yang dikirim: frame shower dibanding langsung dengan 2-boss dan kalah, kunang emasnya tersebar sebagai titik-titik kecil yang di ukuran contact sheet terbaca seperti kunang biasa, sementara frame boss menunjukkan boss + pip HP + aksi terpadat. Scene shower tetap ada di kode untuk ronde berikut.
10. [x] Screenshot baru (tepat 4, masing-masing <=256 KiB): 1-start (62.784 B), 2-boss (51.296 B), 3-upgrade (65.000 B), 4-end (79.404 B). Round-4 pindah ke screenshots-old/ dengan suffix -r4 (1-start-r4, 2-wave-r4, 3-upgrade-r4, 4-end-r4; file lama tidak ditimpa).

## Anti-pilar

- Jangan ubah logika gameplay: spawn rate, fisika, tabrakan, perilaku boss, upgrade, gelombang, hujan emas, aturan kombo, tier juice, toggle G, kontrol, durasi malam. (Satu-satunya sentuhan logika: cap trail 9 -> 18, visual only.)
- Jangan ubah palet (verbatim dari config.js).
- Jangan timpa file sumber sprite v2; revisi pakai nama baru berversi.
- Jangan rusak frame ?shot= yang sudah ada; semua tetap deterministik (render 2x byte-identik).

## Handover (diisi di akhir)

- Yang lolos: semua 10 item; unit baru 108/108 (`kunang-verify/unit-r5.mjs`: manifest 15 file + ukuran + RGBA, mapping kelelawar + urutan lebar, geometri bulan, invariansi logika 33/33+35/35 yang dibuat ulang ringkas, smoke test 7 scene ?shot=); live 33/33 tanpa error konsol/page/request (`kunang-verify/live-r5.py`: 7 shot deterministik + semua sprite termuat, title -> malam 1 -> G bersiklus 1->0.5->0->1 -> malam 5 -> boss kalah 3 kilau -> fajar -> restart -> game over); staging `MAKEFUN_OUTPUT_DIR=/tmp/kunang-out node main.ts` exit 0, 28 file game (414 KB), dossier menyebut visual overhaul + 56x sprite; 4 screenshot dilihat penuh di ukuran asli.
- Yang masih rusak: kanopi bundar masih seperti awan/lolipop dari jauh (di 4-end paling jelas); palem masih seperti pinwheel dari jauh; sayap kelelawar gelap, urat sayap hanya kelihatan dari dekat, di ukuran contact sheet kelelawar terbaca sebagai siluet hitam + mata merah; bulan di 3-upgrade bertumpuk di belakang teks "kilau" (masih terbaca); kartu upgrade punya ruang kosong besar di bawah deskripsi; teks "Tekan R..." di 4-end menimpa batang palem (terbaca tapi berisik); kunang emas di frame shower tersebar, tidak terbaca sebagai hujan (alasan tidak dipakai).
- Yang ditebak: lebar sprite kelelawar (84/96/150/460) dari rasa supaya terbaca di contact sheet, bukan dari pengukuran; halo kilau 300->520px dari rasa; urutan G dan semua aturan gameplay tidak disentuh, jadi tidak perlu ditebak ulang.
- Not yet played by a person.
