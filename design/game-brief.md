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
