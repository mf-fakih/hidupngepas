'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

/**
 * Pill kecil yang mengikuti kursor dan memberi tahu apa yang bisa dilakukan:
 * elemen cukup diberi data-kursor="GESER" | "SOBEK ✂" | "ATUR".
 * Dipasang sekali lewat event delegation. Hanya mouse/trackpad di layar lg ke atas;
 * kursor asli tetap tampil, pill hanya menemani (dekoratif, aria-hidden).
 */
export function KursorKonteks() {
  const pill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = pill.current;
    if (!el) return;

    const mq = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
    const kurangiGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion: pill menempel langsung ke kursor, tanpa ayunan
    const durasi = kurangiGerak ? 0 : 0.28;
    const keX = gsap.quickTo(el, 'x', { duration: durasi, ease: 'power3.out' });
    const keY = gsap.quickTo(el, 'y', { duration: durasi, ease: 'power3.out' });

    let teks = '';
    const tampil = (baru: string) => {
      if (baru === teks) return;
      teks = baru;
      if (baru) el.textContent = baru;
      gsap.to(el, {
        autoAlpha: baru ? 1 : 0,
        scale: baru || kurangiGerak ? 1 : 0.6,
        duration: kurangiGerak ? 0 : 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !mq.matches) {
        tampil('');
        return;
      }
      const sumber = (e.target as Element | null)?.closest<HTMLElement>('[data-kursor]');
      tampil(sumber?.dataset.kursor ?? '');
      keX(e.clientX + 16);
      keY(e.clientY + 18);
    };
    const sembunyi = () => tampil('');

    gsap.set(el, { autoAlpha: 0, scale: kurangiGerak ? 1 : 0.6 });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', sembunyi);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', sembunyi);
      gsap.killTweensOf(el);
    };
  }, []);

  return (
    <div
      ref={pill}
      aria-hidden
      className="mikro pointer-events-none invisible fixed left-0 top-0 z-[80] origin-top-left whitespace-nowrap rounded-full border-2 border-tinta bg-tinta px-3 py-1.5 font-bold text-kertas shadow-[3px_3px_0_rgb(var(--tinta)/0.25)]"
    />
  );
}
