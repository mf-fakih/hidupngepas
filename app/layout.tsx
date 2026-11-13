import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Font di-host sendiri dari paket @fontsource: build tidak bergantung pada Google Fonts.

const spaceGrotesk = localFont({
  src: [
    { path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: [
    { path: '../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/** Domain produksi. Bisa ditimpa lewat env kalau domainnya pindah. */
const URL_SITUS = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hidupngepas.vercel.app';
const JUDUL = 'Hidup Ngepas — Gaji lo cukup buat hidup?';
const DESKRIPSI =
  'Simulator realita finansial Gen Z. Dua menit, tanpa login, dihitung di HP lo: struk bulanan, godaan paylater, sampai umur berapa lo bisa DP rumah.';

// Gambar OG/Twitter diambil otomatis dari app/opengraph-image.tsx & twitter-image.tsx
export const metadata: Metadata = {
  metadataBase: new URL(URL_SITUS),
  title: JUDUL,
  description: DESKRIPSI,
  applicationName: 'Hidup Ngepas',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Hidup Ngepas',
    locale: 'id_ID',
    url: '/',
    title: JUDUL,
    description: DESKRIPSI,
  },
  twitter: {
    card: 'summary_large_image',
    title: JUDUL,
    description: DESKRIPSI,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F4EFE6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        {/* Grain kertas di atas segalanya; pointer-events-none */}
        <div aria-hidden className="grain" />
      </body>
    </html>
  );
}
