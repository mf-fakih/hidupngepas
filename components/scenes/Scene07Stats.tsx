'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState } from 'react';
import {
  CITIES,
  STATISTIK,
  urlKartu,
  useMonthly,
  useResult,
  useSimulationStore,
  type Statistik,
} from '@/store/useSimulationStore';

gsap.registerPlugin(ScrollTrigger);

interface Titik {
  /** Jumlah orang yang menyala dari 100 */
  nyala: number;
  // Grafik bermakna butuh kontras ≥ 3:1 dengan kertas: neon (±1,1:1) tidak lolos
  warna: 'minus' | 'tinta';
  keterangan: string;
}

/* ------------------------------------------------------------------ */
/* DotGrid: 100 siluet orang                                           */
/* ------------------------------------------------------------------ */

function GridOrang({ nyala, warna }: { nyala: number; warna: Titik['warna'] }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden className="h-auto w-full max-w-[13rem] lg:max-w-[19rem]">
      {Array.from({ length: 100 }, (_, i) => {
        const x = (i % 10) * 20 + 10;
        const y = Math.floor(i / 10) * 20 + 4;
        const aktif = i < nyala;
        return (
          <g
            key={i}
            className="transition-[fill] duration-300"
            // Menyala berurutan; saat padam, urutannya dari belakang
            style={{
              fill: aktif ? `rgb(var(--${warna}))` : 'rgb(var(--tinta) / 0.14)',
              transitionDelay: `${(aktif ? i : 99 - i) * 7}ms`,
            }}
          >
            <circle cx={x} cy={y + 3.2} r="3.2" />
            <rect x={x - 4.6} y={y + 7.6} width="9.2" height="7.6" rx="3.5" />
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Satu kartu statistik                                                */
/* ------------------------------------------------------------------ */

function KartuStat({ stat, titik, indeks }: { stat: Statistik; titik: Titik; indeks: number }) {
  return (
    <article
      data-kartu-stat={indeks}
      className="flex min-h-[72vh] flex-col justify-center py-10"
      aria-labelledby={`stat-${stat.id}`}
    >
      <div className="relative rounded-kartu border-2 border-tinta bg-kertas p-5 shadow-tombol lg:max-w-[40rem] lg:p-8">
        <span
          aria-hidden
          className="selotip -top-3 right-10 hidden lg:block"
          style={{ ['--putar' as string]: indeks % 2 ? '-4deg' : '3deg' }}
        />
        <p aria-hidden className="mikro mb-3 hidden text-tinta-pudar lg:block">
          Lembar fakta {String(indeks + 1).padStart(2, '0')}/{String(STATISTIK.length).padStart(2, '0')}
        </p>
        <p
          id={`stat-${stat.id}`}
          data-hitung={indeks}
          className="font-mono text-[clamp(2.25rem,11vw,3.5rem)] font-bold leading-none tracking-tight text-tinta lg:text-[clamp(3.75rem,6.4vw,6.5rem)] lg:tracking-tighter"
        >
          {stat.format(stat.nilai)}
        </p>
        <p className="mt-3 font-display text-xl font-bold leading-snug text-tinta lg:mt-5 lg:text-3xl lg:leading-tight">{stat.label}</p>
        <p className="mt-3 border-t-2 border-dashed border-tinta/30 pt-3 text-tinta">{titik.keterangan}</p>
        <p className="mt-2 font-mono text-[0.6875rem] text-tinta-pudar">Sumber: {stat.sumber}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* 07 — Lo Nggak Sendirian                                             */
/* ------------------------------------------------------------------ */

export function Scene07Stats() {
  const bulanan = useMonthly();
  const cityId = useSimulationStore((s) => s.cityId);
  const next = useSimulationStore((s) => s.next);
  const layar = useRef<HTMLElement>(null);
  const [aktif, setAktif] = useState(0);

  // Mulai cetak kartu hasil SEKARANG, selagi user membaca: begitu sampai scene 08
  // gambarnya biasanya sudah di cache (URL identik dengan yang dipakai scene 08).
  const hasil = useResult();
  const tampilkanNominal = useSimulationStore((s) => s.showAmountOnCard);
  const urlPrefetch = hasil ? urlKartu(hasil, tampilkanNominal) : null;
  useEffect(() => {
    if (!urlPrefetch) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = urlPrefetch;
  }, [urlPrefetch]);

  // Titik per kartu: tiap kartu diterjemahkan ke "berapa dari 100"
  const totalKeluar = bulanan?.total ?? 0;
  const tutup = totalKeluar > 0 ? Math.min(100, Math.round((STATISTIK[1].nilai / totalKeluar) * 100)) : 100;
  const kota = cityId ? CITIES[cityId].nama : 'kota lo';
  const titik: Titik[] = [
    {
      nyala: Math.round(STATISTIK[0].nilai),
      warna: 'minus',
      keterangan: `Kira-kira ${Math.round(STATISTIK[0].nilai)} dari 100 anak muda lagi nyari kerja dan belum dapet.`,
    },
    {
      nyala: tutup,
      warna: 'tinta',
      keterangan:
        tutup < 100
          ? `Upah segitu cuma nutup ${tutup}% pengeluaran bulanan lo di ${kota}.`
          : `Upah segitu cukup buat pengeluaran lo di ${kota}. Tipis, tapi cukup.`,
    },
    {
      nyala: 100,
      warna: 'minus',
      keterangan: 'Kalau satu orang di sini = Rp 1,5 triliun, semuanya nyala.',
    },
  ];

  useEffect(() => {
    const el = layar.current;
    if (!el) return;
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-kartu-stat]').forEach((kartu, i) => {
        const stat = STATISTIK[i];
        const angka = kartu.querySelector<HTMLElement>('[data-hitung]');
        const kotak = kartu.firstElementChild;

        ScrollTrigger.create({
          trigger: kartu,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => self.isActive && setAktif(i),
        });

        if (kurangiGerak || !angka || !kotak) return;

        // Kartu muncul satu per satu + angka count-up, sekali saja
        gsap.set(kotak, { autoAlpha: 0, y: 40, rotate: i % 2 ? 1.5 : -1.5 });
        const hitung = { n: 0 };
        angka.textContent = stat.format(0);
        gsap
          .timeline({ scrollTrigger: { trigger: kartu, start: 'top 75%', once: true } })
          .to(kotak, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.6, ease: 'back.out(1.6)' })
          .to(
            hitung,
            {
              n: stat.nilai,
              duration: 1.4,
              ease: 'power3.out',
              onUpdate: () => {
                angka.textContent = stat.format(hitung.n);
              },
            },
            '<0.15',
          );
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const t = titik[aktif];

  return (
    <section ref={layar} className="scene scene-split" aria-labelledby="judul-bareng">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
          Babak 3 — Konteks · 100 orang, satu halaman
        </p>
        <h2 id="judul-bareng" data-judul-scene tabIndex={-1} className="judul-editorial">
          Lo nggak sendirian.
        </h2>
        <p className="mt-2 text-tinta-pudar lg:mt-5 lg:text-lg lg:text-tinta">
          Scroll pelan-pelan. Ini angka beneran, bukan simulasi.
        </p>

        {/* HP: grid menempel di atas selama kartu lewat. Desktop: seluruh kolom kiri yang menempel. */}
        <div className="sticky top-[calc(4.5rem+env(safe-area-inset-top,0px))] z-10 -mx-5 mt-4 bg-gradient-to-b from-kertas from-80% to-kertas/0 px-5 pb-6 pt-2 lg:static lg:mx-0 lg:mt-8 lg:border-t-2 lg:border-tinta lg:bg-none lg:px-0 lg:pb-0 lg:pt-6">
          <div className="flex items-center gap-4 lg:items-end lg:gap-8">
            <GridOrang nyala={t.nyala} warna={t.warna} />
            <p aria-live="polite" className="font-mono text-struk text-tinta lg:pb-1">
              <span className="block text-3xl font-bold lg:text-8xl lg:leading-[0.85] lg:tracking-tighter">{t.nyala}</span>
              <span className="lg:mikro lg:mt-3 lg:block lg:text-tinta-pudar">dari 100</span>
            </p>
          </div>
        </div>
      </div>

      <div className="kolom-kanan">
        <div>
          {STATISTIK.map((stat, i) => (
            <KartuStat key={stat.id} stat={stat} titik={titik[i]} indeks={i} />
          ))}
        </div>

        <p className="mb-6 mt-4 font-display text-[clamp(1.6rem,6vw,2.25rem)] font-bold leading-tight text-tinta lg:mb-10 lg:max-w-[18ch] lg:text-6xl lg:leading-[0.95] lg:tracking-tighter">
          Ini bukan cuma soal lo kurang hemat. Sistemnya juga lagi berat.
        </p>

        <div className="zona-jempol">
          <button type="button" onClick={next} className="tombol-cta">
            Lihat kartu hasil gue
          </button>
        </div>
      </div>
    </section>
  );
}
