# Hidup Ngepas

Simulator realita finansial Gen Z. Next.js 14 (App Router) + Tailwind 3 + Zustand + Framer Motion + GSAP.
Semua dihitung di browser. Satu-satunya yang keluar: angka ringkas kartu hasil ke `/api/og` milik sendiri (tidak disimpan/di-log); nominal rupiah hanya ikut kalau user menyalakan "Tampilkan nominal gaji".

## Perintah

```bash
npm run dev        # dev server
npm run typecheck  # tsc --noEmit, wajib bersih sebelum commit
npm test           # Vitest: konsistensi angka antar scene, swipe, deep-link
npm run build
```

Belum ada ESLint di repo; `next build` hanya mengecek tipe.

## Struktur

- `lib/simulasi.ts` — modul MURNI (tanpa `'use client'`): tipe, `ASUMSI`, dataset (kota, gaya hidup, persona, scene, `STATISTIK`), dan semua rumus. Aman diimpor dari server dan di-unit-test (`tests/`).
  - **`hitungSimulasi(input, whatIf?)` = satu-satunya pintu hitung.** Struk, jalur 05b/05c, timeline, kartu, dan template anggaran memakai hasilnya (hook `useSimulasi()`). Jangan menghitung ulang angka di komponen.
  - Kartu hasil & persona dihitung dari struk FINAL (setelah sobekan) + proyeksi dasar (tanpa what-if), jadi sama dengan timeline.
  - Logika yang bisa dites juga tinggal di sini: `terapkanSwipe/terapkanUndo` (swipe hanya berlaku untuk kartu yang tampil), `sceneYangBoleh` (aturan deep-link), `slipSetoran`, `bebanPaylater`, `urlKartu` (URL /api/og yang sama untuk prefetch & tampilan).
- `store/useSimulationStore.ts` — store Zustand + hook turunan (`useMonthly()`, `useProjection()`, ...). Me-re-export seluruh `lib/simulasi.ts`, jadi komponen cukup impor dari store. **Kode server (route) wajib impor dari `lib/simulasi.ts`**: impor dari modul `'use client'` di server hanya menghasilkan referensi klien.
- `app/api/og/route.tsx` — kartu hasil 9:16 (1080×1920) via `next/og`, edge runtime. Di-prefetch dari scene 07.
- `app/opengraph-image.tsx`, `app/hasil/[persona]/` — gambar OG 1200×630 bertema struk (`lib/og-struk.tsx`) dan halaman share per persona (tanpa nominal). Metadata OG/Twitter di `app/layout.tsx` (`metadataBase` dari `NEXT_PUBLIC_SITE_URL`).
- `lib/og-font.ts` — font semua gambar `next/og` dibundel dari `@fontsource` (.woff; Satori belum dukung woff2). Jangan kembali ke Google Fonts: build Vercel pernah gagal karenanya. Gambar `next/og` pakai `runtime = 'edge'` (literal, bukan re-export): runtime Node bermasalah di path Windows berspasi.
- `components/providers/SceneRouter.tsx` — rehidrasi localStorage + sinkron scene ↔ hash URL.
- `components/providers/SmoothScroll.tsx` — Lenis + ScrollTrigger dalam satu ticker GSAP, plus deteksi hemat kuota. `lib/lenis.ts` menyimpan instance-nya (`scrollKeAtas`, `kunciScroll`).
- `components/providers/MagneticCTA.tsx` — efek magnet semua `.tombol-cta` lewat event delegation (desktop saja).
- `components/scenes/SceneNN*.tsx` — satu file per scene.
- `components/ui/` — komponen yang dipakai ulang (RollingNumber, ChipSelector, MoneySlider, ProgressBar3Babak, ReceiptPrinter, KineticMarquee, IkonGaris).
- `lib/sound.ts` — bunyi ka-ching (Web Audio, tanpa file) dan getar.

## Keputusan desain (jangan diubah tanpa diskusi)

- **Satu scene tampil per waktu.** Scene aktif ada di Zustand (`scene`), disinkronkan dua arah dengan hash URL oleh `SceneRouter` (pushState saat maju, popstate saat back browser). Deep-link ke scene yang datanya belum lengkap dialihkan ke langkah paling awal yang belum diisi.
- **Yang disimpan ke localStorage** (`partialize`): jawaban user termasuk `tornIds` (sobekan struk) dan preferensi. `whatIf` sengaja tidak. Mengubah sobekan, gaji, status, atau kota mengosongkan `paylaterChoice`.
- **Transisi scene = crossfade** (`AnimatePresence mode="popLayout"` di `page.tsx`), bukan "wait": tidak boleh ada layar kosong di antara scene. `<main>` hanya `relative`, tanpa z-index.
- **Store pakai `skipHydration`.** localStorage hanya dibaca setelah mount (di SceneRouter) supaya HTML server = client. UI yang bergantung pada data tersimpan dijaga dengan `hasHydrated`.
- **Dataset kota dan harga gaya hidup masih PLACEHOLDER**, bukan data BPS/UMK. Bentuk datanya sudah final; ganti angkanya saja sebelum rilis.
- **Semua asumsi proyeksi ada di objek `ASUMSI`** di store. Ubah angka di sana, bukan di rumus.
- **Warna:** teks kecil pakai `minus-teks` / `aman-teks` (lolos kontras AA di atas kertas). Warna asli `minus` / `aman` hanya untuk blok warna, ikon, dan angka besar. Hijau `aman` asli di atas kertas tidak lolos kontras: kalau dipakai untuk angka, jadikan blok dengan teks `tinta`. `neon` khusus CTA, selalu dengan teks tinta.
- **Tone copy:** lo-gue, satir tapi empatik. Boleh nyindir gaya hidup, jangan nyindir orangnya.
- **Gerak:** hormati `prefers-reduced-motion` (Framer: `MotionConfig reducedMotion="user"` / `useReducedMotion`; GSAP: cek `matchMedia` dan lewati animasi; CSS: blok reduced-motion di `globals.css`).
- **Mode hemat kuota:** `<html data-hemat-kuota>` mematikan tekstur dan elemen `[data-berat]`. Jangan tambah aset berat tanpa jalur hemat kuota.
- **Dompet hero masih 2D** (SVG + transform). Versi 3D (R3F) menyusul, di-lazy-load ke slot `data-berat-slot="wallet-3d"`.
- **Estetika "Tactile Editorial & Kinetic Receipt":** grain kertas statis di atas segalanya (`.grain` di layout), marquee mono raksasa di latar (`z-[-1]`) yang arah & kecepatannya ikut scroll, CTA dengan bayangan brutalist `4px 4px 0` yang memendek + gepeng saat ditekan.
- **Desktop "Meja Kasir" (`lg:`):** scene pakai `.scene.scene-split` dengan `.kolom-kiri` (5 kolom, sticky: judul editorial + monitor/ledger) dan `.kolom-kanan` (7 kolom: interaksi + `.zona-jempol`). Di bawah 1024px keduanya `display: contents`, jadi urutan DOM = urutan mobile; jangan bungkus ulang isinya. Hero pakai varian `.poster` (7/5). Scene 06 tidak split (pin horizontal), header-nya grid 12 sendiri.
- **Utilitas taktil** (di `globals.css`): `.judul-editorial`, `.mikro` (label 10px mono), `.ledger` (+ `.kode`, `.nilai`), `.selotip` dan `.stempel` (rotasi lewat `--putar`), `.struk-intip`. Pakai ini, jangan bikin varian baru per scene. `components/ui/MejaKasir.tsx` = monitor kasir kolom kiri scene 02–04.
- **Kursor konteks:** `components/providers/KursorKonteks.tsx` membaca `data-kursor="GESER"` dsb. lewat event delegation (hanya pointer fine ≥1024px). Elemen interaktif baru cukup diberi atribut itu.
- **Denah kavling (scene 06)** dan luas m²-nya ILUSTRASI turunan `skalaRumah`, bukan data harga per meter. **Scene 05c** = tumpukan 12 slip setoran (satu per bulan), bukan celengan.
- **Scroll:** Lenis hanya menghaluskan wheel; sentuhan di HP tetap native (`syncTouch: false`) supaya swipe kartu & slider aman. Pindah scene pakai `scrollKeAtas()`, bukan `window.scrollTo`.
- **ReceiptPrinter:** kertas dibuka dari atas lewat `clip-path` (kepala struk keluar duluan), ±62% keluar saat scene dibuka, sisanya di-scrub scroll di seluruh ruang scroll scene. Clip-path ditulis manual dari objek proxy: tween string clip-path di timeline scrub tidak jalan.
- **Jalur paylater:** kertas `#FFE5E6`. Merah `minus` asli hanya untuk angka besar & stempel; teks kecil di struk merah muda pakai `minus-teks` (`#E5383B` di atas `#FFE5E6` cuma 3,5:1). Nama aplikasi pinjaman fiktif ("PinjamLancar+").
- **Stacking:** jangan beri z-index pada `<main>`: modal `fixed z-50` di dalam scene harus bisa menutupi header `z-40`.
- **Animasi GSAP** selalu di dalam `gsap.context()` dan di-revert saat unmount. Kalau hasil akhir animasi harus bertahan setelah state berubah (klimaks 05b), simpan context di ref dan revert hanya saat unmount.
- **Babak 3 = scene 06–09** (timeline, bareng, kartu, aksi).
- **What-if "jajan dikurangi"** adalah persen (`jajanHematPct`, 0–100) yang memotong semua gaya hidup rata, bukan cuma kopi.
- **GSAP pin di dalam `.scene`** (flex): selalu set `pinSpacing: true`, kalau tidak GSAP mematikannya otomatis dan tidak ada ruang scroll.
- **Grafik bermakna** (DotGrid, dsb.) butuh kontras ≥ 3:1 dengan kertas: jangan pakai `neon` sebagai warna isi grafik.
- **Angka statistik scene 07, tautan OJK, dan nomor layanan konseling** belum dicek ulang ke sumber resmi (lihat komentar ⚠️ di kode). Wajib diverifikasi sebelum rilis.
- **Emoji:** hindari emoji Unicode 13+ (contoh 🧋), karena tampil sebagai kotak kosong di Windows 10. Chip status & kartu gaya hidup sudah memakai `IkonGaris`; ikon baru sebaiknya ditambahkan ke sana.
- **Periode sumber statistik tidak boleh ditebak.** `STATISTIK[].periode` = null sampai dicek ke rilis resmi; UI menulis "periode belum diverifikasi".
- **Timeline sampai umur 70** (= rentang hitungan). Kalau sisa sekarang belum plus, ada milestone 0 "Sisa mulai plus" (`umurSisaPlus`) dan satu kalimat soal asumsi kenaikan gaji.

## Konvensi

- Nama variabel, komentar, dan copy dalam Bahasa Indonesia; ikuti gaya file yang sudah ada.
- Selector Zustand yang mengembalikan objek baru harus pakai `useShallow` + `useMemo` (lihat hook turunan di store), kalau tidak render loop.
- Tiap scene punya satu judul dengan `data-judul-scene` + `tabIndex={-1}`: `page.tsx` memfokuskannya saat pindah scene.
- Tombol utama scene ditaruh di `.zona-jempol` (menempel di bawah).
