'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { ASUMSI, formatRupiah } from '@/store/useSimulationStore';

interface Props {
  /** Dipanggil tepat sekali saat preloader selesai, di-skip, atau kena batas 2 detik */
  onDone: () => void;
}

const DURASI_HITUNG = 1.2; // detik, sesuai spesifikasi
const BATAS_MAKS = 2000; // ms, apa pun yang terjadi preloader hilang di sini
const TARGET = ASUMSI.UPAH_RATA_20_24; // Rp 2.720.000
const KARAKTER_AKHIR = formatRupiah(TARGET).split('');

/**
 * 00 — Preloader
 * Angka rupiah berputar Rp 0 → Rp 2.720.000 (1,2 detik), lalu "pecah":
 * tiap karakter jatuh ke bawah, ke arah hero, tempat koin-koin mendarat.
 */
export function Scene00Preloader({ onDone }: Props) {
  const layar = useRef<HTMLDivElement>(null);
  const angka = useRef<HTMLParagraphElement>(null);
  const sudahSelesai = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const selesai = () => {
    if (sudahSelesai.current) return;
    sudahSelesai.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    const elLayar = layar.current;
    const elAngka = angka.current;
    if (!elLayar || !elAngka) return;

    const batas = window.setTimeout(selesai, BATAS_MAKS);
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion: angka akhir langsung tampil, tanpa putaran dan tanpa pecah
    if (kurangiGerak) {
      elAngka.textContent = formatRupiah(TARGET);
      const sebentar = window.setTimeout(selesai, 500);
      return () => {
        window.clearTimeout(batas);
        window.clearTimeout(sebentar);
      };
    }

    const ctx = gsap.context(() => {
      const hitung = { nilai: 0 };
      const tl = gsap.timeline({ onComplete: selesai });

      tl.to(hitung, {
        nilai: TARGET,
        duration: DURASI_HITUNG,
        ease: 'power3.out',
        onUpdate: () => {
          // Dibulatkan ke ribuan supaya digit belakang ikut "berputar" tanpa jadi noise
          elAngka.textContent = formatRupiah(Math.round(hitung.nilai / 1000) * 1000);
        },
      });

      // Pecah: angka hitung ditukar dengan kembarannya yang sudah dibelah per karakter
      // (dirender React sejak awal, jadi GSAP bisa menemukannya saat timeline dibuat)
      tl.set(elAngka, { autoAlpha: 0 });
      tl.set('[data-pecahan-wadah]', { autoAlpha: 1 }, '<');

      tl.to('[data-pecahan]', {
        y: () => gsap.utils.random(220, 420),
        x: () => gsap.utils.random(-40, 40),
        rotation: () => gsap.utils.random(-70, 70),
        opacity: 0,
        duration: 0.42,
        ease: 'power2.in',
        stagger: { each: 0.015, from: 'random' },
      });

      tl.to('[data-pudar]', { opacity: 0, duration: 0.2 }, '<');
      tl.to(elLayar, { autoAlpha: 0, duration: 0.22, ease: 'power1.out' }, '-=0.18');
    }, elLayar);

    return () => {
      window.clearTimeout(batas);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={layar}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-kertas px-5"
    >
      <div className="grid font-mono text-[clamp(2rem,10vw,4rem)] font-bold leading-none text-tinta">
        <p ref={angka} aria-hidden data-angka className="col-start-1 row-start-1 text-center">
          Rp 0
        </p>
        <p
          aria-hidden
          data-angka
          data-pecahan-wadah
          className="invisible col-start-1 row-start-1 text-center"
        >
          {KARAKTER_AKHIR.map((k, i) => (
            <span key={i} data-pecahan className="inline-block">
              {k === ' ' ? '\u00A0' : k}
            </span>
          ))}
        </p>
      </div>

      <p role="status" data-pudar className="mt-5 font-display text-lg text-tinta-pudar">
        Lagi ngitung nasib lo...
      </p>

      <button
        type="button"
        onClick={selesai}
        data-pudar
        className="absolute inset-x-0 bottom-0 mx-auto mb-[calc(1rem+env(safe-area-inset-bottom,0px))] inline-flex min-h-sentuh w-fit items-center rounded-chip px-5 font-display text-sm font-medium text-tinta underline underline-offset-4"
      >
        Lewati
      </button>
    </div>
  );
}
