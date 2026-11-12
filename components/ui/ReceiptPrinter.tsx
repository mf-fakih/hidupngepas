'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  children: ReactNode;
  /** Varian kertas: 'paylater' = struk merah muda */
  jalur?: 'biasa' | 'paylater';
  /** Dipanggil sekali saat kertas selesai keluar penuh (atau langsung, kalau reduced motion) */
  onSelesaiCetak?: () => void;
  className?: string;
}

/** Bagian kertas yang keluar otomatis saat scene dibuka; sisanya ditarik oleh scroll */
const KELUAR_AWAL = 0.62;
/** Kemiringan awal kertas (derajat), seolah masih melengkung keluar dari gulungan */
const MIRING_AWAL = 16;

/**
 * Printer thermal dengan kertas yang di-scrub scroll.
 *
 *   1. Intro: kertas keluar ±62% dari celah (dibuka dari atas lewat clip-path),
 *      baris-barisnya tercetak patah-patah.
 *   2. Scroll: kertas terus ditarik keluar sampai penuh, sambil meluruskan diri dari
 *      kemiringan 3D (rotateX) dan bayangan di bawah gulungan menipis.
 *      Kecepatan scroll ikut menambah "goyangan" kecil pada kertas.
 *   3. Kertas penuh → [data-cap-struk] (SISA) dicap.
 *   Struk pendek yang tidak bisa di-scroll langsung keluar penuh.
 *
 * Penanda di dalam children:
 *   [data-baris-struk]  baris yang muncul bertahap
 *   [data-cap-struk]    elemen yang "dicap" saat kertas keluar penuh
 */
export function ReceiptPrinter({ children, jalur = 'biasa', onSelesaiCetak, className = '' }: Props) {
  const wadah = useRef<HTMLDivElement>(null);
  const kertas = useRef<HTMLDivElement>(null);
  const lembar = useRef<HTMLDivElement>(null);
  const bayangan = useRef<HTMLDivElement>(null);
  const onSelesaiRef = useRef(onSelesaiCetak);
  onSelesaiRef.current = onSelesaiCetak;

  useEffect(() => {
    const elWadah = wadah.current;
    const elKertas = kertas.current;
    const elLembar = lembar.current;
    const elBayangan = bayangan.current;
    if (!elWadah || !elKertas || !elLembar || !elBayangan) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSelesaiRef.current?.();
      return;
    }

    const ctx = gsap.context(() => {
      const baris = gsap.utils.toArray<HTMLElement>('[data-baris-struk]');
      const cap = gsap.utils.toArray<HTMLElement>('[data-cap-struk]');
      let sudahCap = false;

      const capKan = () => {
        if (sudahCap) return;
        sudahCap = true;
        onSelesaiRef.current?.();
        gsap.to(cap, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.5, ease: 'back.out(2.2)' });
      };

      gsap.set(baris, { autoAlpha: 0, y: -6 });
      gsap.set(cap, { autoAlpha: 0, scale: 1.35, rotate: -6 });
      gsap.set(elLembar, { transformPerspective: 900, transformOrigin: '50% 0%', rotateX: MIRING_AWAL });

      // Cukup ruang scroll untuk menarik sisa kertas? Kalau tidak, keluarkan penuh.
      const bisaScrub = ScrollTrigger.maxScroll(window) > 120;
      const keluar = bisaScrub ? KELUAR_AWAL : 1;

      // Kertas dibuka dari atas ke bawah: bagian atas struk (kepala) keluar duluan.
      // Ditulis manual dari satu angka (0 = tergulung, 1 = keluar penuh): tween string
      // clip-path di dalam timeline scrub tidak bisa diandalkan.
      const kertasKeluar = { p: 0 };
      const gambar = () => {
        elKertas.style.clipPath = `inset(0% 0% ${((1 - kertasKeluar.p) * 100).toFixed(2)}% 0%)`;
      };
      gambar();

      const intro = gsap.timeline();
      intro.to(kertasKeluar, { p: keluar, duration: 1.1, ease: 'power3.out', onUpdate: gambar });
      intro.fromTo(elKertas, { y: -14 }, { y: 0, duration: 1.1, ease: 'power3.out' }, 0);
      intro.to(elLembar, { rotateX: bisaScrub ? MIRING_AWAL * 0.55 : 0, duration: 1.1, ease: 'power2.out' }, 0);
      intro.fromTo(elBayangan, { opacity: 0.9, scaleX: 0.7 }, { opacity: 0.55, scaleX: 1, duration: 1.1 }, 0);
      intro.to(baris, { autoAlpha: 1, y: 0, duration: 0.16, ease: 'steps(3)', stagger: 0.045 }, 0.35);

      if (!bisaScrub) {
        intro.call(capKan);
        intro.to(elBayangan, { opacity: 0.2, duration: 0.4 });
        return;
      }

      intro.call(() => {
        // Scrub memakai seluruh ruang scroll scene (scene ini satu-satunya isi halaman),
        // jadi kertas pasti keluar penuh tepat sebelum mentok bawah
        const tarik = gsap.timeline({
          scrollTrigger: {
            start: 0,
            end: () => Math.max(ScrollTrigger.maxScroll(window) - 24, 60),
            scrub: 0.6,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (self.progress > 0.92) capKan();
              // Kertas sedikit "terangkat" sebanding kecepatan scroll, lalu kembali rata
              const v = gsap.utils.clamp(0, 6, Math.abs(self.getVelocity()) / 500);
              gsap.to(elLembar, { z: v * 6, duration: 0.4, overwrite: 'auto' });
            },
          },
        });
        tarik.fromTo(kertasKeluar, { p: KELUAR_AWAL }, { p: 1, ease: 'none', onUpdate: gambar }, 0);
        tarik.fromTo(elLembar, { rotateX: MIRING_AWAL * 0.55 }, { rotateX: 0, ease: 'power1.out' }, 0);
        tarik.fromTo(elBayangan, { opacity: 0.55, scaleY: 1 }, { opacity: 0.15, scaleY: 0.4, ease: 'none' }, 0);
      });
    }, elWadah);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={wadah} className={`relative ${className}`}>
      {/* Mulut printer */}
      <div
        aria-hidden
        className="relative z-10 mx-auto h-4 w-full max-w-[23.5rem] rounded-full border-2 border-tinta bg-tinta shadow-[0_3px_0_rgb(var(--tinta)/0.25)]"
      />
      {/* Bayangan gulungan: gelap saat kertas masih banyak di dalam, menipis saat keluar */}
      <div
        ref={bayangan}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-3 z-[5] mx-auto h-10 w-full max-w-struk origin-top bg-gradient-to-b from-tinta/50 to-tinta/0 blur-[6px]"
      />
      {/* Kertas tergulung di balik mulut printer; overflow-hidden = celahnya */}
      <div className="-mt-2 overflow-hidden pb-8 [perspective:900px]">
        <div ref={kertas} className="siap-gerak">
          <div ref={lembar} className="siap-gerak">
            {/* tekstur-thermal ditulis eksplisit: selector [data-jalur] di globals.css butuh kelas ini */}
            <div
              className="struk tekstur-thermal"
              data-jalur={jalur === 'paylater' ? 'paylater' : undefined}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
