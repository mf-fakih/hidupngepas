'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

const BARIS = [
  'GAJI NGEPAS • KOPI SUSU TIAP HARI • PAYLATER 0% • SLIK OJK • TANGGAL TUA • ',
  'CAIR DALAM 5 MENIT • DENDA TELAT • CHECKOUT DULU MIKIR BELAKANGAN • SISA -RP • ',
];

/**
 * Dua baris teks mono raksasa di latar, bergerak berlawanan arah.
 * Kecepatan dan arahnya ikut scroll: scroll ke bawah = baris 1 ke kiri, baris 2 ke kanan,
 * scroll ke atas = sebaliknya; makin cepat scroll, makin kencang.
 * Kecepatan diukur sendiri dari window.scrollY (jalan dengan Lenis maupun scroll native HP).
 */
export function KineticMarquee() {
  const wadah = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const putaran = gsap.utils.toArray<HTMLElement>('[data-pita]').map((pita, i) =>
        gsap.fromTo(
          pita,
          { xPercent: i === 0 ? 0 : -50 },
          { xPercent: i === 0 ? -50 : 0, duration: 48, ease: 'none', repeat: -1 },
        ),
      );

      let arah = 1;
      let yLalu = window.scrollY;
      const tick = () => {
        const v = window.scrollY - yLalu;
        yLalu = window.scrollY;
        if (Math.abs(v) > 0.5) arah = v > 0 ? 1 : -1;
        const target = arah * (1 + Math.min(Math.abs(v) * 0.35, 9));
        // Diredam supaya perubahan kecepatan terasa punya inersia
        putaran.forEach((t) => t.timeScale(gsap.utils.interpolate(t.timeScale(), target, 0.08)));
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={wadah}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-1/2 z-[-1] -translate-y-1/2 select-none overflow-hidden font-mono font-bold uppercase leading-none text-tinta/[0.055]"
    >
      {BARIS.map((teks, i) => (
        <div
          key={i}
          data-pita
          className={`flex w-max whitespace-nowrap text-[clamp(3rem,13vw,8rem)] ${i === 1 ? '-mt-1 text-transparent [-webkit-text-stroke:1.5px_rgb(var(--tinta)/0.09)]' : ''}`}
        >
          {/* Dua salinan: geser -50% = mulus tanpa sambungan */}
          <span className="pr-[0.5em]">{teks.repeat(2)}</span>
          <span className="pr-[0.5em]">{teks.repeat(2)}</span>
        </div>
      ))}
    </div>
  );
}
