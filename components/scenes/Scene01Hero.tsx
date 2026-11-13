'use client';

import { motion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LIFESTYLE_ITEMS, useSimulationStore, type SceneId } from '@/store/useSimulationStore';

interface Props {
  /** true setelah preloader selesai: saat itulah koin dijatuhkan */
  siap: boolean;
}

/* ------------------------------------------------------------------ */
/* Visual: dompet tipis + koin                                         */
/* Sementara 2D (SVG + transform) supaya LCP cepat. Wallet3D (R3F)     */
/* nanti di-lazy-load ke slot yang sama setelah interaksi pertama.     */
/* ------------------------------------------------------------------ */

interface DataKoin {
  kiri: string;
  atas: string;
  ukuran: number;
  /** Seberapa jauh koin ikut bergeser (px) saat kursor/HP miring */
  dalam: number;
  putar: number;
  jeda: number;
}

const KOIN: DataKoin[] = [
  { kiri: '6%', atas: '58%', ukuran: 46, dalam: 22, putar: -14, jeda: 0.05 },
  { kiri: '22%', atas: '8%', ukuran: 34, dalam: 12, putar: 18, jeda: 0.22 },
  { kiri: '70%', atas: '2%', ukuran: 40, dalam: 16, putar: -8, jeda: 0.12 },
  { kiri: '84%', atas: '52%', ukuran: 52, dalam: 26, putar: 12, jeda: 0.3 },
  { kiri: '47%', atas: '80%', ukuran: 30, dalam: 10, putar: 24, jeda: 0.38 },
];

function Koin({
  data,
  px,
  py,
  jatuh,
}: {
  data: DataKoin;
  px: MotionValue<number>;
  py: MotionValue<number>;
  jatuh: boolean;
}) {
  const x = useTransform(px, (v) => v * data.dalam);
  const y = useTransform(py, (v) => v * data.dalam);

  return (
    <motion.div className="absolute" style={{ left: data.kiri, top: data.atas, x, y }}>
      <motion.div
        initial={{ y: -280, opacity: 0, rotate: data.putar - 60 }}
        animate={jatuh ? { y: 0, opacity: 1, rotate: data.putar } : undefined}
        transition={{ type: 'spring', stiffness: 170, damping: 11, delay: data.jeda }}
        className="grid place-items-center rounded-full border-2 border-tinta bg-kertas-lipat font-mono text-[0.6875rem] font-bold text-tinta shadow-[0_3px_0_rgb(var(--tinta))]"
        style={{ width: data.ukuran, height: data.ukuran }}
      >
        Rp
      </motion.div>
    </motion.div>
  );
}

function DompetTipis({ jatuh }: { jatuh: boolean }) {
  // -1 … 1, dihaluskan pegas supaya koin terasa punya berat
  const px = useSpring(0, { stiffness: 110, damping: 18 });
  const py = useSpring(0, { stiffness: 110, damping: 18 });

  const rotateY = useTransform(px, (v) => v * 10);
  const rotateX = useTransform(py, (v) => v * -8);

  useEffect(() => {
    const jepit = (n: number) => Math.max(-1, Math.min(1, n));

    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // di HP, gyroscope yang bekerja
      px.set(jepit((e.clientX / window.innerWidth - 0.5) * 2));
      py.set(jepit((e.clientY / window.innerHeight - 0.5) * 2));
    };

    // Android langsung jalan. iOS butuh izin eksplisit; tanpa izin, visual diam saja.
    const onMiring = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      px.set(jepit(e.gamma / 30));
      py.set(jepit((e.beta - 45) / 30));
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('deviceorientation', onMiring, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onMiring);
    };
  }, [px, py]);

  return (
    <div aria-hidden className="relative mx-auto h-56 w-full max-w-xs select-none">
      {KOIN.map((k) => (
        <Koin key={k.kiri} data={k} px={px} py={py} jatuh={jatuh} />
      ))}

      {/* Pembungkus yang menengahkan; transform SVG sepenuhnya milik Framer Motion */}
      <div className="absolute inset-0 grid place-items-center">
      <motion.svg
        viewBox="0 0 220 150"
        className="w-[62%]"
        style={{ rotateX, rotateY, transformPerspective: 600 }}
      >
        {/* Satu-satunya isi dompet: selembar dua ribuan yang ngintip */}
        <g transform="rotate(-7 100 48)">
          <rect
            x="38"
            y="16"
            width="124"
            height="62"
            rx="4"
            fill="rgb(var(--kertas))"
            stroke="rgb(var(--tinta))"
            strokeWidth="3"
          />
          <text
            x="100"
            y="44"
            textAnchor="middle"
            fontFamily="var(--font-jetbrains-mono), monospace"
            fontWeight="700"
            fontSize="18"
            fill="rgb(var(--tinta))"
          >
            2.000
          </text>
        </g>

        {/* Badan dompet */}
        <rect x="16" y="54" width="188" height="88" rx="14" fill="rgb(var(--tinta))" />
        <path
          d="M26 70h168"
          stroke="rgb(var(--kertas) / 0.35)"
          strokeWidth="2"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
        {/* Pengait */}
        <rect
          x="150"
          y="84"
          width="62"
          height="30"
          rx="15"
          fill="rgb(var(--kertas-lipat))"
          stroke="rgb(var(--tinta))"
          strokeWidth="3"
        />
        <circle cx="168" cy="99" r="5" fill="rgb(var(--tinta))" />
      </motion.svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Struk contoh yang melayang (desktop saja)                           */
/* Angkanya ilustrasi, makanya dicap CONTOH: struk asli user baru      */
/* dicetak di scene 05.                                                */
/* ------------------------------------------------------------------ */

const BARIS_CONTOH = [
  ['GAJI', '5.000.000'],
  ['KOS + LISTRIK', '-1.800.000'],
  ['MAKAN', '-1.500.000'],
  ['KOPI SUSU', '-520.000'],
  ['NONGKRONG', '-400.000'],
  ['OJOL', '-390.000'],
] as const;

function StrukContoh() {
  return (
    <motion.div
      aria-hidden
      initial={{ y: 0 }}
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      className="relative mx-auto hidden w-full max-w-struk lg:block"
    >
      <div className="relative rotate-3">
        <span className="selotip -top-3 left-1/2 -ml-[2.4rem]" style={{ ['--putar' as string]: '-4deg' }} />
        <div className="struk">
          <p className="text-center text-base font-bold tracking-[0.2em]">HIDUP NGEPAS</p>
          <p className="mikro mt-1 text-center text-tinta-pudar">Struk bulanan · No. 0001</p>
          <hr className="garis-putus" />
          {BARIS_CONTOH.map(([nama, nominal]) => (
            <p key={nama} className="struk-baris">
              <span>{nama}</span>
              <span className="isi" />
              <span>{nominal}</span>
            </p>
          ))}
          <hr className="garis-putus" />
          <p className="flex items-baseline justify-between bg-tinta px-3 py-2 text-lg font-bold text-kertas">
            <span>SISA</span>
            <span>Rp ???.???</span>
          </p>
          {/* Barcode: murni dekorasi */}
          <div
            className="mt-4 h-9"
            style={{
              background:
                'repeating-linear-gradient(90deg, rgb(var(--tinta)) 0 2px, transparent 2px 5px, rgb(var(--tinta)) 5px 6px, transparent 6px 10px, rgb(var(--tinta)) 10px 13px, transparent 13px 15px)',
            }}
          />
          <p className="mikro mt-2 text-center text-tinta-pudar">Dihitung di HP lo · nggak disimpan</p>

          <span
            className="stempel absolute right-3 top-[38%] bg-kertas/60 text-2xl text-minus-teks"
            style={{ ['--putar' as string]: '-9deg' }}
          >
            Contoh
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Banner user lama                                                    */
/* ------------------------------------------------------------------ */

function BannerLanjut() {
  const adaData = useSimulationStore((s) => s.hasHydrated && !!s.status && !!s.cityId);
  const sudahSelesai = useSimulationStore((s) => s.completedAt !== null);
  const jumlahSwipe = useSimulationStore((s) => s.swipedIds.length);
  const goTo = useSimulationStore((s) => s.goTo);
  const resetAll = useSimulationStore((s) => s.resetAll);

  if (!adaData) return null;

  // Lanjut ke titik terjauh yang datanya sudah lengkap
  const tujuan: SceneId = sudahSelesai
    ? 'kartu'
    : jumlahSwipe >= LIFESTYLE_ITEMS.length
      ? 'struk'
      : jumlahSwipe > 0
        ? 'gaya-hidup'
        : 'gaji';

  // Banner tipis satu baris: CTA utama tetap satu-satunya yang menonjol
  return (
    <motion.div
      role="region"
      aria-label="Simulasi sebelumnya"
      title="Jawaban lo kesimpen di HP ini, bukan di server kami."
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="mb-2 flex items-center justify-between gap-2 border-y border-dashed border-tinta/40 pl-1 lg:mb-4 lg:max-w-md"
    >
      <p className="font-mono text-[0.75rem] leading-tight text-tinta-pudar">
        {sudahSelesai ? 'Ada hasil terakhir lo di HP ini.' : 'Simulasi lo tadi belum kelar.'}
      </p>
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => goTo(tujuan)}
          className="inline-flex min-h-sentuh items-center px-2 font-display text-sm font-bold text-tinta underline underline-offset-4"
        >
          Lanjut
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex min-h-sentuh items-center px-2 font-display text-sm font-medium text-tinta-pudar underline underline-offset-4"
        >
          Mulai dari nol
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 01 — Hero                                                           */
/* ------------------------------------------------------------------ */

export function Scene01Hero({ siap }: Props) {
  const next = useSimulationStore((s) => s.next);
  const [sudahMaju, setSudahMaju] = useState(false);

  // "Scroll pertama = lanjut ke scene 02": wheel ke bawah atau usap ke atas.
  // Hanya aktif kalau halaman memang sudah mentok, supaya HP kecil tetap bisa scroll biasa.
  useEffect(() => {
    if (!siap || sudahMaju) return;

    const mentok = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const maju = () => {
      setSudahMaju(true);
      next();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 24 && mentok()) maju();
    };

    let awalY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      awalY = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const akhirY = e.changedTouches[0]?.clientY;
      if (awalY !== null && akhirY !== undefined && awalY - akhirY > 60 && mentok()) maju();
      awalY = null;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [siap, sudahMaju, next]);

  return (
    <section className="scene scene-split poster" aria-labelledby="judul-hero">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-5 hidden gap-6 text-tinta-pudar lg:flex">
          <span className="font-bold text-tinta">Edisi 2026</span>
          <span>Simulator realita finansial</span>
          <span>Vol. 01 — Gaji vs hidup</span>
        </p>

        <h1
          id="judul-hero"
          data-judul-scene
          tabIndex={-1}
          className="text-headline font-bold text-tinta outline-none lg:text-[clamp(3.75rem,min(7.4vw,10.2dvh),8.25rem)] lg:leading-[0.92] lg:tracking-tighter"
        >
          Gaji lo cukup buat hidup?
          <br />
          Atau cuma{' '}
          <span className="lg:inline-block lg:-rotate-2 lg:bg-tinta lg:px-4 lg:pb-2 lg:text-kertas">
            ngepas?
          </span>
        </h1>

        <p className="mt-4 max-w-[26ch] text-lg leading-snug text-tinta lg:mt-7 lg:max-w-[30ch] lg:border-l-4 lg:border-tinta lg:pl-5 lg:text-2xl">
          Simulasi 2 menit. Tanpa login. Tanpa ngejudge (dikit).
        </p>

        <div className="zona-jempol">
          <BannerLanjut />
          <button type="button" onClick={next} className="tombol-cta lg:!px-10 lg:!py-5 lg:!text-xl">
            Cek Hidup Gue
          </button>
          <p className="mt-3 text-center text-sm text-tinta-pudar lg:mt-4 lg:text-left">
            Data dihitung di HP lo, nggak kami simpan.
          </p>
        </div>
      </div>

      <div className="kolom-kanan">
        <div
          className="urut-visual relative my-6 flex flex-1 items-center lg:my-0 lg:block lg:flex-none lg:pb-36"
          data-berat-slot="wallet-3d"
        >
          {/* Stiker miring, nempel di pojok struk */}
          <p
            aria-hidden
            className="mikro absolute -right-3 -top-10 z-10 hidden w-[9.5rem] rotate-[9deg] rounded-full border-2 border-tinta bg-kertas px-4 py-3 text-center font-bold text-tinta shadow-tombol lg:block"
          >
            No login • Local only • Realita 2026
          </p>

          <StrukContoh />

          <div className="w-full lg:absolute lg:-bottom-4 lg:-left-48 lg:w-64">
            <DompetTipis jatuh={siap} />
          </div>
        </div>
      </div>
    </section>
  );
}
