'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { kunciScroll } from '@/lib/lenis';
import { getar } from '@/lib/sound';
import { ASUMSI, formatRupiah, useMonthly, useSimulationStore } from '@/store/useSimulationStore';

/**
 * 05a — Godaan Fintech
 * Muncul tepat saat SISA minus: notifikasi ala sistem HP turun dari atas,
 * latar gelap ber-blur. Nama aplikasinya fiktif (bukan produk mana pun).
 * Esc = "Nggak dulu".
 */
export function Scene05aPaylaterModal() {
  const bulanan = useMonthly();
  const choosePaylater = useSimulationStore((s) => s.choosePaylater);
  const next = useSimulationStore((s) => s.next);
  const tombolTolak = useRef<HTMLButtonElement>(null);

  const pilih = (pilihan: 'cairkan' | 'tolak') => {
    getar(pilihan === 'cairkan' ? [10, 40, 10] : 8);
    choosePaylater(pilihan);
    next(); // getNextScene membaca paylaterChoice yang baru: cairkan → 05b, tolak → 05c
  };

  useEffect(() => {
    kunciScroll(true);
    getar([18, 60, 18]); // "bzzt bzzt" notifikasi masuk
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tombolTolak.current?.click();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      kunciScroll(false);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <section className="fixed inset-0 z-50" aria-label="Penawaran paylater">
      {/* Latar: SISA minus yang masih terbayang di balik blur */}
      <div aria-hidden className="absolute inset-0 grid place-items-center bg-kertas">
        <p className="font-mono text-[clamp(2.5rem,13vw,5rem)] font-bold text-minus lg:hidden">
          {bulanan ? formatRupiah(bulanan.sisa) : ''}
        </p>
      </div>
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-tinta/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      />

      <div className="relative mx-auto w-full max-w-scene px-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] lg:grid lg:h-full lg:max-w-[84rem] lg:grid-cols-12 lg:items-center lg:gap-x-14 lg:px-12 lg:pt-0">
        {/* Desktop: sisa minus jadi poster di sisi kiri, notifikasi di kanan */}
        <div aria-hidden className="hidden text-kertas lg:col-span-6 lg:block">
          <p className="mikro text-kertas/70">Babak 2 — Godaan · Notifikasi masuk 21.47</p>
          <p className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight">Sisa lo bulan ini:</p>
          <p className="mt-2 whitespace-nowrap font-mono text-[clamp(3rem,5.2vw,5.5rem)] font-bold leading-none tracking-tighter text-minus">
            {bulanan ? formatRupiah(bulanan.sisa) : ''}
          </p>
          <p className="mt-6 max-w-[30ch] border-l-4 border-kertas/60 pl-5 text-lg leading-snug">
            Dan tiba-tiba ada yang nawarin duit. Nggak pakai tanya kenapa lo butuh.
          </p>
        </div>

        <div className="lg:col-span-6">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-cairkan"
          aria-describedby="isi-cairkan"
          initial={{ y: '-130%', scale: 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.8, delay: 0.25 }}
          className="overflow-hidden rounded-[1.6rem] border-2 border-tinta bg-kertas shadow-tombol lg:rounded-kartu"
        >
          {/* Kepala notifikasi sistem */}
          <div className="flex items-center gap-2.5 px-4 pt-3.5 font-display text-[0.8125rem] text-tinta-pudar">
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-md bg-tinta font-mono text-[0.625rem] font-bold text-neon"
            >
              PL
            </span>
            <span className="font-medium text-tinta">PinjamLancar+</span>
            <span aria-hidden>·</span>
            <span>sekarang</span>
          </div>

          <div className="px-4 pb-4 pt-2">
            <h2
              id="judul-cairkan"
              data-judul-scene
              tabIndex={-1}
              className="font-display text-xl font-bold leading-snug text-tinta outline-none lg:text-3xl"
            >
              Limit kamu {formatRupiah(ASUMSI.PAYLATER_LIMIT)} siap dicairkan.
            </h2>
            <p id="isi-cairkan" className="mt-1 text-tinta">
              Cair dalam 5 menit.
            </p>
            <p className="mt-1 font-mono text-[0.6875rem] text-tinta-pudar">
              Bunga mulai {(ASUMSI.PAYLATER_BUNGA * 100).toLocaleString('id-ID')}%/bln. S&amp;K berlaku.
            </p>

            {/* Desktop: tulisan kecil yang biasanya nggak dibaca */}
            <div aria-hidden className="mt-4 hidden lg:block">
              <div className="ledger border-t-2 border-t-tinta">
                <span className="kode">LMT-01</span>
                <span>LIMIT</span>
                <span className="nilai">{formatRupiah(ASUMSI.PAYLATER_LIMIT)}</span>
              </div>
              <div className="ledger">
                <span className="kode">TNR-02</span>
                <span>TENOR</span>
                <span className="nilai">{ASUMSI.PAYLATER_TENOR} BULAN</span>
              </div>
              <div className="ledger">
                <span className="kode">BNG-03</span>
                <span>BUNGA</span>
                <span className="nilai">{(ASUMSI.PAYLATER_BUNGA * 100).toLocaleString('id-ID')}%/BLN</span>
              </div>
              <div className="ledger">
                <span className="kode">ADM-04</span>
                <span>ADMIN / TAGIHAN</span>
                <span className="nilai">{formatRupiah(ASUMSI.PAYLATER_ADMIN)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                ref={tombolTolak}
                type="button"
                onClick={() => pilih('tolak')}
                className="inline-flex min-h-[3.25rem] items-center justify-center rounded-chip border-2 border-tinta bg-kertas px-4 font-display font-bold text-tinta"
              >
                Nggak dulu
              </button>
              {/* Godaan sengaja diberi warna CTA: begitulah aplikasinya merayu */}
              <button type="button" onClick={() => pilih('cairkan')} className="tombol-cta !py-3">
                Cairkan
              </button>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-5 text-center font-display text-sm text-kertas/90"
        >
          Pas banget, struk lo lagi minus. Kebetulan?
        </motion.p>
        </div>
      </div>
    </section>
  );
}
