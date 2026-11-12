'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getar } from '@/lib/sound';
import { ASUMSI, formatRupiah, useMonthly, useSimulationStore } from '@/store/useSimulationStore';

/**
 * ⚠️ Tautan & nomor layanan di bawah perlu dicek ulang sebelum rilis
 * (alamat situs lembaga bisa berubah).
 */
const TAUTAN = {
  ojkFintech: 'https://www.ojk.go.id/id/kanal/iknb/financial-technology/Default.aspx',
  sejiwa: 'tel:119,8', // koma = jeda, lalu ext. 8
  intoTheLight: 'https://www.intothelightid.org/',
};

/** Template anggaran dari penghasilan user sendiri: 50/30/20 dan versi ngepas 60/30/10 */
function templateAnggaran(income: number) {
  const r = (pct: number) => formatRupiah(Math.round((income * pct) / 100 / 1000) * 1000);
  return [
    `ANGGARAN 1 MENIT — penghasilan ${formatRupiah(income)}/bulan`,
    '',
    'VERSI 50/30/20',
    `[ ] Kebutuhan (kos, makan, transport)  50%  ${r(50)}`,
    `[ ] Keinginan (jajan, nongkrong)       30%  ${r(30)}`,
    `[ ] Tabungan & dana darurat            20%  ${r(20)}`,
    '',
    'VERSI NGEPAS 60/30/10 (kalau 50% nggak cukup buat kebutuhan)',
    `[ ] Kebutuhan                          60%  ${r(60)}`,
    `[ ] Keinginan                          30%  ${r(30)}`,
    `[ ] Tabungan, sekecil apa pun          10%  ${r(10)}`,
    '',
    'Tips: pindahin jatah tabungan di hari gajian, sebelum sempat kepake.',
    '— dari Hidup Ngepas',
  ].join('\n');
}

function KartuAksi({
  nomor,
  judul,
  isi,
  aksi,
}: {
  nomor: string;
  judul: string;
  isi: string;
  aksi: ReactNode;
}) {
  return (
    <article className="relative flex flex-col rounded-kartu border-[3px] border-tinta bg-kertas p-5 shadow-tombol lg:grid lg:grid-cols-[5rem_minmax(0,1fr)_15rem] lg:items-center lg:gap-x-6 lg:p-6">
      <p className="font-mono text-struk font-bold text-tinta-pudar lg:text-6xl lg:leading-none lg:tracking-tighter lg:text-tinta">
        {nomor}
      </p>
      <div>
        <h3 className="mt-1 font-display text-2xl font-bold leading-tight text-tinta lg:mt-0">{judul}</h3>
        <p className="mt-2 text-tinta">{isi}</p>
      </div>
      <div className="mt-4 lg:mt-0">{aksi}</div>
    </article>
  );
}

const KELAS_AKSI =
  'inline-flex min-h-sentuh w-full items-center justify-center gap-2 rounded-chip border-2 border-tinta bg-tinta px-4 py-3 font-display font-bold text-kertas';

/* ------------------------------------------------------------------ */
/* Footer: metodologi ID / EN                                          */
/* ------------------------------------------------------------------ */

const METODOLOGI = {
  id: [
    'SISA = penghasilan − (kebutuhan pokok kota × pengali status) − gaya hidup yang lo pilih.',
    `Proyeksi dihitung per bulan sampai umur ${ASUMSI.UMUR_MAKS_SIMULASI}, dalam nilai rupiah hari ini: gaji naik ${ASUMSI.KENAIKAN_GAJI_RIIL * 100}%/tahun di atas inflasi, tabungan tumbuh ${ASUMSI.IMBAL_HASIL_RIIL * 100}%/tahun riil. Tanpa komitmen nabung, separuh sisa dianggap bocor halus.`,
    `Milestone diisi berurutan: dana darurat (${ASUMSI.DANA_DARURAT_BULAN}× pengeluaran), nikah (${formatRupiah(ASUMSI.BIAYA_NIKAH)}), DP rumah (${ASUMSI.DP_RUMAH_PERSEN * 100}% harga rumah sederhana di kota lo), pensiun (${ASUMSI.PENSIUN_TAHUN} tahun kebutuhan pokok).`,
    `Paylater: limit ${formatRupiah(ASUMSI.PAYLATER_LIMIT)}, tenor ${ASUMSI.PAYLATER_TENOR} bulan, bunga flat ${(ASUMSI.PAYLATER_BUNGA * 100).toLocaleString('id-ID')}%/bulan, admin ${formatRupiah(ASUMSI.PAYLATER_ADMIN)}/tagihan, denda ${ASUMSI.PAYLATER_DENDA * 100}% dari tagihan telat. Ilustrasi, bukan produk tertentu.`,
    'Belum dihitung: cicilan KPR setelah DP, biaya anak, kenaikan harga rumah di atas inflasi. Biaya kota & harga gaya hidup masih estimasi kasar.',
  ],
  en: [
    'LEFTOVER = income − (city essentials × status multiplier) − the lifestyle items you picked.',
    `Projection runs month by month up to age ${ASUMSI.UMUR_MAKS_SIMULASI}, in today’s rupiah: salary grows ${ASUMSI.KENAIKAN_GAJI_RIIL * 100}%/year above inflation, savings earn ${ASUMSI.IMBAL_HASIL_RIIL * 100}%/year real. Without a saving commitment, half of the leftover is assumed to leak away.`,
    `Milestones fill in order: emergency fund (${ASUMSI.DANA_DARURAT_BULAN}× monthly spend), wedding, house down payment (${ASUMSI.DP_RUMAH_PERSEN * 100}% of a modest local house), retirement (${ASUMSI.PENSIUN_TAHUN} years of essentials).`,
    `Paylater: ${formatRupiah(ASUMSI.PAYLATER_LIMIT)} limit, ${ASUMSI.PAYLATER_TENOR}-month tenor, flat interest ${(ASUMSI.PAYLATER_BUNGA * 100).toLocaleString('en-US')}%/month, admin fee per bill, ${ASUMSI.PAYLATER_DENDA * 100}% late fee. An illustration, not any specific product.`,
    'Not included: mortgage payments after the down payment, kids, house prices rising faster than inflation. City costs and lifestyle prices are rough estimates.',
  ],
} as const;

function Footer() {
  const [bahasa, setBahasa] = useState<'id' | 'en'>('id');
  const resetAll = useSimulationStore((s) => s.resetAll);
  const goTo = useSimulationStore((s) => s.goTo);

  return (
    <footer className="mt-10 border-t-[3px] border-tinta pb-[calc(2rem+env(safe-area-inset-bottom,0px))] pt-6 text-tinta">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-xl font-bold">{bahasa === 'id' ? 'Cara ngitungnya' : 'How we calculate'}</h3>
        <div role="group" aria-label="Bahasa metodologi" className="flex rounded-chip border-2 border-tinta p-0.5">
          {(['id', 'en'] as const).map((b) => (
            <button
              key={b}
              type="button"
              lang={b}
              aria-pressed={bahasa === b}
              onClick={() => setBahasa(b)}
              className="min-h-[2.5rem] min-w-[2.75rem] rounded-chip px-3 font-mono text-sm font-bold uppercase aria-pressed:bg-tinta aria-pressed:text-kertas"
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <ul lang={bahasa} className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
        {METODOLOGI[bahasa].map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <h3 className="mt-6 font-display text-lg font-bold">{bahasa === 'id' ? 'Sumber data' : 'Data sources'}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        <li>BPS — Survei Angkatan Kerja Nasional (pengangguran & upah usia muda)</li>
        <li>OJK — Statistik fintech lending & paylater (BNPL)</li>
        <li>Kemenaker — upah minimum provinsi/kabupaten</li>
      </ul>
      <p className="mt-2 text-[0.75rem] text-tinta-pudar">
        {bahasa === 'id'
          ? 'Angka statistik & biaya kota masih perlu dicocokkan dengan rilis resmi terbaru.'
          : 'Statistics and city costs still need to be checked against the latest official releases.'}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-tinta/40 pt-4">
        <p className="font-mono text-struk">
          Hidup Ngepas · dibuat oleh mf-fakih
          <br />
          <span className="text-tinta-pudar">
            {bahasa === 'id' ? 'Dihitung di HP lo. Nggak ada login.' : 'Calculated on your phone. No login.'}
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            resetAll();
            goTo('hero');
          }}
          className="inline-flex min-h-sentuh items-center font-display text-sm font-medium underline underline-offset-4"
        >
          {bahasa === 'id' ? 'Hapus data & mulai dari nol' : 'Clear data & start over'}
        </button>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* 09 — Aksi Kecil                                                     */
/* ------------------------------------------------------------------ */

export function Scene09Actions() {
  const bulanan = useMonthly();
  const [toast, setToast] = useState<string | null>(null);
  const jedaToast = useRef<number>();

  useEffect(() => () => window.clearTimeout(jedaToast.current), []);

  const tampilkanToast = (teks: string) => {
    setToast(teks);
    window.clearTimeout(jedaToast.current);
    jedaToast.current = window.setTimeout(() => setToast(null), 2200);
  };

  const salinAnggaran = async () => {
    const teks = templateAnggaran(bulanan?.income ?? ASUMSI.UPAH_RATA_20_24);
    try {
      await navigator.clipboard.writeText(teks);
    } catch {
      // Clipboard API ditolak (http / izin): pakai cara lama
      const area = document.createElement('textarea');
      area.value = teks;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const berhasil = document.execCommand('copy');
      area.remove();
      if (!berhasil) {
        tampilkanToast('Gagal nyalin. Browser lo nolak akses clipboard.');
        return;
      }
    }
    getar(10);
    tampilkanToast('Tersalin!');
  };

  return (
    <section className="scene scene-split" aria-labelledby="judul-aksi">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
          Babak 3 — Penutup · Tiga langkah
        </p>
        <h2 id="judul-aksi" data-judul-scene tabIndex={-1} className="judul-editorial">
          Tiga hal kecil yang bisa lo lakuin hari ini.
        </h2>
        <p className="mt-2 text-tinta-pudar lg:mt-5 lg:max-w-[32ch] lg:text-lg lg:text-tinta">
          Nggak perlu semuanya sekaligus. Satu aja udah lebih dari nol.
        </p>
        <div aria-hidden className="mt-8 hidden lg:block">
          <div className="ledger border-t-2 border-t-tinta">
            <span className="kode">AKS-01</span>
            <span>CEK PINJOL</span>
            <span className="nilai">± 1 MENIT</span>
          </div>
          <div className="ledger">
            <span className="kode">AKS-02</span>
            <span>SALIN ANGGARAN</span>
            <span className="nilai">± 1 MENIT</span>
          </div>
          <div className="ledger">
            <span className="kode">AKS-03</span>
            <span>NGOBROL</span>
            <span className="nilai">KAPAN AJA</span>
          </div>
        </div>
      </div>

      <div className="kolom-kanan">
      <div className="mt-6 grid gap-5 lg:mt-0">
        <KartuAksi
          nomor="01"
          judul="Cek pinjol legal atau ilegal"
          isi="Sebelum klik “cairkan”, pastiin aplikasinya terdaftar dan berizin di OJK. Yang ilegal biasanya nagih pakai nyebar kontak."
          aksi={
            <a href={TAUTAN.ojkFintech} target="_blank" rel="noopener noreferrer" className={KELAS_AKSI}>
              Buka direktori OJK
              <span aria-hidden>↗</span>
              <span className="hanya-sr">(buka tab baru)</span>
            </a>
          }
        />
        <KartuAksi
          nomor="02"
          judul="Bikin anggaran 1 menit"
          isi={`Template 50/30/20 plus versi ngepas, udah diisi pakai penghasilan lo${
            bulanan ? ` (${formatRupiah(bulanan.income)})` : ''
          }. Tempel di Notes atau WhatsApp diri sendiri.`}
          aksi={
            <button type="button" onClick={salinAnggaran} className={KELAS_AKSI}>
              Salin template
            </button>
          }
        />
        <KartuAksi
          nomor="03"
          judul="Lagi berat? Ngobrol aja"
          isi="Duit bikin cemas itu wajar. Lo nggak harus mikirin sendirian. Ada layanan konseling yang bisa lo hubungi."
          aksi={
            <div className="grid gap-2">
              <a href={TAUTAN.sejiwa} className={KELAS_AKSI}>
                Telepon 119, ext. 8 (SEJIWA)
              </a>
              <a
                href={TAUTAN.intoTheLight}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-sentuh items-center justify-center font-display text-sm font-medium text-tinta underline underline-offset-4"
              >
                Daftar layanan lain (Into The Light) ↗<span className="hanya-sr">(buka tab baru)</span>
              </a>
            </div>
          }
        />
      </div>

      <Footer />
      </div>

      {/* Toast */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-50 flex justify-center px-5">
        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast}
              initial={{ y: -24, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 26 }}
              className="rounded-chip border-2 border-tinta bg-neon px-5 py-2.5 font-display font-bold text-tinta shadow-tombol"
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
