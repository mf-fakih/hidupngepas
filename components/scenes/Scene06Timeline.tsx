'use client';

import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimatePresence, animate, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MoneySlider } from '@/components/ui/MoneySlider';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  ASUMSI,
  WHAT_IF_AWAL,
  formatRupiah,
  formatRupiahRingkas,
  useProjection,
  useSimulationInput,
  useSimulationStore,
  type Milestone,
  type MilestoneId,
  type WhatIf,
} from '@/store/useSimulationStore';

gsap.registerPlugin(Flip, ScrollTrigger);

const UMUR_AKHIR = ASUMSI.UMUR_AKHIR_TIMELINE;

const IKON: Record<MilestoneId, string> = {
  'sisa-plus': '📈',
  'dana-darurat': '🛡️',
  nikah: '💍',
  'dp-rumah': '🏠',
  pensiun: '🪑',
};

/* ------------------------------------------------------------------ */
/* Angka umur yang bergulir halus saat what-if berubah                 */
/* ------------------------------------------------------------------ */

function AngkaUmur({ umur }: { umur: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const lalu = useRef(umur);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const kontrol = animate(lalu.current, umur, {
      duration: 0.5,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        node.textContent = String(Math.round(v));
      },
    });
    lalu.current = umur;
    return () => kontrol.stop();
  }, [umur]);

  return (
    <span ref={el} data-angka>
      {umur}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Denah kavling: blok meter persegi ikut skor kemampuan (skalaRumah)  */
/* ------------------------------------------------------------------ */

function labelRumah(skala: number) {
  if (skala >= 0.8) return 'Rumah tapak, ada halaman';
  if (skala >= 0.5) return 'Rumah tipe 36';
  if (skala >= 0.3) return 'Rumah subsidi, pinggir banget';
  return 'Masih ngontrak dulu';
}

const KOLOM_KAVLING = 12;
const BARIS_KAVLING = 8;
const SEL = 18; // px di viewBox; satu sel = 1 m²
const X0 = 40;
const Y0 = 14;

/**
 * Luas bangunan ILUSTRASI: diturunkan dari skalaRumah (0,15–1) supaya denahnya
 * nyambung dengan label (kamar kos 3×3 → tipe 21 → tipe 36 → tapak ±72 m²).
 * Bukan data harga per meter.
 */
function luasDariSkala(skala: number) {
  const t = Math.min(1, Math.max(0, (skala - 0.15) / 0.85));
  return Math.round(9 + t * 63);
}

function DenahKavling({ skala }: { skala: number }) {
  const luas = luasDariSkala(skala);
  // Bangunan = persegi panjang dari pojok kiri bawah kavling
  const lebar = Math.min(KOLOM_KAVLING, Math.ceil(Math.sqrt(luas * 1.5)));
  const panjang = Math.min(BARIS_KAVLING, Math.ceil(luas / lebar));
  const yAtas = Y0 + (BARIS_KAVLING - panjang) * SEL;
  const lebarPx = lebar * SEL;
  const panjangPx = panjang * SEL;
  const pegas = { type: 'spring', stiffness: 220, damping: 22 } as const;
  const mono = 'var(--font-jetbrains-mono), monospace';

  return (
    <div className="flex items-end gap-4 lg:flex-col lg:items-stretch lg:gap-3" data-berat-ringan>
      <div className="relative w-40 shrink-0 border border-dashed border-tinta/50 bg-kertas p-1.5 lg:w-full lg:p-3">
        <span aria-hidden className="selotip -top-3 right-6 hidden lg:block" style={{ ['--putar' as string]: '4deg' }} />
        <p aria-hidden className="mikro mb-1 hidden justify-between text-tinta-pudar lg:flex">
          <span>Lampiran B — Denah kavling</span>
          <span>Skala 1:100 · ilustrasi</span>
        </p>
        <svg
          viewBox="0 0 284 186"
          className="h-auto w-full"
          role="img"
          aria-label={`Denah kavling: bangunan kira-kira ${luas} meter persegi, ${lebar} kali ${panjang} meter.`}
        >
          {/* Kisi meter persegi */}
          {Array.from({ length: KOLOM_KAVLING * BARIS_KAVLING }, (_, i) => {
            const k = i % KOLOM_KAVLING;
            const b = Math.floor(i / KOLOM_KAVLING);
            const terisi = k < lebar && b >= BARIS_KAVLING - panjang && (BARIS_KAVLING - 1 - b) * lebar + k < luas;
            return (
              <rect
                key={i}
                x={X0 + k * SEL + 1.5}
                y={Y0 + b * SEL + 1.5}
                width={SEL - 3}
                height={SEL - 3}
                className="transition-[fill,stroke] duration-300"
                style={{
                  fill: terisi ? 'rgb(var(--tinta))' : 'transparent',
                  stroke: terisi ? 'rgb(var(--tinta))' : 'rgb(var(--tinta) / 0.22)',
                  transitionDelay: `${(k + (BARIS_KAVLING - b)) * 12}ms`,
                }}
                strokeWidth="1"
                strokeDasharray={terisi ? undefined : '2 2'}
              />
            );
          })}

          {/* Batas tanah */}
          <rect
            x={X0}
            y={Y0}
            width={KOLOM_KAVLING * SEL}
            height={BARIS_KAVLING * SEL}
            fill="none"
            stroke="rgb(var(--tinta))"
            strokeWidth="1.5"
            strokeDasharray="7 4"
          />

          {/* Garis tembok bangunan */}
          <motion.rect
            initial={false}
            animate={{ y: yAtas, width: lebarPx, height: panjangPx }}
            transition={pegas}
            x={X0}
            fill="none"
            stroke="rgb(var(--tinta))"
            strokeWidth="3.5"
          />

          {/* Garis ukur: lebar (bawah) */}
          <motion.g initial={false} animate={{ x: lebarPx }} transition={pegas}>
            <line x1={X0} y1={Y0 + BARIS_KAVLING * SEL + 5} x2={X0} y2={Y0 + BARIS_KAVLING * SEL + 15} stroke="rgb(var(--tinta))" strokeWidth="1.5" />
          </motion.g>
          <line x1={X0} y1={Y0 + BARIS_KAVLING * SEL + 5} x2={X0} y2={Y0 + BARIS_KAVLING * SEL + 15} stroke="rgb(var(--tinta))" strokeWidth="1.5" />
          <motion.line
            initial={false}
            animate={{ x2: X0 + lebarPx }}
            transition={pegas}
            x1={X0}
            y1={Y0 + BARIS_KAVLING * SEL + 10}
            y2={Y0 + BARIS_KAVLING * SEL + 10}
            stroke="rgb(var(--tinta))"
            strokeWidth="1"
          />
          <text x={X0} y={Y0 + BARIS_KAVLING * SEL + 26} fontFamily={mono} fontSize="9" fontWeight="700" fill="rgb(var(--tinta))">
            {lebar} m
          </text>

          {/* Garis ukur: panjang (kiri) */}
          <line x1={X0 - 15} y1={Y0 + BARIS_KAVLING * SEL} x2={X0 - 5} y2={Y0 + BARIS_KAVLING * SEL} stroke="rgb(var(--tinta))" strokeWidth="1.5" />
          <motion.g initial={false} animate={{ y: yAtas }} transition={pegas}>
            <line x1={X0 - 15} y1={0} x2={X0 - 5} y2={0} stroke="rgb(var(--tinta))" strokeWidth="1.5" />
            <text x={X0 - 38} y={12} fontFamily={mono} fontSize="9" fontWeight="700" fill="rgb(var(--tinta))">
              {panjang} m
            </text>
          </motion.g>
          <motion.line
            initial={false}
            animate={{ y1: yAtas }}
            transition={pegas}
            x1={X0 - 10}
            x2={X0 - 10}
            y2={Y0 + BARIS_KAVLING * SEL}
            stroke="rgb(var(--tinta))"
            strokeWidth="1"
          />

          {/* Mata angin */}
          <g transform={`translate(${X0 + KOLOM_KAVLING * SEL + 13} ${Y0 + 12})`} aria-hidden>
            <path d="M0 -9 4 5 0 2 -4 5Z" fill="rgb(var(--tinta))" />
            <text y="17" textAnchor="middle" fontFamily={mono} fontSize="8" fontWeight="700" fill="rgb(var(--tinta))">
              U
            </text>
          </g>
        </svg>
      </div>

      <div className="pb-1 lg:flex lg:items-end lg:justify-between lg:gap-4 lg:pb-0">
        <div>
          <p className="mikro text-tinta-pudar">Rumah yang kekejar</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={labelRumah(skala)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-1 font-display text-lg font-bold leading-tight text-tinta lg:text-2xl"
            >
              {labelRumah(skala)}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="mt-1 whitespace-nowrap font-mono text-struk font-bold text-tinta lg:mt-0 lg:text-4xl lg:leading-none lg:tracking-tighter">
          ± {luas} m²
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kalimat perbandingan dasar vs what-if                               */
/* ------------------------------------------------------------------ */

function kalimatAksi(w: WhatIf) {
  const aksi: string[] = [];
  if (w.raisePct > 0) aksi.push(`gaji naik ${w.raisePct}%`);
  if (w.jajanHematPct > 0) aksi.push(`kurangin jajan ${w.jajanHematPct}%`);
  if (w.nabungPerBulan !== null) aksi.push(`nabung ${formatRupiahRingkas(w.nabungPerBulan)}/bulan`);
  return aksi.join(' & ');
}

function kalimatDp(dasar: number | null, kalau: number | null, w: WhatIf) {
  const awal =
    dasar === null
      ? `Dengan kondisi sekarang, DP rumah belum kekejar sampai umur ${UMUR_AKHIR}.`
      : `Lo bisa DP rumah di umur ${dasar}.`;
  const aksi = kalimatAksi(w);
  if (!aksi) return awal;
  if (kalau === null) return `${awal} Kalau ${aksi}, tetep belum kekejar. Pelan-pelan.`;
  if (dasar === null) return `${awal} Tapi kalau ${aksi}, kekejar di umur ${kalau}.`;
  if (kalau < dasar) return `${awal} Kalau ${aksi}, maju jadi umur ${kalau}.`;
  if (kalau > dasar) return `${awal} Kalau ${aksi}, malah mundur ke umur ${kalau}.`;
  return `${awal} Kalau ${aksi}, masih umur ${kalau}.`;
}

/**
 * Satu baris jujur saat SISA sekarang belum plus: milestone di timeline
 * datang dari asumsi gaji naik pelan, bukan dari kondisi hari ini.
 */
function kalimatSisaPlus(umurSekarang: number, umurSisaPlus: number | null) {
  const laju = `${Math.round(ASUMSI.KENAIKAN_GAJI_RIIL * 100)}%/tahun`;
  if (umurSisaPlus === null)
    return `Sisa lo sekarang minus, dan dengan asumsi gaji naik pelan (${laju} di atas inflasi) tetep belum plus sampai umur ${UMUR_AKHIR}.`;
  if (umurSisaPlus === umurSekarang) return null;
  return `Sisa lo sekarang belum plus. Dengan asumsi gaji naik pelan (${laju} di atas inflasi), baru plus di umur ${umurSisaPlus}. Semua milestone dihitung dari situ.`;
}

/* ------------------------------------------------------------------ */
/* Posisi kartu di sumbu waktu                                         */
/* ------------------------------------------------------------------ */

interface Titik {
  m: Milestone;
  /** Posisi sebenarnya di sumbu (0–1) */
  pos: number;
  /** Posisi kartu setelah diberi jarak supaya tidak bertumpuk */
  posKartu: number;
}

function hitungTitik(milestones: Milestone[], umurMulai: number, jarakMin: number): Titik[] {
  const rentang = Math.max(1, UMUR_AKHIR - umurMulai);
  let terakhir = -Infinity;
  const hasil = milestones.map((m) => {
    // Belum kekejar → parkir di ujung sumbu
    const pos =
      m.umur === null || m.umur > UMUR_AKHIR ? 1 : Math.max(0, (m.umur - umurMulai) / rentang);
    const posKartu = Math.max(pos, terakhir + jarakMin);
    terakhir = posKartu;
    return { m, pos, posKartu };
  });
  // Pass mundur: kartu yang terdorong lewat ujung sumbu ditarik kembali ke dalam
  let batas = 1;
  for (let i = hasil.length - 1; i >= 0; i--) {
    hasil[i].posKartu = Math.max(0, Math.min(hasil[i].posKartu, batas));
    batas = hasil[i].posKartu - jarakMin;
  }
  return hasil;
}

type TabWhatIf = 'gaji' | 'jajan' | 'nabung';
const TAB_WHAT_IF: { id: TabWhatIf; label: string }[] = [
  { id: 'gaji', label: 'Gaji' },
  { id: 'jajan', label: 'Jajan' },
  { id: 'nabung', label: 'Nabung' },
];

/**
 * HP: strip ringkasan milestone yang menempel di atas sheet what-if.
 * Timeline-nya tertutup sheet, jadi payoff "milestone bergeser" ditampilkan di sini.
 * Angka yang berubah dari kondisi awal dibalik warnanya (tinta), dan meluncur masuk.
 */
function StripMilestone({
  milestones,
  dasarById,
}: {
  milestones: Milestone[];
  dasarById: Record<MilestoneId, number | null>;
}) {
  return (
    <ol aria-label="Ringkasan milestone" className="flex gap-1.5 overflow-x-auto px-3 pb-1 pt-2">
      {milestones.map((m) => {
        const berubah = dasarById[m.id] !== m.umur;
        return (
          <motion.li
            layout
            key={m.id}
            className={`flex shrink-0 items-center gap-1 rounded-chip border-2 border-tinta px-2 py-1 font-mono text-[0.8125rem] font-bold transition-colors ${
              berubah ? 'bg-tinta text-kertas' : 'bg-kertas text-tinta'
            }`}
          >
            <span aria-hidden>{IKON[m.id]}</span>
            <span className="hanya-sr">{m.label}:</span>
            <span className="relative inline-block overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={m.umur ?? 'x'}
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-100%', opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="inline-block"
                >
                  {m.umur ?? '—'}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}

/** Desktop: sisakan 7% di kiri & kanan supaya kartu di ujung sumbu tidak terpotong */
const sumbuX = (p: number) => `${7 + p * 86}%`;

/* ------------------------------------------------------------------ */
/* 06 — Timeline Hidup + What If                                       */
/* ------------------------------------------------------------------ */

export function Scene06Timeline() {
  const input = useSimulationInput();
  const proyeksi = useProjection();
  const whatIf = useSimulationStore((s) => s.whatIf);
  const setWhatIf = useSimulationStore((s) => s.setWhatIf);
  const next = useSimulationStore((s) => s.next);

  const desktop = useMediaQuery('(min-width: 768px)');
  const [drawerBuka, setDrawerBuka] = useState(false);
  /** HP: satu slider aktif per tab supaya sheet tetap pendek (≤ 40% layar) */
  const [tab, setTab] = useState<TabWhatIf>('gaji');
  useEffect(() => setDrawerBuka(desktop), [desktop]);

  const wadahTrek = useRef<HTMLDivElement>(null);
  const trek = useRef<HTMLDivElement>(null);
  const stateFlip = useRef<Flip.FlipState | null>(null);
  const tweenFlip = useRef<gsap.core.Timeline | null>(null);

  /** Ambil posisi kartu SEBELUM store berubah, supaya FLIP tahu titik awalnya */
  const ubahWhatIf = (patch: Partial<WhatIf>) => {
    if (trek.current) stateFlip.current = Flip.getState(trek.current.querySelectorAll('[data-flip]'));
    setWhatIf(patch);
  };

  // FLIP: kartu meluncur dari posisi lama ke posisi baru
  useLayoutEffect(() => {
    const state = stateFlip.current;
    stateFlip.current = null;
    if (!state || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    tweenFlip.current?.kill();
    tweenFlip.current = Flip.from(state, { duration: 0.55, ease: 'power3.inOut', nested: true });
  }, [whatIf]);
  useEffect(() => () => void tweenFlip.current?.kill(), []);

  // Desktop: sumbu horizontal di-pin dan digeser oleh scroll vertikal
  useEffect(() => {
    const elWadah = wadahTrek.current;
    const elTrek = trek.current;
    if (!elWadah || !elTrek) return;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      gsap.set(elWadah, { overflowX: 'hidden' });
      gsap.to(elTrek, {
        x: () => -(elTrek.scrollWidth - elWadah.clientWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: elWadah,
          start: 'top top+=72',
          end: () => `+=${elTrek.scrollWidth - elWadah.clientWidth}`,
          pin: true,
          // .scene itu flex: tanpa ini GSAP mematikan pinSpacing dan tidak ada ruang scroll
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    });
    return () => mm.revert();
  }, [desktop]);

  if (!input || !proyeksi) return null;

  const { dasar, kalau } = proyeksi;
  const titik = hitungTitik(kalau.milestones, input.age, desktop ? 0.2 : 0.22);
  const dasarById = Object.fromEntries(dasar.milestones.map((m) => [m.id, m.umur])) as Record<
    MilestoneId,
    number | null
  >;
  const adaWhatIf =
    whatIf.raisePct !== WHAT_IF_AWAL.raisePct ||
    whatIf.jajanHematPct !== WHAT_IF_AWAL.jajanHematPct ||
    whatIf.nabungPerBulan !== WHAT_IF_AWAL.nabungPerBulan;
  const adaJajan = input.lifestyleIds.length > 0;
  const sisaKalau = kalau.nabungPerBulan;
  const catatanSisa = kalimatSisaPlus(input.age, kalau.umurSisaPlus);
  // HP: hanya tab aktif yang tampil. Desktop: ketiganya berjajar.
  const panelTab = (id: TabWhatIf) =>
    desktop
      ? {}
      : { role: 'tabpanel', id: `isi-${id}`, 'aria-labelledby': `tab-${id}`, hidden: tab !== id };

  // Tanda umur tiap 5 tahun
  const tanda: number[] = [];
  for (let u = Math.ceil(input.age / 5) * 5; u <= UMUR_AKHIR; u += 5) tanda.push(u);
  const posUmur = (u: number) => (u - input.age) / Math.max(1, UMUR_AKHIR - input.age);

  return (
    <section className="scene md:!max-w-none md:px-0 lg:!pt-[6.5rem]" aria-labelledby="judul-timeline">
      <div className="md:mx-auto md:w-full md:max-w-3xl md:px-5 lg:grid lg:max-w-[84rem] lg:grid-cols-12 lg:items-end lg:gap-x-14 lg:px-12">
        <div className="lg:col-span-7">
          <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
            Babak 3 — Linimasa · Umur {input.age} → {UMUR_AKHIR}
          </p>
          <h2 id="judul-timeline" data-judul-scene tabIndex={-1} className="judul-editorial">
            Hidup lo, dari umur {input.age} sampai {UMUR_AKHIR}.
          </h2>
          <p
            aria-live="polite"
            className="mt-3 max-w-[40ch] text-lg leading-snug text-tinta lg:mt-6 lg:border-l-4 lg:border-tinta lg:pl-5 lg:text-xl"
          >
            {kalimatDp(dasar.umurDpRumah, kalau.umurDpRumah, whatIf)}
          </p>
          {catatanSisa && (
            <p className="mt-2 max-w-[44ch] text-sm leading-snug text-tinta-pudar lg:mt-4 lg:text-base">{catatanSisa}</p>
          )}
          {kalau.kprDitolak && (
            <p className="mt-2 text-sm font-medium text-minus-teks lg:mt-4">
              Catatan: duitnya mungkin kekejar, tapi riwayat telat paylater bikin KPR rawan ditolak.
            </p>
          )}
        </div>
        <div className="mt-5 lg:col-span-5 lg:mt-0">
          <DenahKavling skala={kalau.skalaRumah} />
        </div>
      </div>

      {/* Sumbu waktu: vertikal di HP, horizontal (di-pin, digeser scroll) di desktop */}
      <div
        ref={wadahTrek}
        className="relative mt-8 md:h-[min(30rem,62vh)] md:overflow-x-auto"
        aria-label="Linimasa milestone"
        role="region"
        tabIndex={0}
      >
        <div
          ref={trek}
          className="relative mb-20 mt-6 h-[min(110vh,52rem)] md:mb-0 md:mt-0 md:h-full md:w-[max(220vw,120rem)]"
        >
          {/* Garis sumbu */}
          <div
            aria-hidden
            className="absolute bottom-0 left-4 top-0 w-1 rounded-full bg-tinta md:bottom-auto md:left-0 md:right-0 md:top-1/2 md:h-1 md:w-auto"
          />

          {/* Tanda umur */}
          {tanda.map((u) => (
            <div
              key={u}
              aria-hidden
              className="absolute"
              style={
                desktop
                  ? { left: sumbuX(posUmur(u)), top: '50%' }
                  : { top: `${posUmur(u) * 100}%`, left: '1.125rem' }
              }
            >
              <span className="absolute -left-2 -top-0.5 block h-1 w-4 bg-tinta md:-left-0.5 md:-top-2 md:h-4 md:w-1" />
              <span className="absolute -left-12 -top-2 w-8 text-right font-mono text-[0.6875rem] text-tinta-pudar md:-left-4 md:top-4 md:text-center">
                {u}
              </span>
            </div>
          ))}

          {/* Kartu milestone */}
          <ol>
            {titik.map(({ m, pos, posKartu }, i) => {
              const umurDasar = dasarById[m.id];
              const berubah = adaWhatIf && umurDasar !== m.umur;
              const atas = i % 2 === 0; // desktop: selang-seling di atas/bawah sumbu
              const gaya = desktop
                ? { left: sumbuX(posKartu), top: atas ? '4%' : '58%' }
                : { top: `${posKartu * 100}%`, left: '2.75rem' };
              return (
                <li key={m.id}>
                  {/* Titik di sumbu: posisi umur yang sebenarnya */}
                  {/* Pembungkus luar dipegang Flip (tanpa transform); pemusatan di elemen dalam */}
                  <span
                    data-flip
                    data-flip-id={`titik-${m.id}`}
                    aria-hidden
                    className="absolute z-10 h-0 w-0"
                    style={desktop ? { left: sumbuX(pos), top: '50%' } : { top: `${pos * 100}%`, left: '1.125rem' }}
                  >
                    <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-[3px] border-tinta bg-neon" />
                  </span>
                  <div
                    data-flip
                    data-flip-id={`kartu-${m.id}`}
                    className="absolute h-0 w-[min(15rem,calc(100%-3.5rem))] md:w-0"
                    style={gaya}
                  >
                  <article className="absolute left-0 w-full -translate-y-1/2 rounded-kartu border-2 border-tinta bg-kertas p-3 shadow-tombol md:w-60 md:-translate-x-1/2 md:translate-y-0">
                    <p aria-hidden className="mikro mb-1 text-tinta-pudar">MLS-{String(i + 1).padStart(2, '0')}</p>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-bold leading-tight text-tinta">{m.label}</h3>
                      <span aria-hidden className="text-2xl leading-none">
                        {IKON[m.id]}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-2xl font-bold text-tinta">
                      {m.umur === null ? (
                        <span className="text-xl">belum kekejar</span>
                      ) : (
                        <>
                          umur <AngkaUmur umur={m.umur} />
                        </>
                      )}
                    </p>
                    {berubah && (
                      <p className="mt-0.5 font-mono text-[0.75rem] text-tinta-pudar">
                        tadinya {umurDasar === null ? 'belum kekejar' : `umur ${umurDasar}`}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-[0.6875rem] text-tinta-pudar">
                      {m.id === 'sisa-plus'
                        ? `asumsi gaji naik ${Math.round(ASUMSI.KENAIKAN_GAJI_RIIL * 100)}%/thn`
                        : `target ${formatRupiahRingkas(m.target)}`}
                    </p>
                  </article>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Panel What If: drawer di HP, terbuka di desktop */}
      <div className="zona-jempol md:mx-auto md:w-full md:max-w-3xl md:px-5 lg:max-w-[84rem] lg:px-12">
        <div className="rounded-kartu border-2 border-tinta bg-kertas shadow-tombol">
          <button
            type="button"
            onClick={() => setDrawerBuka((b) => !b)}
            aria-expanded={drawerBuka}
            aria-controls="panel-what-if"
            className="flex min-h-sentuh w-full items-center justify-between gap-3 px-4 py-3 font-display font-bold text-tinta"
          >
            <span>
              Gimana kalau...?
              {adaWhatIf && (
                <span className="ml-2 rounded-chip bg-tinta px-2 py-0.5 text-[0.6875rem] text-kertas">aktif</span>
              )}
            </span>
            <motion.svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden
              animate={{ rotate: drawerBuka ? 180 : 0 }}
            >
              <path d="M3.5 11 9 5.5l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </motion.svg>
          </button>

          <AnimatePresence initial={false}>
            {drawerBuka && (
              <motion.div
                id="panel-what-if"
                key="panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="overflow-hidden"
              >
                <div className="max-h-[40dvh] overflow-y-auto md:max-h-none">
                {!desktop && (
                  <>
                    <StripMilestone milestones={kalau.milestones} dasarById={dasarById} />
                    <div role="tablist" aria-label="Pilih skenario" className="mx-3 mt-1 grid grid-cols-3 rounded-chip border-2 border-tinta p-0.5">
                      {TAB_WHAT_IF.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          role="tab"
                          id={`tab-${t.id}`}
                          aria-selected={tab === t.id}
                          aria-controls={`isi-${t.id}`}
                          onClick={() => setTab(t.id)}
                          className="min-h-sentuh rounded-chip font-display text-sm font-bold text-tinta aria-selected:bg-tinta aria-selected:text-kertas"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div className="grid gap-1 px-4 pb-2 pt-2 md:grid-cols-3 md:gap-5 md:pt-0">
                  <div {...panelTab('gaji')}>
                    <p className="flex justify-between font-display text-sm font-medium text-tinta">
                      <span>Kalau gaji naik</span>
                      <span className="font-mono font-bold">{whatIf.raisePct}%</span>
                    </p>
                    <MoneySlider
                      label="Kalau gaji naik, dalam persen"
                      value={whatIf.raisePct}
                      max={100}
                      step={5}
                      getarTiap={25}
                      format={(n) => `${n}%`}
                      onChange={(v) => ubahWhatIf({ raisePct: v })}
                    />
                  </div>
                  <div {...panelTab('jajan')}>
                    <p className="flex justify-between font-display text-sm font-medium text-tinta">
                      <span>Kalau kopi susu / jajan dikurangi</span>
                      <span className="font-mono font-bold">{whatIf.jajanHematPct > 0 ? `−${whatIf.jajanHematPct}` : 0}%</span>
                    </p>
                    {adaJajan ? (
                      <MoneySlider
                        label="Kalau jajan dikurangi, dalam persen"
                        value={whatIf.jajanHematPct}
                        max={100}
                        step={10}
                        getarTiap={50}
                        format={(n) => `${n}%`}
                        onChange={(v) => ubahWhatIf({ jajanHematPct: v })}
                      />
                    ) : (
                      <p className="pb-4 pt-2 text-sm text-tinta-pudar">Lo nggak swipe gaya hidup apa-apa. Udah hemat.</p>
                    )}
                  </div>
                  <div {...panelTab('nabung')}>
                    <p className="flex justify-between font-display text-sm font-medium text-tinta">
                      <span>Kalau mulai nabung rutin</span>
                      <span className="font-mono font-bold">
                        {whatIf.nabungPerBulan === null ? 'otomatis' : formatRupiahRingkas(whatIf.nabungPerBulan)}
                      </span>
                    </p>
                    <MoneySlider
                      label="Kalau mulai nabung rutin per bulan"
                      value={whatIf.nabungPerBulan ?? 0}
                      max={ASUMSI.NABUNG_SLIDER_MAKS}
                      step={50_000}
                      onChange={(v) => ubahWhatIf({ nabungPerBulan: v === 0 ? null : v })}
                    />
                  </div>
                </div>
                <p className="px-4 pb-3 text-[0.75rem] leading-snug text-tinta-pudar">
                  {sisaKalau <= 0
                    ? `Bulan ini sisa lo minus ${formatRupiah(Math.abs(sisaKalau))}, jadi belum ada yang ditabung${
                        kalau.umurSisaPlus !== null ? ` sampai umur ${kalau.umurSisaPlus}` : ''
                      }. Coba geser gaji atau jajan dulu.`
                    : whatIf.nabungPerBulan === null
                      ? 'Tanpa komitmen, dianggap separuh sisa yang ketabung (separuhnya bocor halus).'
                      : 'Nabung dibatasi sebesar sisa per bulan lo.'}
                  {adaWhatIf && (
                    <>
                      {' '}
                      <button type="button" onClick={() => ubahWhatIf(WHAT_IF_AWAL)} className="font-medium text-tinta underline underline-offset-2">
                        Reset
                      </button>
                    </>
                  )}
                </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="button" onClick={next} className="tombol-cta mt-3 lg:!w-auto lg:min-w-[20rem]">
          Lanjut
        </button>
      </div>
    </section>
  );
}
