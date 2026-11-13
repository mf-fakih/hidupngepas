'use client';

import gsap from 'gsap';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { getar } from '@/lib/sound';
import {
  ASUMSI,
  formatRupiah,
  usePaylater,
  useSimulationStore,
  type BarisPaylater,
} from '@/store/useSimulationStore';

type Fase = 'jalan' | 'jatuh' | 'selesai';

/** Jeda antar bulan: mulai santai, makin lama makin cepat (menyesakkan) */
const jedaBulan = (i: number) => Math.max(140, 950 * 0.78 ** i);

/** Kolektibilitas kasar dari tunggakan beruntun terpanjang (30 hari per bulan telat) */
function kolektibilitas(baris: BarisPaylater[]) {
  let beruntun = 0;
  let maks = 0;
  for (const b of baris) {
    beruntun = b.telat ? beruntun + 1 : 0;
    maks = Math.max(maks, beruntun);
  }
  const hari = maks * 30;
  if (hari === 0) return { kol: 1, label: 'Lancar' };
  if (hari <= 90) return { kol: 2, label: 'Dalam perhatian khusus' };
  if (hari <= 120) return { kol: 3, label: 'Kurang lancar' };
  if (hari <= 180) return { kol: 4, label: 'Diragukan' };
  return { kol: 5, label: 'Macet' };
}

const totalBulan = (b: BarisPaylater) => b.pokok + b.bunga + b.admin + b.denda;

/* ------------------------------------------------------------------ */
/* Satu bulan tagihan di struk merah muda                              */
/* ------------------------------------------------------------------ */

function BulanTagihan({ b, cepat }: { b: BarisPaylater; cepat: number }) {
  const tunggakanLama = b.tagihan - b.pokok - b.bunga - b.admin;
  const rinci: [string, number][] = [
    ['CICILAN POKOK', b.pokok],
    [`BUNGA ${(ASUMSI.PAYLATER_BUNGA * 100).toLocaleString('id-ID')}%`, b.bunga],
    ['BIAYA ADMIN', b.admin],
  ];
  if (tunggakanLama > 0) rinci.push(['TUNGGAKAN LALU', tunggakanLama]);
  if (b.denda > 0) rinci.push([`DENDA TELAT ${ASUMSI.PAYLATER_DENDA * 100}%`, b.denda]);

  return (
    <motion.div
      initial="awal"
      animate="tampil"
      variants={{ tampil: { transition: { staggerChildren: cepat } } }}
      className="py-1.5"
    >
      <motion.p
        variants={{ awal: { opacity: 0 }, tampil: { opacity: 1 } }}
        className="flex items-center gap-2 font-bold"
      >
        <span>{b.namaBulan.toUpperCase()}</span>
        <span aria-hidden className="h-px flex-1 bg-minus-teks/40" />
        {b.telat && (
          <span className="rounded-sm bg-minus px-1.5 text-[0.6875rem] font-bold text-tinta">TELAT</span>
        )}
      </motion.p>
      {rinci.map(([label, nominal]) => (
        <motion.div
          key={label}
          variants={{ awal: { opacity: 0, x: -8 }, tampil: { opacity: 1, x: 0 } }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="struk-baris"
        >
          <span>{label}</span>
          <span aria-hidden className="isi" />
          <span data-angka className="whitespace-nowrap">
            {formatRupiah(nominal)}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 05b — Jalur Paylater                                                */
/* ------------------------------------------------------------------ */

export function Scene05bPaylaterPath() {
  const paylater = usePaylater();
  const next = useSimulationStore((s) => s.next);
  const kurangiGerak = useReducedMotion();

  const [jumlahBulan, setJumlahBulan] = useState(0);
  const [fase, setFase] = useState<Fase>('jalan');

  const layar = useRef<HTMLElement>(null);
  const tumpukan = useRef<HTMLDivElement>(null);
  const bundel = useRef<HTMLDivElement>(null);
  const stempel = useRef<HTMLDivElement>(null);
  /** Konteks GSAP klimaks: hasil akhirnya harus bertahan setelah fase 'selesai', jadi baru di-revert saat unmount */
  const ctxKlimaks = useRef<gsap.Context | null>(null);

  const baris = paylater?.baris ?? [];
  const tampil = baris.slice(0, jumlahBulan);
  // Di bulan terakhir pakai angka resmi store: cicilan pokok per bulan dibulatkan,
  // jadi jumlah 12 bulan bisa selisih beberapa rupiah dari totalKewajiban
  const totalJalan =
    paylater && jumlahBulan >= baris.length
      ? paylater.totalKewajiban
      : tampil.reduce((t, b) => t + totalBulan(b), 0);
  const kol = useMemo(() => kolektibilitas(baris), [baris]);
  const jumlah = (kunci: 'pokok' | 'bunga' | 'admin' | 'denda') => tampil.reduce((t, b) => t + b[kunci], 0);

  const getarLayar = (kuat: number) => {
    if (!layar.current || kurangiGerak) return;
    gsap.fromTo(
      layar.current,
      { x: 0, y: 0 },
      {
        keyframes: {
          x: [0, -kuat, kuat * 0.8, -kuat * 0.5, kuat * 0.3, 0],
          y: [0, kuat * 0.5, -kuat * 0.4, kuat * 0.2, 0],
        },
        duration: 0.38,
        ease: 'power1.out',
        overwrite: true,
      },
    );
  };

  // Reduced motion: semua langsung tampil, tanpa drama
  useEffect(() => {
    if (kurangiGerak && baris.length) {
      setJumlahBulan(baris.length);
      setFase('selesai');
    }
  }, [kurangiGerak, baris.length]);

  // Bulan berjalan sendiri, makin cepat
  useEffect(() => {
    if (fase !== 'jalan' || kurangiGerak || !baris.length) return;
    if (jumlahBulan >= baris.length) {
      const id = window.setTimeout(() => setFase('jatuh'), 650);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setJumlahBulan((n) => n + 1);
      const b = baris[jumlahBulan];
      if (b?.telat) {
        getar(12);
        getarLayar(2 + jumlahBulan * 0.35); // makin akhir makin goyang
      }
    }, jumlahBulan === 0 ? 500 : jedaBulan(jumlahBulan));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, jumlahBulan, baris.length, kurangiGerak]);

  // Scroll / usap = percepat bulan berikutnya
  useEffect(() => {
    if (fase !== 'jalan' || kurangiGerak) return;
    let terakhir = 0;
    const percepat = () => {
      const kini = performance.now();
      if (kini - terakhir < 110) return;
      terakhir = kini;
      setJumlahBulan((n) => Math.min(n + 1, baris.length));
    };
    const onWheel = (e: WheelEvent) => e.deltaY > 8 && percepat();
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', percepat, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', percepat);
    };
  }, [fase, kurangiGerak, baris.length]);

  // Klimaks: tumpukan memadat jadi bundel, bundel jatuh, stempel dibanting
  useEffect(() => () => ctxKlimaks.current?.revert(), []);
  useEffect(() => {
    if (fase !== 'jatuh') return;
    ctxKlimaks.current?.revert();
    ctxKlimaks.current = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setFase('selesai') });
      tl.to(tumpukan.current, {
        scaleY: 0.06,
        scaleX: 0.92,
        autoAlpha: 0,
        transformOrigin: '50% 100%',
        duration: 0.45,
        ease: 'power3.in',
      });
      tl.fromTo(
        bundel.current,
        { autoAlpha: 1, y: () => -window.innerHeight * 1.1, rotate: -14 },
        { y: 0, rotate: -3, duration: 0.55, ease: 'power4.in' },
      );
      tl.call(() => {
        getar([40, 30, 20]);
        getarLayar(14);
      });
      tl.to(bundel.current, { scaleY: 0.96, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: '50% 100%' });
      tl.fromTo(
        stempel.current,
        { autoAlpha: 0, scale: 2.8, rotate: -26 },
        { autoAlpha: 1, scale: 1, rotate: -9, duration: 0.3, ease: 'power4.in' },
        '+=0.35',
      );
      tl.call(() => {
        getar(30);
        getarLayar(8);
      });
    }, layar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  if (!paylater) return null;

  const ditolak = paylater.slikBermasalah;
  const lewati = () => {
    setJumlahBulan(baris.length);
    setFase((f) => (f === 'jalan' ? 'jatuh' : f));
  };

  return (
    <section ref={layar} className="scene scene-split" aria-labelledby="judul-paylater">
      <div className="kolom-kiri">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
            Babak 2 — Jalur A · Paylater
          </p>
          <h2
            id="judul-paylater"
            data-judul-scene
            tabIndex={-1}
            className="text-judul font-bold text-tinta outline-none lg:judul-editorial"
          >
            {fase === 'selesai' ? 'Setahun kemudian.' : 'Cair. Enak, kan?'}
          </h2>
          <p className="mt-1 text-tinta-pudar lg:mt-5 lg:text-lg lg:text-tinta">
            {formatRupiah(paylater.dicairkan)} masuk. Sekarang tagihannya.
          </p>
        </div>
        {fase === 'jalan' && (
          <button
            type="button"
            onClick={lewati}
            className="inline-flex min-h-sentuh shrink-0 items-center px-2 font-display text-sm font-medium text-tinta underline underline-offset-4"
          >
            Lewati
          </button>
        )}
      </div>

      {/* Penghitung total tagihan yang terus naik */}
      <div className="mt-4 flex items-end justify-between border-y-2 border-dashed border-minus-teks/40 py-2">
        <span className="font-mono text-struk text-minus-teks">
          {tampil.length ? `S/D ${tampil[tampil.length - 1].namaBulan.toUpperCase()}` : 'TOTAL TAGIHAN'}
        </span>
        <RollingNumber value={totalJalan} className="font-mono text-2xl font-bold text-minus lg:text-5xl lg:tracking-tighter" />
      </div>

      {/* Desktop: rincian yang ikut menumpuk */}
      <div aria-hidden className="mt-4 hidden lg:block">
        {(
          [
            ['PKK-01', 'CICILAN POKOK', jumlah('pokok'), false],
            ['BNG-02', 'BUNGA', jumlah('bunga'), false],
            ['ADM-03', 'BIAYA ADMIN', jumlah('admin'), false],
            ['DND-04', 'DENDA TELAT', jumlah('denda'), true],
          ] as const
        ).map(([kode, label, nilai, merah], i) => (
          <div key={kode} className={`ledger ${i === 0 ? 'border-t-2 border-t-tinta' : ''}`}>
            <span className="kode">{kode}</span>
            <span>{label}</span>
            <span className={`nilai ${merah && nilai > 0 ? 'text-minus-teks' : ''}`}>{formatRupiah(nilai)}</span>
          </div>
        ))}
      </div>
      </div>

      <div className="kolom-kanan">

      <div className={`relative mt-4 lg:mt-12 ${fase === 'jalan' ? '' : 'mb-24 lg:mb-28'}`}>
        {/* Struk merah muda yang menumpuk: bulan baru di bawah, bulan lama terdorong ke atas */}
        <div
          ref={tumpukan}
          aria-live="off"
          className={`struk tekstur-thermal flex flex-col justify-end overflow-hidden !text-minus-teks ${
            fase === 'selesai' ? 'h-auto max-h-[22rem]' : 'h-[min(50dvh,26rem)] lg:h-[min(64dvh,36rem)]'
          }`}
          data-jalur="paylater"
          style={fase === 'selesai' && !kurangiGerak ? { display: 'none' } : undefined}
        >
          {/* Bulan lama memudar ke atas (bukan mask-image: .struk sudah memakai mask untuk gerigi) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-kertas-paylater to-kertas-paylater/0"
          />
          {tampil.map((b, i) => (
            <BulanTagihan key={b.bulan} b={b} cepat={Math.max(0.015, 0.07 * 0.82 ** i)} />
          ))}
        </div>

        {/* Bundel dokumen SLIK: tersembunyi sampai klimaks */}
        <div
          ref={bundel}
          className={`${fase === 'jalan' ? 'invisible absolute inset-x-0 top-0' : 'relative'} mx-auto max-w-struk lg:max-w-[26rem]`}
          style={fase === 'jatuh' ? { position: 'absolute', insetInline: 0, top: 0 } : undefined}
        >
          <div className="relative">
            {/* Lembar-lembar di belakang = tebal dokumen */}
            {[3, 2, 1].map((n) => (
              <div
                key={n}
                aria-hidden
                className="absolute inset-0 rounded-sm border-2 border-tinta bg-kertas-lipat"
                style={{ transform: `translate(${n * 4}px, ${n * 5}px)` }}
              />
            ))}
            <span aria-hidden className="selotip -top-3 left-8 hidden lg:block" style={{ ['--putar' as string]: '-3deg' }} />
            <div className="tekstur-thermal relative rounded-sm border-2 border-tinta px-5 pb-6 pt-5 font-mono text-struk text-tinta shadow-tombol">
              <p className="text-[0.6875rem] tracking-[0.2em] text-tinta-pudar">DOKUMEN · RAHASIA</p>
              <p className="mt-2 font-display text-2xl font-bold leading-tight">Riwayat SLIK OJK</p>
              <p className="text-tinta-pudar">100 halaman · atas nama lo</p>
              <hr className="garis-putus" />
              <div className="struk-baris">
                <span>KOLEKTIBILITAS</span>
                <span aria-hidden className="isi" />
                <span className={`font-bold ${kol.kol > 1 ? 'text-minus-teks' : ''}`}>
                  KOL {kol.kol} · {kol.label.toUpperCase()}
                </span>
              </div>
              <div className="struk-baris">
                <span>BULAN TELAT</span>
                <span aria-hidden className="isi" />
                <span>{paylater.bulanTelat}/{ASUMSI.PAYLATER_TENOR}</span>
              </div>
              <div className="struk-baris">
                <span>TOTAL DIBAYAR</span>
                <span aria-hidden className="isi" />
                <span data-angka className="whitespace-nowrap font-bold">
                  {formatRupiah(paylater.totalKewajiban)}
                </span>
              </div>
              <p className="mt-1 text-[0.6875rem] text-tinta-pudar">
                Dari pinjaman {formatRupiah(paylater.dicairkan)}. Bunga {formatRupiah(paylater.totalBunga)},
                admin {formatRupiah(paylater.totalAdmin)}, denda {formatRupiah(paylater.totalDenda)}.
              </p>
            </div>

            {/* Stempel */}
            <div
              ref={stempel}
              className={`${fase === 'selesai' ? '' : 'invisible'} pointer-events-none absolute inset-x-0 top-full mt-3 flex justify-center lg:justify-end lg:pr-2`}
            >
              <p
                className={`-rotate-[9deg] rounded-md border-[5px] px-3 py-2 text-center font-display text-[clamp(1.35rem,6.5vw,1.9rem)] font-bold leading-[1.05] tracking-tight mix-blend-multiply ${
                  ditolak ? 'border-minus text-minus' : 'border-tinta text-tinta'
                }`}
              >
                {ditolak ? (
                  <>
                    PENGAJUAN KPR LO:
                    <br />
                    DITOLAK
                  </>
                ) : (
                  <>
                    LUNAS.
                    <br />
                    TAPI MAHAL.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p role="status" className="hanya-sr">
        {fase === 'selesai'
          ? `Setahun paylater: total dibayar ${formatRupiah(paylater.totalKewajiban)}, telat ${paylater.bulanTelat} bulan. ${
              ditolak ? 'Riwayat SLIK bermasalah, pengajuan KPR ditolak.' : 'Lunas, tapi bunganya mahal.'
            }`
          : ''}
      </p>

      <div className="zona-jempol">
        <AnimatePresence>
          {fase === 'selesai' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.5 }}
            >
              <button type="button" onClick={next} className="tombol-cta">
                Oke, gue ngerti. Lanjut.
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </section>
  );
}
