'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';
import { setLenis } from '@/lib/lenis';

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis + GSAP ScrollTrigger dalam satu ticker.
 *   - Wheel di desktop dihaluskan Lenis; sentuhan di HP tetap scroll native
 *     (syncTouch mati) supaya swipe kartu, slider, dan zona jempol tidak terganggu.
 *   - Lenis menggerakkan scroll window asli, jadi ScrollTrigger cukup di-update
 *     tiap event scroll Lenis, tanpa scrollerProxy.
 *   - Reduced motion: Lenis tidak dipasang sama sekali.
 *
 * Sekalian memasang <html data-hemat-kuota> kalau browser minta hemat data.
 */
export function SmoothScroll() {
  useEffect(() => {
    const koneksi = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (koneksi?.saveData) document.documentElement.setAttribute('data-hemat-kuota', '');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true, syncTouch: false });
    setLenis(lenis);

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (waktu: number) => lenis.raf(waktu * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
