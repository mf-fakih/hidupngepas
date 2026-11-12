import type { Config } from 'tailwindcss';

/**
 * Hidup Ngepas — token desain.
 * Warna ditulis sebagai channel RGB di globals.css supaya opacity Tailwind
 * tetap jalan (contoh: bg-tinta/10, text-minus/80).
 */
const warna = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palet inti dari spesifikasi
        kertas: {
          DEFAULT: warna('--kertas'), // #F4EFE6
          lipat: warna('--kertas-lipat'), // sisi gelap lipatan struk
          paylater: warna('--kertas-paylater'), // #FFE5E6, struk merah muda scene 05b
        },
        tinta: {
          DEFAULT: warna('--tinta'), // #141414
          pudar: warna('--tinta-pudar'), // cetakan thermal yang mulai luntur
        },
        minus: {
          DEFAULT: warna('--minus'), // #E5383B — blok warna, ikon, angka besar
          teks: warna('--minus-teks'), // versi gelap, lolos AA untuk teks kecil
        },
        aman: {
          DEFAULT: warna('--aman'), // #2DC653 — blok warna, ikon, angka besar
          teks: warna('--aman-teks'), // versi gelap, lolos AA untuk teks kecil
        },
        neon: warna('--neon'), // #C6FF3D — khusus CTA, selalu dengan teks tinta
      },

      fontFamily: {
        display: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        // Skala headline yang ikut lebar layar (mobile-first)
        headline: ['clamp(2.5rem, 9vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        judul: ['clamp(1.75rem, 5.5vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        struk: ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.01em' }],
      },

      spacing: {
        sentuh: '44px', // target sentuh minimum
        'aman-bawah': 'env(safe-area-inset-bottom, 0px)',
        'aman-atas': 'env(safe-area-inset-top, 0px)',
      },

      maxWidth: {
        struk: '22rem', // lebar kertas thermal 80mm di layar
        scene: '30rem', // kolom konten mobile
      },

      borderRadius: {
        chip: '999px',
        kartu: '1.25rem',
      },

      boxShadow: {
        // Bayangan keras ala kertas di atas meja, bukan soft-shadow generik
        struk: '0 1px 0 rgb(var(--tinta) / 0.08), 0 18px 30px -18px rgb(var(--tinta) / 0.45)',
        // Bayangan brutalist: memendek saat ditekan
        tombol: '4px 4px 0 rgb(var(--tinta))',
        'tombol-tekan': '1px 1px 0 rgb(var(--tinta))',
      },

      transitionTimingFunction: {
        pegas: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // chip "melompat"
        cetak: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // kertas keluar dari printer
      },

      keyframes: {
        // SISA minus berkedip seperti layar kasir
        kedip: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.25' },
        },
        // Fallback CSS untuk struk keluar dari atas (versi GSAP menyusul di ReceiptPrinter)
        cetak: {
          from: { clipPath: 'inset(0 0 100% 0)', transform: 'translateY(-12px)' },
          to: { clipPath: 'inset(0 0 0 0)', transform: 'translateY(0)' },
        },
        lompat: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(0.94)' },
          '100%': { transform: 'scale(1)' },
        },
      },

      animation: {
        kedip: 'kedip 1s steps(1, end) infinite',
        cetak: 'cetak 900ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        lompat: 'lompat 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
