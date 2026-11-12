'use client';

import { useDrag } from '@use-gesture/react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MejaKasir } from '@/components/ui/MejaKasir';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { getar, playKaChing } from '@/lib/sound';
import {
  LIFESTYLE_ITEMS,
  calcLifestyleItem,
  formatRupiah,
  useLifestyleTotal,
  useSimulationStore,
  type LifestyleId,
  type LifestyleItem,
} from '@/store/useSimulationStore';

type Arah = 'kanan' | 'kiri';

/** Jarak geser (px) sampai kartu dianggap benar-benar di-swipe */
const AMBANG = 96;

/* ------------------------------------------------------------------ */
/* Isi kartu                                                           */
/* ------------------------------------------------------------------ */

function IsiKartu({ item }: { item: LifestyleItem }) {
  return (
    <div className="flex h-full flex-col justify-between p-5">
      <span aria-hidden className="text-7xl leading-none">
        {item.emoji}
      </span>
      <div>
        <h3 className="text-3xl font-bold leading-tight text-tinta">{item.label}</h3>
        <p className="mt-2 font-mono text-struk text-tinta-pudar">{item.rincian}</p>
        <p data-angka className="mt-1 font-mono text-lg font-bold text-tinta">
          {formatRupiah(calcLifestyleItem(item.id))}
          <span className="font-normal text-tinta-pudar"> /bulan</span>
        </p>
      </div>
    </div>
  );
}

const KELAS_KARTU =
  'absolute inset-0 rounded-kartu border-2 border-tinta tekstur-thermal shadow-struk';

/* ------------------------------------------------------------------ */
/* Kartu paling atas: satu-satunya yang bisa digeser                   */
/* ------------------------------------------------------------------ */

function KartuAtas({
  item,
  paksa,
  onSelesai,
}: {
  item: LifestyleItem;
  /** Diisi saat user menekan tombol alternatif: kartu terbang ke arah itu */
  paksa: Arah | null;
  onSelesai: (arah: Arah) => void;
}) {
  const kurangiGerak = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-14, 14]);
  const capKanan = useTransform(x, [24, AMBANG], [0, 1]);
  const capKiri = useTransform(x, [-AMBANG, -24], [1, 0]);

  const sedangTerbang = useRef(false);
  const onSelesaiRef = useRef(onSelesai);
  onSelesaiRef.current = onSelesai;

  const terbang = useCallback(
    (arah: Arah) => {
      if (sedangTerbang.current) return;
      sedangTerbang.current = true;
      if (kurangiGerak) {
        onSelesaiRef.current(arah);
        return;
      }
      animate(x, arah === 'kanan' ? 520 : -520, {
        duration: 0.26,
        ease: 'easeIn',
        onComplete: () => onSelesaiRef.current(arah),
      });
    },
    [kurangiGerak, x],
  );

  useEffect(() => {
    if (paksa) terbang(paksa);
  }, [paksa, terbang]);

  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx] }) => {
      if (sedangTerbang.current) return;
      if (active) {
        x.set(mx);
        return;
      }
      const dilempar = vx > 0.6 && Math.abs(mx) > 30;
      if (Math.abs(mx) > AMBANG || dilempar) {
        terbang(mx > 0 ? 'kanan' : 'kiri');
      } else {
        animate(x, 0, { type: 'spring', stiffness: 520, damping: 30 });
      }
    },
    { axis: 'x', filterTaps: true },
  );

  return (
    // Handler gesture di pembungkus diam; yang bergerak adalah motion.div di dalamnya
    <div
      {...bind()}
      data-kursor="GESER"
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
    >
      <motion.div style={{ x, rotate }} className={KELAS_KARTU}>
        <span aria-hidden className="selotip -top-3 left-1/2 -ml-[2.4rem]" style={{ ['--putar' as string]: '-2deg' }} />
        <IsiKartu item={item} />

        <motion.span
          aria-hidden
          // Rotasi stempel lewat --putar; opacity tetap milik Framer
          style={{ opacity: capKanan, ['--putar' as string]: '3deg' }}
          className="stempel absolute right-4 top-6 text-lg text-aman-teks"
        >
          Gue banget
        </motion.span>
        <motion.span
          aria-hidden
          style={{ opacity: capKiri, ['--putar' as string]: '-2deg' }}
          className="stempel absolute right-4 top-6 text-lg text-tinta-pudar"
        >
          Skip
        </motion.span>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ikon speaker                                                        */
/* ------------------------------------------------------------------ */

function IkonSpeaker({ nyala }: { nyala: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {nyala ? (
        <path
          d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="m16 9.5 5 5m0-5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — Swipe Gaya Hidup                                               */
/* ------------------------------------------------------------------ */

export function Scene04SwipeCards() {
  const swipedIds = useSimulationStore((s) => s.swipedIds);
  const jumlahKanan = useSimulationStore((s) => s.lifestyleIds.length);
  const soundOn = useSimulationStore((s) => s.soundOn);
  const swipe = useSimulationStore((s) => s.swipe);
  const undoSwipe = useSimulationStore((s) => s.undoSwipe);
  const toggleSound = useSimulationStore((s) => s.toggleSound);
  const next = useSimulationStore((s) => s.next);
  const total = useLifestyleTotal();

  const [paksa, setPaksa] = useState<Arah | null>(null);
  const [kabar, setKabar] = useState('');

  const sisa = useMemo(
    () => LIFESTYLE_ITEMS.filter((item) => !swipedIds.includes(item.id)),
    [swipedIds],
  );
  const jumlah = LIFESTYLE_ITEMS.length;
  const habis = sisa.length === 0;
  const modeHard = habis && jumlahKanan === jumlah;

  const selesaiSwipe = (id: LifestyleId, label: string, arah: Arah) => {
    swipe(id, arah);
    setPaksa(null);
    if (arah === 'kanan') {
      getar(10);
      if (soundOn) playKaChing();
    }
    setKabar(arah === 'kanan' ? `${label}: gue banget.` : `${label}: skip.`);
  };

  const balikin = () => {
    undoSwipe();
    setPaksa(null);
    setKabar('Kartu terakhir dibalikin.');
  };

  // Tiga kartu teratas saja yang dirender; urutan dibalik supaya kartu aktif ada di atas
  const tumpukan = sisa.slice(0, 3).reverse();

  return (
    <section className="scene scene-split" aria-labelledby="judul-gaya-hidup">
      <div className="kolom-kiri">
        <MejaKasir langkah="gaya-hidup" />
      </div>

      <div className="kolom-kanan">
      <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
        Form 03 — Gaya hidup · akun GYA-05
      </p>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="judul-gaya-hidup" data-judul-scene tabIndex={-1} className="judul-editorial">
            Mana yang lo banget?
          </h2>
          <p className="mt-1 font-mono text-struk text-tinta-pudar lg:mt-4">
            {Math.min(swipedIds.length + 1, jumlah)} dari {jumlah}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label="Suara ka-ching"
          title={soundOn ? 'Matikan suara' : 'Nyalakan suara'}
          className="grid h-sentuh w-sentuh shrink-0 place-items-center rounded-full border-2 border-tinta text-tinta aria-pressed:bg-tinta aria-pressed:text-kertas"
        >
          <IkonSpeaker nyala={soundOn} />
        </button>
      </div>

      {/* Total berjalan: naik tiap swipe kanan */}
      <div className="mt-4 flex items-baseline justify-between border-y-2 border-dashed border-tinta/40 py-2 lg:hidden">
        <span className="font-mono text-struk text-tinta-pudar">Gaya hidup per bulan</span>
        <RollingNumber value={total} className="font-mono text-xl font-bold text-tinta" />
      </div>

      <div className="relative mx-auto mt-5 h-[min(46dvh,22rem)] w-full max-w-[19rem] lg:mx-0 lg:ml-6 lg:mt-10 lg:h-[min(48dvh,26rem)] lg:max-w-[22rem]">
        {tumpukan.map((item) => {
          const kedalaman = sisa.indexOf(item); // 0 = paling atas
          if (kedalaman === 0) {
            return (
              <KartuAtas
                key={item.id}
                item={item}
                paksa={paksa}
                onSelesai={(arah) => selesaiSwipe(item.id, item.label, arah)}
              />
            );
          }
          return (
            <motion.div
              key={item.id}
              aria-hidden
              initial={false}
              animate={{ scale: 1 - kedalaman * 0.05, y: kedalaman * 12 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className={KELAS_KARTU}
            >
              <IsiKartu item={item} />
            </motion.div>
          );
        })}

        {habis && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-kartu border-2 border-dashed border-tinta/50 p-5 text-center">
            <p className="text-2xl font-bold leading-tight text-tinta">
              {jumlahKanan === 0
                ? 'Nol dari delapan. Lurus banget hidup lo, salut.'
                : `${jumlahKanan} dari ${jumlah} lo banget.`}
            </p>
            <p className="mt-2 text-tinta-pudar">Struknya udah siap dicetak.</p>

            <AnimatePresence>
              {modeHard && (
                <motion.p
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: -8 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 12 }}
                  className="mt-5 rounded-kartu border-[3px] border-tinta bg-minus px-4 py-2 font-display text-lg font-bold text-tinta shadow-tombol"
                >
                  Lo main hidup mode hard ya
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <p role="status" className="hanya-sr">
        {kabar}
      </p>

      <div className="zona-jempol">
        {habis ? (
          <button type="button" onClick={next} className="tombol-cta">
            Cetak struk gue
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:max-w-[28rem]">
            <button
              type="button"
              onClick={() => setPaksa('kiri')}
              disabled={paksa !== null}
              className="tombol-polos !min-h-[3.5rem] text-lg"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => setPaksa('kanan')}
              disabled={paksa !== null}
              className="tombol-cta"
            >
              Gue banget
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={balikin}
          disabled={swipedIds.length === 0}
          className="mx-auto mt-2 flex min-h-sentuh items-center px-4 font-display text-sm font-medium text-tinta underline underline-offset-4 disabled:invisible lg:mx-0 lg:px-0"
        >
          Balikin kartu terakhir
        </button>
      </div>
      </div>
    </section>
  );
}
