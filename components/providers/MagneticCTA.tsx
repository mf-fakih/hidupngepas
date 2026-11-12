'use client';

import gsap from 'gsap';
import { useEffect } from 'react';

const TARIKAN = 0.28; // seberapa kuat tombol mengikuti kursor
const MAKS = 12; // px

/**
 * Efek magnet untuk semua .tombol-cta, dipasang sekali lewat event delegation
 * supaya tiap scene tidak perlu membungkus tombolnya sendiri.
 * Hanya untuk mouse/trackpad (hover: hover); di HP yang ada efek tekan dari CSS.
 * GSAP menulis --mx/--my, bukan transform, jadi efek :active di CSS tetap jalan.
 */
export function MagneticCTA() {
  useEffect(() => {
    const bisaHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!bisaHover || kurangiGerak) return;

    let aktif: HTMLElement | null = null;
    const jepit = (n: number) => Math.max(-MAKS, Math.min(MAKS, n));

    const lepas = (el: HTMLElement) =>
      gsap.to(el, { '--mx': '0px', '--my': '0px', duration: 0.7, ease: 'elastic.out(1, 0.4)', overwrite: true });

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const target = (e.target as Element | null)?.closest<HTMLElement>('.tombol-cta:not(:disabled)') ?? null;

      if (aktif && aktif !== target) lepas(aktif);
      aktif = target;
      if (!target) return;

      const r = target.getBoundingClientRect();
      const dx = jepit((e.clientX - (r.left + r.width / 2)) * TARIKAN);
      const dy = jepit((e.clientY - (r.top + r.height / 2)) * TARIKAN);
      gsap.to(target, { '--mx': `${dx}px`, '--my': `${dy}px`, duration: 0.35, ease: 'power3.out', overwrite: true });
    };

    const onLeaveWindow = () => {
      if (aktif) lepas(aktif);
      aktif = null;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeaveWindow);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeaveWindow);
    };
  }, []);

  return null;
}
