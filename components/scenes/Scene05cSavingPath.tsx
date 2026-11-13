'use client';

import gsap from 'gsap';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { getar, playKaChing } from '@/lib/sound';
import {
  formatRupiah,
  formatRupiahRingkas,
  slipSetoran,
  useSimulasi,
  useSimulationStore,
} from '@/store/useSimulationStore';

const JUMLAH_LEMBAR = 12; // satu lembar = satu bulan

/** Geseran & kemiringan tiap lembar: tumpukan asli nggak pernah rapi sempurna */
const ACAK = [
  [-5, -1.2], [4, 0.8], [-2, 0.4], [6, -0.9], [-6, 1.1], [1, -0.5],
  [5, 0.9], [-4, -1], [2, 0.6], [-1, -0.7], [4, 1.2], [-3, 0.3],
] as const;

/**
 * 05c — Jalur Nabung
 * Tumpukan lembar tipografis: dua belas lembar "slip setoran" jatuh satu per satu
 * dan menumpuk dari bawah. Lembar awal pelan, berikutnya makin lancar.
 *
 * Jujur soal angka: kalau struk masih minus, slipnya KOSONG & tercoret (Rp 0),
 * keputusan nolak utang tetap diapresiasi, dan ada jalan balik ke struk.
 * Kalau plus, slip memuat setoran yang sebenarnya (proyeksi.nabungPerBulan).
 */
export function Scene05cSavingPath() {
  const sim = useSimulasi();
  const soundOn = useSimulationStore((s) => s.soundOn);
  const next = useSimulationStore((s) => s.next);
  const goTo = useSimulationStore((s) => s.goTo);

  const tumpukan = useRef<HTMLOListElement>(null);
  const [masuk, setMasuk] = useState(0);
  const [selesai, setSelesai] = useState(false);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const el = tumpukan.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el.querySelectorAll('[data-lembar]'), { autoAlpha: 1 });
      setMasuk(JUMLAH_LEMBAR);
      setSelesai(true);
      return;
    }

    const ctx = gsap.context(() => {
      const lembar = gsap.utils.toArray<HTMLElement>('[data-lembar]');
      const tl = gsap.timeline({ delay: 0.5, onComplete: () => setSelesai(true) });

      lembar.forEach((l, i) => {
        // Lembar awal pelan, berikutnya makin lancar: kebiasaan yang terbentuk
        const jeda = Math.max(0.1, 0.5 * 0.82 ** i);
        tl.set(l, { y: -160 - i * 6, rotate: gsap.utils.random(-14, 14), autoAlpha: 1 }, `+=${jeda}`);
        tl.to(l, { y: 0, rotate: 0, duration: 0.5, ease: 'bounce.out' });
        tl.call(
          () => {
            setMasuk(i + 1);
            getar(6);
            if (soundRef.current) playKaChing();
          },
          undefined,
          '-=0.32',
        );
        // Tumpukan di bawahnya ikut "kena timpa"
        if (i > 0) {
          tl.fromTo(
            lembar.slice(0, i),
            { scaleY: 0.86 },
            { scaleY: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.4)', transformOrigin: '50% 100%' },
            '-=0.32',
          );
        }
      });
    }, el);

    return () => ctx.revert();
  }, []);

  const bulanan = sim?.bulanan;
  const minus = bulanan && bulanan.isMinus ? Math.abs(bulanan.sisa) : 0;
  const { kosong, setoran } = sim ? slipSetoran(sim) : { kosong: true, setoran: 0 };

  return (
    <section className="scene scene-split" aria-labelledby="judul-nabung">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
          Babak 2 — Jalur B · Tanpa utang
        </p>
        <h2 id="judul-nabung" data-judul-scene tabIndex={-1} className="judul-editorial">
          {kosong ? 'Nolak utang: bener. Slipnya masih kosong.' : 'Pelan, tapi punya lo sendiri.'}
        </h2>
        <p className="mt-2 text-tinta-pudar lg:mt-5 lg:max-w-[32ch] lg:text-lg lg:text-tinta">
          {kosong
            ? 'Bunga 0%, SLIK bersih, nggak ada yang nagih jam 9 malem. Itu udah menang satu ronde.'
            : 'Nolak paylater: bunga 0%, SLIK bersih, nggak ada yang nagih jam 9 malem.'}
        </p>

        {/* Apa saja yang TIDAK lo bayar (tampil di HP juga) */}
        <div className="mt-4 lg:mt-8">
          <div className="ledger border-t-2 border-t-tinta">
            <span className="kode">BNG-00</span>
            <span>BUNGA + DENDA</span>
            <span className="nilai">Rp 0</span>
          </div>
          <div className="ledger">
            <span className="kode">SLK-01</span>
            <span>CATATAN SLIK</span>
            <span className="nilai">BERSIH</span>
          </div>
          <div className="ledger">
            <span className="kode">TGH-02</span>
            <span>TELEPON PENAGIH</span>
            <span className="nilai">0 KALI</span>
          </div>
        </div>
      </div>

      <div className="kolom-kanan">
        <div className="my-6 flex flex-1 flex-col items-center justify-center lg:my-0 lg:flex-row lg:items-end lg:justify-start lg:gap-14 lg:pb-10">
          <div className="relative w-[min(17rem,78vw)] lg:w-[21rem]">
            <ol
              ref={tumpukan}
              role="img"
              aria-label={`Tumpukan tabungan, ${masuk} dari ${JUMLAH_LEMBAR} lembar bulanan sudah masuk`}
              className="flex min-h-[19.5rem] flex-col-reverse lg:min-h-[23.5rem]"
            >
              {Array.from({ length: JUMLAH_LEMBAR }, (_, i) => (
                <li key={i} data-lembar aria-hidden className="-mt-[3px] first:mt-0" style={{ visibility: 'hidden' }}>
                  <div
                    className={`flex h-[1.6rem] items-stretch border-2 bg-kertas font-mono text-[0.6875rem] font-bold leading-none lg:h-[1.95rem] lg:text-xs ${
                      kosong
                        ? 'border-dashed border-tinta/60 text-tinta-pudar'
                        : 'border-tinta text-tinta shadow-[2px_2px_0_rgb(var(--tinta)/0.2)]'
                    }`}
                    style={{ transform: `translateX(${ACAK[i][0]}px) rotate(${ACAK[i][1]}deg)` }}
                  >
                    {/* Berisi: blok hijau asli + teks tinta (aman kontrasnya). Kosong: tanpa warna. */}
                    <span
                      className={`grid w-9 place-items-center border-r-2 lg:w-11 ${
                        kosong ? 'border-dashed border-tinta/60' : 'border-tinta bg-aman'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex flex-1 items-center justify-between gap-2 px-2 tracking-[0.14em]">
                      <span className={kosong ? 'line-through' : ''}>SETOR BLN</span>
                      <span className="flex-1 border-b border-dotted border-tinta/40" />
                      <span className={kosong ? 'line-through' : ''}>
                        {kosong ? 'Rp 0' : formatRupiahRingkas(setoran)}
                      </span>
                    </span>
                    <span className="w-2 border-l-2 border-tinta bg-[repeating-linear-gradient(0deg,rgb(var(--tinta))_0_2px,transparent_2px_4px)]" />
                  </div>
                </li>
              ))}
            </ol>
            {/* Alas meja */}
            <div aria-hidden className="mt-1 h-1 rounded-full bg-tinta" />

            {selesai && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, scale: 1.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                className="absolute -right-3 top-6 lg:-right-10"
              >
                <span
                  className={`stempel bg-kertas/70 text-base lg:text-xl ${kosong ? 'text-tinta' : 'text-aman-teks'}`}
                  style={{ ['--putar' as string]: '3deg' }}
                >
                  {kosong ? 'Utang: 0' : '0% bunga'}
                </span>
              </motion.span>
            )}
          </div>

          <div className="mt-4 text-center lg:mt-0 lg:pb-2 lg:text-left">
            <p className="mikro text-tinta-pudar" aria-hidden>
              Bulan ke
            </p>
            <p className="font-mono text-struk text-tinta lg:text-8xl lg:font-bold lg:leading-[0.85] lg:tracking-tighter" aria-hidden>
              {String(masuk).padStart(2, '0')}
              <span className="lg:text-3xl lg:text-tinta-pudar">/{JUMLAH_LEMBAR}</span>
            </p>
            <p className="mt-2 max-w-[26ch] text-sm leading-snug text-tinta lg:mt-5">
              {kosong ? (
                <>
                  Terkumpul: <strong className="whitespace-nowrap font-mono">Rp 0</strong>. Slip baru keisi kalau
                  struknya udah plus.
                </>
              ) : (
                <>
                  Setoran {formatRupiahRingkas(setoran)}/bulan, terkumpul{' '}
                  <strong className="whitespace-nowrap font-mono">{formatRupiah(setoran * masuk)}</strong>
                </>
              )}
            </p>
          </div>
        </div>

        {minus > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: selesai ? 1 : 0, y: selesai ? 0 : 8 }}
            className="rounded-kartu border-2 border-dashed border-tinta/50 p-3 text-sm text-tinta lg:max-w-[34rem]"
          >
            Struk lo masih minus <strong className="whitespace-nowrap">{formatRupiah(minus)}</strong>/bulan.
            Tambalnya pakai keputusan, bukan utang: sobek satu-dua gaya hidup, sisanya baru masuk sini.
          </motion.p>
        )}

        <div className="zona-jempol">
          <button type="button" onClick={next} className="tombol-cta">
            {kosong ? 'Lanjut lihat masa depan' : 'Lanjut'}
          </button>
          {kosong && (
            // Sobekan & jawaban lain tersimpan: balik ke struk tanpa mengulang apa pun
            <button
              type="button"
              onClick={() => goTo('struk')}
              className="mx-auto mt-2 flex min-h-sentuh items-center px-4 font-display text-sm font-medium text-tinta underline underline-offset-4 lg:mx-0 lg:px-0"
            >
              Balik ke struk, sobek gaya hidup
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
