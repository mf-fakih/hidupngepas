/**
 * Hidup Ngepas — tipe, asumsi, dataset, dan seluruh rumus simulasi.
 *
 * Modul MURNI: tanpa React, tanpa 'use client'. Jadi bisa diimpor dari server
 * (route /api/og) dan di-unit-test. State & hook ada di store/useSimulationStore.ts,
 * yang me-re-export semua isi file ini.
 *
 *   1. Tipe & konstanta asumsi
 *   2. Dataset: status, kota, gaya hidup, persona, scene, statistik
 *   3. Fungsi hitung murni
 */

/* ================================================================== */
/* 1. TIPE & ASUMSI                                                    */
/* ================================================================== */

export type Status = 'sekolah' | 'kuliah' | 'kerja' | 'cari-kerja';

export type CityId =
  | 'jakarta'
  | 'bandung'
  | 'surabaya'
  | 'medan'
  | 'bandar-lampung'
  | 'yogyakarta'
  | 'makassar'
  | 'lainnya';

export type LifestyleId =
  | 'kopi-susu'
  | 'streaming'
  | 'konser'
  | 'sepatu-lari'
  | 'hp-baru'
  | 'nongkrong'
  | 'skincare'
  | 'ojol';

export type PaylaterChoice = 'cairkan' | 'tolak' | null;

export type PersonaId =
  | 'sultan-paylater'
  | 'pejuang-lamaran'
  | 'penabung-diam-diam'
  | 'sultan-lokal'
  | 'tim-tanggal-tua'
  | 'si-paling-ngepas';

export type SceneId =
  | 'hero'
  | 'kenalan'
  | 'gaji'
  | 'gaya-hidup'
  | 'struk'
  | 'cairkan'
  | 'paylater'
  | 'nabung'
  | 'timeline'
  | 'bareng'
  | 'kartu'
  | 'aksi';

/** 'sisa-plus' = milestone 0: hanya muncul kalau SISA sekarang belum plus */
export type MilestoneId = 'sisa-plus' | 'dana-darurat' | 'nikah' | 'dp-rumah' | 'pensiun';

/** Semua angka yang "diputuskan", bukan diukur. Ubah di sini, bukan di rumus. */
export const ASUMSI = {
  GAJI_MAKS: 15_000_000,
  /** Rata-rata upah usia 20–24 (sumber di dokumen spesifikasi) */
  UPAH_RATA_20_24: 2_720_000,

  /** Tanpa komitmen nabung, separuh sisa dianggap "bocor halus" (jajan, admin, parkir, dst.) */
  RASIO_NABUNG_DEFAULT: 0.5,
  /** Proyeksi dihitung dalam nilai rupiah hari ini, jadi semua laju di bawah = di atas inflasi */
  KENAIKAN_GAJI_RIIL: 0.02,
  IMBAL_HASIL_RIIL: 0.02,
  /** Rentang input umur di scene 02 (target: pelajar SMA sampai pekerja muda) */
  UMUR_MIN: 15,
  UMUR_MAKS_INPUT: 35,
  UMUR_MAKS_SIMULASI: 70,
  /** Sama dengan rentang hitungan: judul timeline tidak boleh menjanjikan rentang lain */
  UMUR_AKHIR_TIMELINE: 70,

  DANA_DARURAT_BULAN: 3,
  BIAYA_NIKAH: 50_000_000,
  DP_RUMAH_PERSEN: 0.2,
  /** Dana pensiun = sekian tahun kebutuhan pokok */
  PENSIUN_TAHUN: 20,

  PAYLATER_LIMIT: 5_000_000,
  PAYLATER_TENOR: 12,
  /** Bunga flat per bulan dari pokok awal */
  PAYLATER_BUNGA: 0.0295,
  /** Denda per bulan dari tagihan yang telat */
  PAYLATER_DENDA: 0.05,
  /** Biaya admin/layanan flat tiap tagihan (ilustrasi) */
  PAYLATER_ADMIN: 15_000,

  /** Batas atas slider "mulai nabung rutin" di scene 06 */
  NABUNG_SLIDER_MAKS: 3_000_000,
} as const;

export interface WhatIf {
  /** "Kalau gaji naik X%" — 0 sampai 100 */
  raisePct: number;
  /** "Kalau kopi susu / jajan dikurangi X%" — 0 sampai 100, memotong semua gaya hidup rata */
  jajanHematPct: number;
  /** "Kalau mulai nabung Rp X/bulan" — null = belum komit, pakai RASIO_NABUNG_DEFAULT */
  nabungPerBulan: number | null;
}

export const WHAT_IF_AWAL: WhatIf = { raisePct: 0, jajanHematPct: 0, nabungPerBulan: null };

/** Input minimum supaya simulasi bisa dihitung */
export interface SimulationInput {
  status: Status;
  cityId: CityId;
  age: number;
  income: number;
  /** Item gaya hidup yang di-swipe kanan */
  lifestyleIds: LifestyleId[];
  /** Item yang sedang "disobek" dari struk (dikeluarkan sementara) */
  tornIds: LifestyleId[];
  paylaterChoice: PaylaterChoice;
}

/* ================================================================== */
/* 2. DATASET                                                          */
/* ================================================================== */

interface StatusInfo {
  id: Status;
  label: string;
  /** Label dinamis di scene 03 */
  incomeLabel: string;
  umurDefault: number;
  /** Pengali biaya pokok. Anak sekolah diasumsikan masih tinggal dengan orang tua. */
  pengali: { kos: number; makan: number; transport: number; pulsa: number };
}

export const STATUS: Record<Status, StatusInfo> = {
  sekolah: {
    id: 'sekolah',
    label: 'Sekolah',
    incomeLabel: 'Uang saku per bulan',
    umurDefault: 17,
    pengali: { kos: 0, makan: 0.4, transport: 0.6, pulsa: 1 },
  },
  kuliah: {
    id: 'kuliah',
    label: 'Kuliah',
    incomeLabel: 'Uang saku per bulan',
    umurDefault: 20,
    pengali: { kos: 1, makan: 1, transport: 0.7, pulsa: 1 },
  },
  kerja: {
    id: 'kerja',
    label: 'Kerja',
    incomeLabel: 'Gaji lo per bulan',
    umurDefault: 24,
    pengali: { kos: 1, makan: 1, transport: 1, pulsa: 1 },
  },
  'cari-kerja': {
    id: 'cari-kerja',
    label: 'Lagi cari kerja',
    incomeLabel: 'Penghasilan sampingan',
    umurDefault: 23,
    pengali: { kos: 1, makan: 0.9, transport: 0.6, pulsa: 1 },
  },
};

export const STATUS_LIST: StatusInfo[] = [
  STATUS.sekolah,
  STATUS.kuliah,
  STATUS.kerja,
  STATUS['cari-kerja'],
];

export interface City {
  id: CityId;
  nama: string;
  /** Biaya bulanan satu orang, gaya hidup sederhana */
  kos: number; // kamar kos + listrik
  makan: number;
  transport: number;
  pulsa: number; // pulsa + paket data
  /** Harga rumah tapak sederhana di pinggiran kota, untuk hitung DP */
  hargaRumah: number;
}

/**
 * ⚠️ PLACEHOLDER — angka di bawah adalah estimasi kasar untuk pengembangan,
 * BELUM bersumber dari BPS (Survei Biaya Hidup) atau UMK 2026.
 * Sesuai "Langkah Berikutnya" no. 2 di spesifikasi, ganti dengan dataset final
 * sebelum rilis. Bentuk datanya sudah final, jadi cukup ganti angkanya.
 */
export const CITIES: Record<CityId, City> = {
  jakarta: {
    id: 'jakarta',
    nama: 'Jakarta',
    kos: 1_800_000,
    makan: 1_500_000,
    transport: 500_000,
    pulsa: 100_000,
    hargaRumah: 600_000_000,
  },
  bandung: {
    id: 'bandung',
    nama: 'Bandung',
    kos: 1_200_000,
    makan: 1_200_000,
    transport: 350_000,
    pulsa: 100_000,
    hargaRumah: 450_000_000,
  },
  surabaya: {
    id: 'surabaya',
    nama: 'Surabaya',
    kos: 1_200_000,
    makan: 1_200_000,
    transport: 350_000,
    pulsa: 100_000,
    hargaRumah: 450_000_000,
  },
  medan: {
    id: 'medan',
    nama: 'Medan',
    kos: 900_000,
    makan: 1_100_000,
    transport: 300_000,
    pulsa: 100_000,
    hargaRumah: 350_000_000,
  },
  'bandar-lampung': {
    id: 'bandar-lampung',
    nama: 'Bandar Lampung',
    kos: 750_000,
    makan: 1_000_000,
    transport: 250_000,
    pulsa: 100_000,
    hargaRumah: 300_000_000,
  },
  yogyakarta: {
    id: 'yogyakarta',
    nama: 'Yogyakarta',
    kos: 800_000,
    makan: 900_000,
    transport: 250_000,
    pulsa: 100_000,
    hargaRumah: 400_000_000,
  },
  makassar: {
    id: 'makassar',
    nama: 'Makassar',
    kos: 900_000,
    makan: 1_100_000,
    transport: 300_000,
    pulsa: 100_000,
    hargaRumah: 350_000_000,
  },
  lainnya: {
    id: 'lainnya',
    nama: 'Kota lainnya',
    kos: 700_000,
    makan: 900_000,
    transport: 250_000,
    pulsa: 100_000,
    hargaRumah: 300_000_000,
  },
};

export const CITY_LIST: City[] = [
  CITIES.jakarta,
  CITIES.bandung,
  CITIES.surabaya,
  CITIES.medan,
  CITIES['bandar-lampung'],
  CITIES.yogyakarta,
  CITIES.makassar,
  CITIES.lainnya,
];

export interface LifestyleItem {
  id: LifestyleId;
  /** Judul di kartu swipe */
  label: string;
  /** Nama di struk (gaya cetakan kasir) */
  labelStruk: string;
  emoji: string;
  hargaSatuan: number;
  kaliPerBulan: number;
  /** Cara hitungnya, ditampilkan kecil di kartu & di metodologi */
  rincian: string;
}

/** 8 kartu scene 04. Urutan array = urutan tumpukan kartu. */
export const LIFESTYLE_ITEMS: LifestyleItem[] = [
  {
    id: 'kopi-susu',
    label: 'Kopi susu tiap hari',
    labelStruk: 'KOPI SUSU',
    emoji: '☕',
    hargaSatuan: 20_000,
    kaliPerBulan: 26,
    rincian: 'Rp 20 rb × 26 hari',
  },
  {
    id: 'streaming',
    label: 'Langganan streaming',
    labelStruk: 'STREAMING',
    emoji: '📺',
    hargaSatuan: 60_000,
    kaliPerBulan: 2,
    rincian: 'Film + musik, Rp 60 rb × 2',
  },
  {
    id: 'konser',
    label: 'Nonton konser',
    labelStruk: 'TABUNGAN KONSER',
    emoji: '🎤',
    hargaSatuan: 1_500_000,
    kaliPerBulan: 2 / 12,
    rincian: '2 konser setahun, Rp 1,5 jt per tiket',
  },
  {
    id: 'sepatu-lari',
    label: 'Sepatu lari',
    labelStruk: 'SEPATU LARI',
    emoji: '👟',
    hargaSatuan: 1_800_000,
    kaliPerBulan: 1 / 12,
    rincian: 'Sepasang setahun, Rp 1,8 jt',
  },
  {
    id: 'hp-baru',
    label: 'HP baru tiap tahun',
    labelStruk: 'CICILAN HP BARU',
    emoji: '📱',
    hargaSatuan: 6_000_000,
    kaliPerBulan: 1 / 12,
    rincian: 'HP Rp 6 jt, ganti tiap 12 bulan',
  },
  {
    id: 'nongkrong',
    label: 'Nongkrong weekend',
    labelStruk: 'NONGKRONG',
    emoji: '🍜',
    hargaSatuan: 50_000,
    kaliPerBulan: 8,
    rincian: 'Rp 50 rb × 8 kali',
  },
  {
    id: 'skincare',
    label: 'Skincare routine',
    labelStruk: 'SKINCARE',
    emoji: '🧴',
    hargaSatuan: 300_000,
    kaliPerBulan: 1,
    rincian: 'Restock sebulan sekali',
  },
  {
    id: 'ojol',
    label: 'Ojol tiap hari',
    labelStruk: 'OJOL',
    emoji: '🛵',
    hargaSatuan: 15_000,
    kaliPerBulan: 40,
    rincian: 'Rp 15 rb × 2 trip × 20 hari',
  },
];

export const LIFESTYLE_BY_ID = Object.fromEntries(
  LIFESTYLE_ITEMS.map((item) => [item.id, item]),
) as Record<LifestyleId, LifestyleItem>;

export interface Persona {
  id: PersonaId;
  nama: string;
  emoji: string;
  /** Satu kalimat satir di kartu hasil */
  kalimat: string;
}

export const PERSONAS: Record<PersonaId, Persona> = {
  'sultan-paylater': {
    id: 'sultan-paylater',
    nama: 'Sultan Paylater',
    emoji: '💳',
    kalimat: 'Checkout-nya sekarang, pusingnya dicicil 12 bulan.',
  },
  'pejuang-lamaran': {
    id: 'pejuang-lamaran',
    nama: 'Pejuang Lamaran #237',
    emoji: '📨',
    kalimat: 'CV udah revisi ke-237, semangatnya masih versi pertama.',
  },
  'penabung-diam-diam': {
    id: 'penabung-diam-diam',
    nama: 'Penabung Diam-diam',
    emoji: '🐷',
    kalimat: 'Nggak pernah flexing, tau-tau dana daruratnya udah jadi.',
  },
  'sultan-lokal': {
    id: 'sultan-lokal',
    nama: 'Sultan Lokal',
    emoji: '👑',
    kalimat: 'Aman sih, tapi tetep ngecek saldo dulu sebelum bayar parkir.',
  },
  'tim-tanggal-tua': {
    id: 'tim-tanggal-tua',
    nama: 'Tim Tanggal Tua',
    emoji: '🗓️',
    kalimat: 'Tanggal tua lo mulai dari tanggal 5. Bukan salah lo doang, kok.',
  },
  'si-paling-ngepas': {
    id: 'si-paling-ngepas',
    nama: 'Si Paling Ngepas',
    emoji: '🧾',
    kalimat: 'Gajian tanggal 25, tanggal 26 udah nostalgia.',
  },
};

/* ---------- Statistik scene 07 ---------- */

export interface Statistik {
  id: 'nganggur' | 'upah' | 'utang';
  /** Nilai mentah untuk animasi count-up */
  nilai: number;
  /** Format tampilan dari nilai yang sedang dihitung */
  format: (n: number) => string;
  label: string;
  sumber: string;
  /**
   * Periode rilis, mis. "Agustus 2025". null = BELUM diverifikasi: UI menulisnya
   * terang-terangan. Isi hanya dari rilis resmi, jangan ditebak.
   */
  periode: string | null;
  /** Halaman lembaga sumber (ditampilkan di metodologi scene 09) */
  url: string;
}

/**
 * ⚠️ Angka di bawah berasal dari brief proyek, BELUM dicek ulang ke rilis resmi.
 * Cocokkan dengan publikasi BPS / OJK terbaru (periode & definisinya) sebelum rilis.
 */
export const STATISTIK: Statistik[] = [
  {
    id: 'nganggur',
    nilai: 17.5,
    format: (n) => `${n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    label: 'anak muda usia 15–24 tahun menganggur',
    sumber: 'BPS, Survei Angkatan Kerja Nasional (Sakernas)',
    periode: null, // ⚠️ isi dari rilis Sakernas yang dipakai
    url: 'https://www.bps.go.id',
  },
  {
    id: 'upah',
    nilai: ASUMSI.UPAH_RATA_20_24,
    format: (n) => `Rp ${(n / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} juta`,
    label: 'rata-rata upah pekerja muda usia 20–24 tahun',
    sumber: 'BPS, Survei Angkatan Kerja Nasional (Sakernas)',
    periode: null, // ⚠️ isi dari rilis Sakernas yang dipakai
    url: 'https://www.bps.go.id',
  },
  {
    id: 'utang',
    nilai: 150.8,
    format: (n) => `Rp ${n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} triliun`,
    label: 'total utang paylater & pinjol masyarakat',
    sumber: 'OJK, Statistik Fintech Lending & BNPL',
    periode: null, // ⚠️ isi dari rilis statistik OJK yang dipakai
    url: 'https://www.ojk.go.id',
  },
];

/** "Sumber: BPS, Sakernas, Agustus 2025" — atau jujur kalau periodenya belum dicek */
export function teksSumber(stat: Statistik): string {
  return `${stat.sumber}, ${stat.periode ?? 'periode belum diverifikasi'}`;
}

/**
 * Fakta ketiga dibuat personal: total yang harus dibayar kalau pinjaman paylater
 * tadi dicairkan, dibandingkan dengan gaji lo sendiri.
 *   bulanGaji  = total kewajiban ÷ penghasilan per bulan
 *   persenTahun = total kewajiban ÷ penghasilan setahun (dipakai grid 100 orang)
 * null kalau penghasilan 0 (tidak ada pembanding yang masuk akal).
 */
export function bebanPaylater(bulanan: Monthly) {
  const p = calcPaylater(bulanan.sisa);
  if (bulanan.income <= 0) return null;
  return {
    totalKewajiban: p.totalKewajiban,
    bulanGaji: p.totalKewajiban / bulanan.income,
    persenTahun: Math.min(100, Math.round((p.totalKewajiban / (bulanan.income * 12)) * 100)),
  };
}

export interface IncomeMode {
  id: 'mie-instan' | 'ngepas' | 'waswas' | 'sultan-lokal';
  label: string;
}

/** Ilustrasi di atas slider scene 03 */
export function getIncomeMode(income: number): IncomeMode {
  if (income < 1_000_000) return { id: 'mie-instan', label: 'mie instan mode' };
  if (income < 3_000_000) return { id: 'ngepas', label: 'ngepas mode' };
  if (income <= 7_000_000) return { id: 'waswas', label: 'aman tapi waswas' };
  return { id: 'sultan-lokal', label: 'sultan lokal' };
}

export interface Scene {
  id: SceneId;
  /** Hash URL: /#struk, /#timeline. Hero = tanpa hash. */
  hash: string;
  /** Segmen progress bar */
  babak: 1 | 2 | 3;
}

export const SCENES: Scene[] = [
  { id: 'hero', hash: '', babak: 1 }, // 01
  { id: 'kenalan', hash: 'profil', babak: 1 }, // 02 status & kota
  { id: 'gaji', hash: 'gaji', babak: 1 }, // 03
  { id: 'gaya-hidup', hash: 'gaya-hidup', babak: 1 }, // 04
  { id: 'struk', hash: 'struk', babak: 2 }, // 05
  { id: 'cairkan', hash: 'cairkan', babak: 2 }, // 05a
  { id: 'paylater', hash: 'paylater', babak: 2 }, // 05b
  { id: 'nabung', hash: 'nabung', babak: 2 }, // 05c
  { id: 'timeline', hash: 'timeline', babak: 3 }, // 06
  { id: 'bareng', hash: 'nggak-sendirian', babak: 3 }, // 07
  { id: 'kartu', hash: 'kartu', babak: 3 }, // 08
  { id: 'aksi', hash: 'aksi', babak: 3 }, // 09
];

export const SCENE_BY_ID = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<
  SceneId,
  Scene
>;

export function sceneFromHash(hash: string): SceneId {
  const bersih = hash.replace(/^#/, '');
  return SCENES.find((s) => s.hash === bersih)?.id ?? 'hero';
}

/* ================================================================== */
/* 3. FUNGSI HITUNG (murni)                                            */
/* ================================================================== */

export const bulatRibuan = (n: number) => Math.round(n / 1000) * 1000;
export const jepit = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function formatRupiah(n: number): string {
  const tanda = n < 0 ? '-' : '';
  return `${tanda}Rp ${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
}

/** "Rp 2,72 juta", "Rp 750 rb" — untuk tag kecil dan kartu statistik */
export function formatRupiahRingkas(n: number): string {
  const abs = Math.abs(n);
  const tanda = n < 0 ? '-' : '';
  const angka = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  if (abs >= 1_000_000_000) return `${tanda}Rp ${angka(abs / 1_000_000_000)} miliar`;
  if (abs >= 1_000_000) return `${tanda}Rp ${angka(abs / 1_000_000)} juta`;
  if (abs >= 1_000) return `${tanda}Rp ${angka(abs / 1_000)} rb`;
  return `${tanda}Rp ${abs}`;
}

export interface BarisStruk {
  id: string;
  label: string;
  nominal: number;
  /** Baris gaya hidup yang sedang disobek tetap dikirim (untuk animasi), tapi tidak dijumlah */
  disobek?: boolean;
}

/** Kebutuhan pokok: biaya kota × pengali status */
export function calcEssentials(status: Status, cityId: CityId) {
  const kota = CITIES[cityId];
  const p = STATUS[status].pengali;

  const baris: BarisStruk[] = [
    { id: 'makan', label: 'MAKAN', nominal: bulatRibuan(kota.makan * p.makan) },
    { id: 'kos', label: 'KOS + LISTRIK', nominal: bulatRibuan(kota.kos * p.kos) },
    { id: 'transport', label: 'TRANSPORT', nominal: bulatRibuan(kota.transport * p.transport) },
    { id: 'pulsa', label: 'PULSA + KUOTA', nominal: bulatRibuan(kota.pulsa * p.pulsa) },
  ].filter((b) => b.nominal > 0);

  return { baris, total: baris.reduce((t, b) => t + b.nominal, 0) };
}

/** Biaya bulanan satu item gaya hidup, sudah memperhitungkan what-if "jajan dikurangi" */
export function calcLifestyleItem(id: LifestyleId, whatIf: WhatIf = WHAT_IF_AWAL): number {
  const item = LIFESTYLE_BY_ID[id];
  const sisaJajan = 1 - jepit(whatIf.jajanHematPct, 0, 100) / 100;
  return bulatRibuan(item.hargaSatuan * item.kaliPerBulan * sisaJajan);
}

/** Gaya hidup: hasil swipe kanan, dikurangi yang disobek */
export function calcLifestyle(
  lifestyleIds: LifestyleId[],
  tornIds: LifestyleId[] = [],
  whatIf: WhatIf = WHAT_IF_AWAL,
) {
  // Urut sesuai LIFESTYLE_ITEMS supaya struk konsisten, apa pun urutan swipe-nya
  const baris: BarisStruk[] = LIFESTYLE_ITEMS.filter((item) => lifestyleIds.includes(item.id)).map(
    (item) => ({
      id: item.id,
      label: item.labelStruk,
      nominal: calcLifestyleItem(item.id, whatIf),
      disobek: tornIds.includes(item.id),
    }),
  );

  return {
    baris,
    total: baris.reduce((t, b) => (b.disobek ? t : t + b.nominal), 0),
  };
}

export interface Monthly {
  income: number;
  pokok: ReturnType<typeof calcEssentials>;
  gayaHidup: ReturnType<typeof calcLifestyle>;
  /** pokok + gaya hidup */
  total: number;
  /** income − total. Negatif = minus. */
  sisa: number;
  isMinus: boolean;
  /** % penghasilan yang habis untuk gaya hidup (bisa > 100) */
  lifestylePct: number;
  /** % penghasilan yang tersisa (negatif kalau minus) */
  sisaPct: number;
  mode: IncomeMode;
}

/**
 * RUMUS INTI
 *   penghasilan = gaji × (1 + kenaikan what-if)
 *   total       = kebutuhan pokok(kota, status) + gaya hidup(swipe − sobek)
 *   SISA        = penghasilan − total
 */
export function calcMonthly(input: SimulationInput, whatIf: WhatIf = WHAT_IF_AWAL): Monthly {
  const income = Math.round(input.income * (1 + whatIf.raisePct / 100));
  const pokok = calcEssentials(input.status, input.cityId);
  const gayaHidup = calcLifestyle(input.lifestyleIds, input.tornIds, whatIf);
  const total = pokok.total + gayaHidup.total;
  const sisa = income - total;

  // Penghasilan 0 tapi tetap jajan: tampilkan 100% daripada Infinity
  const pct = (bagian: number) =>
    income > 0 ? Math.round((bagian / income) * 100) : bagian > 0 ? 100 : 0;

  return {
    income,
    pokok,
    gayaHidup,
    total,
    sisa,
    isMinus: sisa < 0,
    lifestylePct: pct(gayaHidup.total),
    sisaPct: income > 0 ? Math.round((sisa / income) * 100) : sisa < 0 ? -100 : 0,
    mode: getIncomeMode(income),
  };
}

/**
 * Dari SISA, berapa yang benar-benar jadi tabungan?
 *   - sisa ≤ 0             → defisit apa adanya (menggerus saldo)
 *   - user komit Rp X      → X, maksimal sebesar sisa
 *   - belum komit          → separuh sisa (sisanya "bocor halus")
 */
export function calcNabungPerBulan(sisa: number, whatIf: WhatIf = WHAT_IF_AWAL): number {
  if (sisa <= 0) return sisa;
  if (whatIf.nabungPerBulan !== null) return Math.min(Math.max(whatIf.nabungPerBulan, 0), sisa);
  return Math.round(sisa * ASUMSI.RASIO_NABUNG_DEFAULT);
}

/* ---------- Jalur paylater (scene 05b) ---------- */

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export interface BarisPaylater {
  bulan: number; // 1–12
  namaBulan: string;
  pokok: number;
  bunga: number;
  admin: number;
  /** Denda bulan ini (0 kalau bayar tepat waktu) */
  denda: number;
  /** Total yang jatuh tempo bulan ini, termasuk tunggakan sebelumnya */
  tagihan: number;
  telat: boolean;
  /** Tunggakan + denda yang terbawa ke bulan depan */
  tunggakan: number;
}

export interface Paylater {
  baris: BarisPaylater[];
  dicairkan: number;
  totalBunga: number;
  totalAdmin: number;
  totalDenda: number;
  /** Pokok + bunga + admin + denda */
  totalKewajiban: number;
  bulanTelat: number;
  /** Ada telat bayar → tercatat di SLIK → KPR berisiko ditolak */
  slikBermasalah: boolean;
}

/**
 * Simulasi 12 bulan setelah "Cairkan".
 * Dana cair dipakai menambal defisit bulanan, jadi lama-lama habis juga.
 * Begitu kas tidak cukup untuk bayar tagihan → telat → kena denda → tunggakan menumpuk.
 * Ilustrasi, bukan tabel resmi produk mana pun.
 */
export function calcPaylater(sisaBulanan: number): Paylater {
  const { PAYLATER_LIMIT, PAYLATER_TENOR, PAYLATER_BUNGA, PAYLATER_DENDA, PAYLATER_ADMIN } = ASUMSI;
  const pokok = Math.round(PAYLATER_LIMIT / PAYLATER_TENOR);
  const bunga = Math.round(PAYLATER_LIMIT * PAYLATER_BUNGA);

  let kas = PAYLATER_LIMIT;
  let tunggakan = 0;
  let totalDenda = 0;
  let bulanTelat = 0;

  const baris: BarisPaylater[] = [];
  for (let i = 0; i < PAYLATER_TENOR; i++) {
    kas += sisaBulanan; // sisa minus → kas terkikis
    const tagihan = pokok + bunga + PAYLATER_ADMIN + tunggakan;
    let denda = 0;
    let telat = false;

    if (kas >= tagihan) {
      kas -= tagihan;
      tunggakan = 0;
    } else {
      telat = true;
      bulanTelat++;
      denda = Math.round(tagihan * PAYLATER_DENDA);
      totalDenda += denda;
      tunggakan = tagihan + denda;
    }

    baris.push({
      bulan: i + 1,
      namaBulan: NAMA_BULAN[i % 12],
      pokok,
      bunga,
      admin: PAYLATER_ADMIN,
      denda,
      tagihan,
      telat,
      tunggakan,
    });
  }

  const totalBunga = bunga * PAYLATER_TENOR;
  const totalAdmin = PAYLATER_ADMIN * PAYLATER_TENOR;
  return {
    baris,
    dicairkan: PAYLATER_LIMIT,
    totalBunga,
    totalAdmin,
    totalDenda,
    totalKewajiban: PAYLATER_LIMIT + totalBunga + totalAdmin + totalDenda,
    bulanTelat,
    slikBermasalah: bulanTelat > 0,
  };
}

/* ---------- Proyeksi hidup (scene 06) ---------- */

export interface Milestone {
  id: MilestoneId;
  label: string;
  target: number;
  /** Umur saat tercapai. null = belum kekejar sampai umur 70. */
  umur: number | null;
}

export interface Projection {
  milestones: Milestone[];
  /** Umur bisa bayar DP rumah — angka kunci kartu hasil */
  umurDpRumah: number | null;
  hargaRumah: number;
  dpRumah: number;
  /** Tabungan bulan pertama (negatif = defisit) */
  nabungPerBulan: number;
  /**
   * Umur saat SISA bulanan pertama kali plus, karena asumsi gaji naik pelan.
   * = umur sekarang kalau sudah plus. null = tidak pernah plus sampai umur 70.
   */
  umurSisaPlus: number | null;
  /** Tabungannya cukup, tapi riwayat SLIK bikin KPR ditolak */
  kprDitolak: boolean;
  /** 0–1, untuk skala rumah 3D: makin cepat DP terkumpul, makin besar rumahnya */
  skalaRumah: number;
}

/**
 * PROYEKSI UMUR DP RUMAH (dan milestone lain)
 *
 * Simulasi bulan demi bulan dari umur sekarang sampai 70, dalam rupiah hari ini:
 *   1. Tiap awal tahun, penghasilan naik KENAIKAN_GAJI_RIIL. Pengeluaran tetap.
 *   2. saldo += tabungan bulan itu (lihat calcNabungPerBulan). Bisa negatif.
 *   3. Saldo positif dapat imbal hasil IMBAL_HASIL_RIIL / 12.
 *   4. Tujuan diisi berurutan: dana darurat → nikah → DP rumah → pensiun.
 *      Begitu saldo ≥ target, umur dicatat, saldo dikurangi target, lanjut tujuan berikutnya.
 *
 * Kalau user mencairkan paylater, saldo awal = −(bunga + denda): uang yang hilang
 * tanpa jadi apa-apa.
 *
 * Penyederhanaan yang disengaja: tidak menghitung cicilan KPR setelah DP,
 * biaya anak, atau kenaikan harga rumah di atas inflasi. Tulis di metodologi footer.
 */
export function projectLife(input: SimulationInput, whatIf: WhatIf = WHAT_IF_AWAL): Projection {
  const bulanan = calcMonthly(input, whatIf);
  const kota = CITIES[input.cityId];
  const dpRumah = Math.round(kota.hargaRumah * ASUMSI.DP_RUMAH_PERSEN);

  const paylater = input.paylaterChoice === 'cairkan' ? calcPaylater(bulanan.sisa) : null;

  const tujuan: { id: MilestoneId; label: string; target: number }[] = [
    {
      id: 'dana-darurat',
      label: 'Dana darurat terkumpul',
      target: bulanan.total * ASUMSI.DANA_DARURAT_BULAN,
    },
    { id: 'nikah', label: 'Nikah', target: ASUMSI.BIAYA_NIKAH },
    { id: 'dp-rumah', label: 'DP rumah', target: dpRumah },
    {
      id: 'pensiun',
      label: 'Pensiun',
      target: bulanan.pokok.total * 12 * ASUMSI.PENSIUN_TAHUN,
    },
  ];

  const umurTercapai: Partial<Record<MilestoneId, number>> = {};
  const totalBulan = Math.max(0, (ASUMSI.UMUR_MAKS_SIMULASI - input.age) * 12);

  let saldo = paylater ? -(paylater.totalBunga + paylater.totalAdmin + paylater.totalDenda) : 0;
  let income = bulanan.income;
  let idx = 0;

  for (let bulan = 1; bulan <= totalBulan && idx < tujuan.length; bulan++) {
    if (bulan > 1 && (bulan - 1) % 12 === 0) income *= 1 + ASUMSI.KENAIKAN_GAJI_RIIL;

    saldo += calcNabungPerBulan(income - bulanan.total, whatIf);
    if (saldo > 0) saldo *= 1 + ASUMSI.IMBAL_HASIL_RIIL / 12;

    while (idx < tujuan.length && tujuan[idx].target > 0 && saldo >= tujuan[idx].target) {
      umurTercapai[tujuan[idx].id] = Math.floor(input.age + bulan / 12);
      saldo -= tujuan[idx].target;
      idx++;
    }
  }

  // Sisa per bulan naik tiap tahun karena gaji naik, pengeluaran tetap
  let umurSisaPlus: number | null = null;
  for (let tahun = 0; input.age + tahun <= ASUMSI.UMUR_MAKS_SIMULASI; tahun++) {
    const sisaTahunIni = bulanan.income * (1 + ASUMSI.KENAIKAN_GAJI_RIIL) ** tahun - bulanan.total;
    if (calcNabungPerBulan(sisaTahunIni, whatIf) > 0) {
      umurSisaPlus = input.age + tahun;
      break;
    }
  }

  const milestones: Milestone[] = tujuan.map((t) => ({ ...t, umur: umurTercapai[t.id] ?? null }));
  // Milestone 0: kalau sekarang belum bisa nabung, tunjukkan kapan mulai bisa
  if (umurSisaPlus !== input.age) {
    milestones.unshift({ id: 'sisa-plus', label: 'Sisa mulai plus', target: 0, umur: umurSisaPlus });
  }

  const umurDpRumah = umurTercapai['dp-rumah'] ?? null;

  // Rumah penuh kalau DP terkumpul dalam ≤ 5 tahun, mengecil sampai 0,15 kalau tidak kekejar
  const tahunTunggu = umurDpRumah === null ? Infinity : umurDpRumah - input.age;
  const rentang = ASUMSI.UMUR_AKHIR_TIMELINE - input.age - 5;
  const skalaRumah =
    tahunTunggu === Infinity
      ? 0.15
      : jepit(1 - Math.max(0, tahunTunggu - 5) / Math.max(1, rentang), 0.15, 1);

  return {
    milestones,
    umurDpRumah,
    hargaRumah: kota.hargaRumah,
    dpRumah,
    nabungPerBulan: calcNabungPerBulan(bulanan.sisa, whatIf),
    umurSisaPlus,
    kprDitolak: paylater?.slikBermasalah ?? false,
    skalaRumah: Math.round(skalaRumah * 100) / 100,
  };
}

/** Untuk copy "Lo bisa DP rumah di umur 47. Kalau kurangin kopi, umur 41." */
export function compareWhatIf(input: SimulationInput, whatIf: WhatIf) {
  const dasar = projectLife(input, WHAT_IF_AWAL);
  const kalau = projectLife(input, whatIf);
  const selisihTahun =
    dasar.umurDpRumah !== null && kalau.umurDpRumah !== null
      ? dasar.umurDpRumah - kalau.umurDpRumah
      : null;
  return { dasar, kalau, selisihTahun };
}

/* ---------- Persona (scene 08) ---------- */

/**
 * LOGIKA PERSONA — dicek dari atas, yang pertama cocok menang.
 *   1. Mencairkan paylater                               → Sultan Paylater
 *   2. Lagi cari kerja                                   → Pejuang Lamaran #237
 *   3. Sisa ≥ 20% penghasilan & gaya hidup ≤ 20%         → Penabung Diam-diam
 *   4. Penghasilan > Rp 7 juta & nggak minus             → Sultan Lokal
 *   5. Minus                                             → Tim Tanggal Tua
 *   6. Sisanya (plus tipis)                              → Si Paling Ngepas
 *
 * Dihitung dari struk FINAL (setelah sobekan), sama dengan angka di kartu.
 * What-if di timeline tidak mengubah persona.
 */
export function determinePersona(input: SimulationInput): Persona {
  const b = calcMonthly(input);

  if (input.paylaterChoice === 'cairkan') return PERSONAS['sultan-paylater'];
  if (input.status === 'cari-kerja') return PERSONAS['pejuang-lamaran'];
  if (b.sisaPct >= 20 && b.lifestylePct <= 20) return PERSONAS['penabung-diam-diam'];
  if (b.income > 7_000_000 && !b.isMinus) return PERSONAS['sultan-lokal'];
  if (b.isMinus) return PERSONAS['tim-tanggal-tua'];
  return PERSONAS['si-paling-ngepas'];
}

export interface HasilKartu {
  persona: Persona;
  /** Penghasilan per bulan (untuk nominal opsional di kartu) */
  income: number;
  /** 3 angka kunci kartu hasil */
  sisa: number;
  /** Sisa dalam % penghasilan (negatif = minus) */
  sisaPct: number;
  umurDpRumah: number | null;
  lifestylePct: number;
  kprDitolak: boolean;
  /** Semua kartu di-swipe kanan → stiker "Lo main hidup mode hard ya" */
  modeHard: boolean;
}

/**
 * Kartu hasil = struk FINAL (setelah sobekan) + proyeksi dasar (tanpa what-if).
 * Angkanya identik dengan struk scene 05 dan proyeksi dasar timeline scene 06.
 */
export function buildResult(input: SimulationInput): HasilKartu {
  return hitungSimulasi(input).kartu;
}

/**
 * URL gambar kartu 9:16 di /api/og. Dipakai prefetch (scene 07) DAN tampilan
 * (scene 08), jadi string-nya identik dan cache browser/edge kena.
 * Nominal rupiah HANYA ikut kalau user menyalakan "Tampilkan nominal gaji".
 */
export function urlKartu(k: HasilKartu, tampilkanNominal: boolean): string {
  const q = new URLSearchParams({
    p: k.persona.id,
    sp: String(k.sisaPct),
    u: k.umurDpRumah === null ? '' : String(k.umurDpRumah),
    g: String(k.lifestylePct),
    h: k.modeHard ? '1' : '0',
    k: k.kprDitolak ? '1' : '0',
  });
  if (tampilkanNominal) {
    q.set('s', String(k.sisa));
    q.set('i', String(k.income));
  }
  return `/api/og?${q.toString()}`;
}

/* ---------- Sumber kebenaran tunggal ---------- */

export interface HasilSimulasi {
  bulanan: Monthly;
  /** null kalau user tidak mencairkan paylater */
  paylater: Paylater | null;
  /** Proyeksi dengan what-if (sama dengan dasar kalau what-if kosong) */
  proyeksi: Projection;
  /** Proyeksi tanpa what-if: dipakai kartu hasil */
  proyeksiDasar: Projection;
  kartu: HasilKartu;
}

/**
 * SATU-SATUNYA pintu hitung. Struk, jalur paylater/nabung, timeline, kartu,
 * dan template anggaran mengambil angka dari sini, jadi input yang sama
 * selalu menghasilkan angka yang sama di semua scene.
 */
export function hitungSimulasi(input: SimulationInput, whatIf: WhatIf = WHAT_IF_AWAL): HasilSimulasi {
  const bulanan = calcMonthly(input);
  const paylater = input.paylaterChoice === 'cairkan' ? calcPaylater(bulanan.sisa) : null;
  const proyeksiDasar = projectLife(input, WHAT_IF_AWAL);
  const proyeksi = whatIf === WHAT_IF_AWAL ? proyeksiDasar : projectLife(input, whatIf);

  return {
    bulanan,
    paylater,
    proyeksi,
    proyeksiDasar,
    kartu: {
      persona: determinePersona(input),
      income: bulanan.income,
      sisa: bulanan.sisa,
      sisaPct: bulanan.sisaPct,
      umurDpRumah: proyeksiDasar.umurDpRumah,
      lifestylePct: bulanan.lifestylePct,
      kprDitolak: proyeksiDasar.kprDitolak,
      modeHard: input.lifestyleIds.length === LIFESTYLE_ITEMS.length,
    },
  };
}

/* ---------- Jalur nabung (scene 05c) ---------- */

/**
 * Isi slip setoran di jalur "Nggak dulu".
 *   kosong  → SISA ≤ 0: tidak ada yang bisa disetor, slip tampil Rp 0
 *   setoran → tabungan bulan pertama, SAMA dengan yang dipakai proyeksi timeline
 */
export function slipSetoran(sim: HasilSimulasi): { kosong: boolean; setoran: number } {
  const kosong = sim.bulanan.sisa <= 0;
  return { kosong, setoran: kosong ? 0 : Math.max(0, sim.proyeksi.nabungPerBulan) };
}

/* ---------- Swipe kartu gaya hidup (scene 04) ---------- */

export interface StateSwipe {
  swipedIds: LifestyleId[];
  lifestyleIds: LifestyleId[];
  tornIds: LifestyleId[];
}

/** Kartu yang sedang tampil paling atas: item pertama yang belum di-swipe */
export function kartuBerikutnya(swipedIds: LifestyleId[]): LifestyleId | null {
  return LIFESTYLE_ITEMS.find((item) => !swipedIds.includes(item.id))?.id ?? null;
}

/**
 * Swipe hanya berlaku untuk kartu yang sedang tampil. Aksi yang datang terlambat
 * (klik beruntun, animasi lama selesai setelah undo) untuk kartu lain diabaikan.
 */
export function terapkanSwipe(s: StateSwipe, id: LifestyleId, arah: 'kanan' | 'kiri'): StateSwipe {
  if (id !== kartuBerikutnya(s.swipedIds)) return s;
  return {
    swipedIds: [...s.swipedIds, id],
    lifestyleIds: arah === 'kanan' ? [...s.lifestyleIds, id] : s.lifestyleIds,
    tornIds: s.tornIds,
  };
}

/** Balikin kartu terakhir: keluar dari swipe, gaya hidup, dan sobekan sekaligus */
export function terapkanUndo(s: StateSwipe): StateSwipe {
  const terakhir = s.swipedIds[s.swipedIds.length - 1];
  if (!terakhir) return s;
  return {
    swipedIds: s.swipedIds.slice(0, -1),
    lifestyleIds: s.lifestyleIds.filter((id) => id !== terakhir),
    tornIds: s.tornIds.filter((id) => id !== terakhir),
  };
}

/* ---------- Navigasi scene ---------- */

/** Jawaban tersimpan yang menentukan scene mana yang boleh dibuka lewat deep-link */
export interface JawabanAlur {
  status: Status | null;
  cityId: CityId | null;
  age: number;
  income: number;
  lifestyleIds: LifestyleId[];
  swipedIds: LifestyleId[];
  tornIds: LifestyleId[];
  paylaterChoice: PaylaterChoice;
}

/**
 * Deep-link ke scene yang datanya belum lengkap dialihkan ke langkah paling awal
 * yang belum diisi:
 *   status/kota kosong        → #profil
 *   kartu belum habis di-swipe → #gaya-hidup
 *   #cairkan saat sisa plus    → #struk (pop-up hanya muncul kalau minus)
 *   #paylater / #nabung tanpa pilihan yang cocok → #struk
 *   babak 3 saat minus tapi belum memilih paylater → #struk
 */
export function sceneYangBoleh(diminta: SceneId, s: JawabanAlur): SceneId {
  if (diminta === 'hero' || diminta === 'kenalan') return diminta;
  if (!s.status || !s.cityId) return 'kenalan';
  if (diminta === 'gaji' || diminta === 'gaya-hidup') return diminta;
  if (s.swipedIds.length < LIFESTYLE_ITEMS.length) return 'gaya-hidup';
  if (diminta === 'struk') return diminta;

  const minus = calcMonthly({ ...s, status: s.status, cityId: s.cityId }).isMinus;
  switch (diminta) {
    case 'cairkan':
      return minus ? diminta : 'struk';
    case 'paylater':
      return minus && s.paylaterChoice === 'cairkan' ? diminta : 'struk';
    case 'nabung':
      return minus && s.paylaterChoice === 'tolak' ? diminta : 'struk';
    default:
      return minus && s.paylaterChoice === null ? 'struk' : diminta;
  }
}

export interface KonteksNavigasi {
  isMinus: boolean;
  paylaterChoice: PaylaterChoice;
}

/** Percabangan sesuai peta alur: 05 → (minus? 05a → 05b/05c) → 06 */
export function getNextScene(scene: SceneId, ctx: KonteksNavigasi): SceneId {
  switch (scene) {
    case 'struk':
      return ctx.isMinus ? 'cairkan' : 'timeline';
    case 'cairkan':
      return ctx.paylaterChoice === 'cairkan' ? 'paylater' : 'nabung';
    case 'paylater':
    case 'nabung':
      return 'timeline';
    case 'aksi':
      return 'aksi';
    default: {
      const i = SCENES.findIndex((s) => s.id === scene);
      return SCENES[Math.min(i + 1, SCENES.length - 1)].id;
    }
  }
}

export function getPrevScene(scene: SceneId, ctx: KonteksNavigasi): SceneId {
  switch (scene) {
    case 'hero':
      return 'hero';
    case 'cairkan':
    case 'paylater':
    case 'nabung':
      return 'struk'; // pop-up tidak dimunculkan ulang saat mundur
    case 'timeline':
      if (!ctx.isMinus || ctx.paylaterChoice === null) return 'struk';
      return ctx.paylaterChoice === 'cairkan' ? 'paylater' : 'nabung';
    default: {
      const i = SCENES.findIndex((s) => s.id === scene);
      return SCENES[Math.max(i - 1, 0)].id;
    }
  }
}

