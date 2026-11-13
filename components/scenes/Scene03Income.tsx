'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { MejaKasir } from '@/components/ui/MejaKasir';
import { MoneySlider } from '@/components/ui/MoneySlider';
import { getar } from '@/lib/sound';
import {
  ASUMSI,
  STATUS,
  formatRupiahRingkas,
  getIncomeMode,
  useSimulationStore,
  type IncomeMode,
} from '@/store/useSimulationStore';

const TAMPILAN_MODE: Record<IncomeMode['id'], { emoji: string; catatan: string }> = {
  'mie-instan': { emoji: '🍜', catatan: 'Bertahan itu juga skill.' },
  ngepas: { emoji: '🧾', catatan: 'Cukup, asal nggak ada kondangan.' },
  waswas: { emoji: '😬', catatan: 'Aman, selama HP nggak jatuh.' },
  'sultan-lokal': { emoji: '👑', catatan: 'Traktir boleh, asal jangan tiap hari.' },
};

/**
 * 03 — Gaji / Uang Saku
 * Slider dan kolom angka mengubah nilai yang sama di store, jadi selalu sinkron.
 */
export function Scene03Income() {
  const status = useSimulationStore((s) => s.status);
  const income = useSimulationStore((s) => s.income);
  const setIncome = useSimulationStore((s) => s.setIncome);
  const next = useSimulationStore((s) => s.next);

  const label = status ? STATUS[status].incomeLabel : 'Penghasilan per bulan';
  const mode = getIncomeMode(income);
  const tampilan = TAMPILAN_MODE[mode.id];

  // Getar sedikit lebih terasa saat pindah mode (mie instan → ngepas → ...)
  const modeTerakhir = useRef(mode.id);
  useEffect(() => {
    if (modeTerakhir.current !== mode.id) {
      modeTerakhir.current = mode.id;
      getar(18);
    }
  }, [mode.id]);

  const onKetik = (teks: string) => {
    const digit = teks.replace(/\D/g, '');
    setIncome(digit === '' ? 0 : Number(digit)); // store yang menjepit ke 0–15 juta
  };

  return (
    <section className="scene scene-split" aria-labelledby="judul-gaji">
      <div className="kolom-kiri">
        <MejaKasir langkah="gaji" />
      </div>

      <div className="kolom-kanan">
      <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
        Form 02 — Pemasukan · akun GAJ-00
      </p>
      <h2 id="judul-gaji" data-judul-scene tabIndex={-1} className="judul-editorial">
        <label htmlFor="input-gaji">{label}</label>
      </h2>

      {/* Ilustrasi mode: berganti SEKETIKA mengikuti angka (tanpa menunggu animasi keluar),
          jadi saat diketik cepat badge & ilustrasi tidak pernah hilang */}
      <div aria-live="polite" className="mt-6 flex min-h-[7.5rem] flex-col items-center lg:mt-10 lg:min-h-[4.5rem] lg:items-start">
          <motion.div
            key={mode.id}
            initial={{ opacity: 0.4, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="flex flex-col items-center text-center lg:flex-row lg:gap-4 lg:text-left"
          >
            <span aria-hidden className="text-6xl leading-none">
              {tampilan.emoji}
            </span>
            <span className="mt-3 rounded-chip border-2 border-tinta bg-tinta px-4 py-1 font-display font-bold text-kertas lg:mt-0 lg:-rotate-2">
              {mode.label}
            </span>
            <span className="mt-2 text-sm text-tinta-pudar lg:mt-0 lg:text-base">{tampilan.catatan}</span>
          </motion.div>
      </div>

      {/* Input angka manual */}
      <div className="mt-6 flex items-baseline justify-center gap-2 border-b-2 border-tinta pb-2 font-mono font-bold text-tinta lg:mt-8 lg:justify-start lg:gap-4 lg:border-b-4">
        <span aria-hidden className="text-2xl lg:text-4xl">
          Rp
        </span>
        <input
          id="input-gaji"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-angka
          value={income.toLocaleString('id-ID')}
          onChange={(e) => onKetik(e.target.value)}
          onFocus={(e) => e.target.select()}
          aria-describedby="bantuan-gaji"
          className="w-full min-w-0 max-w-[11ch] bg-transparent text-center text-[clamp(2rem,10vw,3rem)] leading-tight outline-none lg:text-left lg:text-[clamp(4.5rem,7.5vw,7.5rem)] lg:leading-none lg:tracking-tighter"
        />
      </div>
      <p id="bantuan-gaji" className="mt-2 text-center text-sm text-tinta-pudar lg:text-left">
        Geser, atau ketik angkanya. Maksimal {formatRupiahRingkas(ASUMSI.GAJI_MAKS)}.
      </p>

      <div className="mt-6 lg:mt-10 lg:max-w-[40rem]">
        <MoneySlider
          label={label}
          value={income}
          max={ASUMSI.GAJI_MAKS}
          step={50_000}
          onChange={setIncome}
          penanda={{
            nilai: ASUMSI.UPAH_RATA_20_24,
            label: `rata-rata usia 20–24: ${formatRupiahRingkas(ASUMSI.UPAH_RATA_20_24)}`,
          }}
        />
      </div>

      <div className="zona-jempol">
        <button type="button" onClick={next} className="tombol-cta">
          Lanjut
        </button>
      </div>
      </div>
    </section>
  );
}
