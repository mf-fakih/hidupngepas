'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { SCENE_BY_ID, useSimulationStore, type SceneId } from '@/store/useSimulationStore';

const NAMA_BABAK = ['Kenalan', 'Realita', 'Refleksi'] as const;

/**
 * Seberapa penuh segmen babak-nya saat user berada di scene ini (0–1).
 * Sengaja bukan "halaman 3 dari 12": yang terasa adalah babak, bukan jumlah langkah.
 */
const ISI_SEGMEN: Record<SceneId, number> = {
  hero: 0.06,
  kenalan: 0.35,
  gaji: 0.65,
  'gaya-hidup': 0.9,
  struk: 0.35,
  cairkan: 0.55,
  paylater: 0.9,
  nabung: 0.9,
  // Babak 3: Refleksi
  timeline: 0.2,
  bareng: 0.45,
  kartu: 0.75,
  aksi: 1,
};

export function ProgressBar3Babak() {
  const scene = useSimulationStore((s) => s.scene);
  const back = useSimulationStore((s) => s.back);

  const babak = SCENE_BY_ID[scene].babak;
  const bisaBalik = scene !== 'hero';

  return (
    // Latar kertas memudar ke bawah: konten yang di-scroll tidak bertumpuk dengan "Balik"
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 bg-gradient-to-b from-kertas from-75% to-kertas/0 pt-aman-atas">
      <div className="mx-auto w-full max-w-scene px-5 pb-2 pt-3 lg:max-w-[84rem] lg:px-12 lg:pt-5">
        {/* Kop halaman: hanya desktop */}
        <p aria-hidden className="mikro mb-2 hidden justify-between text-tinta lg:flex">
          <span className="font-bold">Hidup Ngepas</span>
          <span className="text-tinta-pudar">
            Babak {babak}/3 · {NAMA_BABAK[babak - 1]}
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Progres simulasi"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={babak}
          aria-valuetext={`Babak ${babak} dari 3: ${NAMA_BABAK[babak - 1]}`}
          className="flex gap-1.5"
        >
          {NAMA_BABAK.map((nama, i) => {
            const nomor = i + 1;
            const isi = nomor < babak ? 1 : nomor === babak ? ISI_SEGMEN[scene] : 0;
            return (
              <div key={nama} className="h-1 flex-1 overflow-hidden rounded-full bg-tinta/15">
                <motion.div
                  className="h-full origin-left rounded-full bg-tinta"
                  initial={false}
                  animate={{ scaleX: isi }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {bisaBalik && (
            <motion.button
              key="balik"
              type="button"
              onClick={back}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto -ml-2 mt-1 inline-flex min-h-sentuh min-w-sentuh items-center gap-1 rounded-chip px-2 font-display text-sm font-medium text-tinta"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                <path
                  d="M11 3.5 5.5 9l5.5 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Balik
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
