import type { LifestyleId, Status } from '@/lib/simulasi';

/**
 * Ikon garis bergaya tinta (pengganti emoji yang tampil beda di tiap OS).
 * Grid 24×24, stroke currentColor: otomatis ikut warna teks, termasuk chip terpilih.
 */
export type NamaIkon = Status | LifestyleId;

const PATH: Record<NamaIkon, JSX.Element> = {
  // Status
  sekolah: (
    <>
      <path d="M7 8a5 5 0 0 1 10 0v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
      <path d="M10 4.5V3h4v1.5" />
      <path d="M9.5 14h5v4h-5Z" />
    </>
  ),
  kuliah: (
    <>
      <path d="M2 9l10-5 10 5-10 5Z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      <path d="M22 9v6" />
    </>
  ),
  kerja: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M3 13h18" />
    </>
  ),
  'cari-kerja': (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  // Gaya hidup
  'kopi-susu': (
    <>
      <path d="M6 8h12l-1.5 12.1a1 1 0 0 1-1 .9h-7a1 1 0 0 1-1-.9Z" />
      <path d="M13 8l2-5h3" />
      <path d="M7 13h10" />
    </>
  ),
  streaming: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="m10 8.5 4.5 2-4.5 2Z" />
      <path d="M8 21h8" />
    </>
  ),
  konser: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </>
  ),
  'sepatu-lari': (
    <>
      <path d="M3 18v-5.5l4-1 3-4.5 3 3c2 2 5 3 8 3.5V18Z" />
      <path d="M3 18h18" />
      <path d="m10.5 10.5 1.5 1.5M12.5 8.5 14 10" />
    </>
  ),
  'hp-baru': (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  nongkrong: (
    <>
      <path d="M3 12h18a9 8 0 0 1-18 0Z" />
      <path d="m13 3-3 9M17.5 4 13 12" />
    </>
  ),
  skincare: (
    <>
      <path d="M9 9h6v11a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1Z" />
      <path d="M11 9V6h2v3" />
      <path d="M12 6V4h4" />
      <path d="M9 14h6" />
    </>
  ),
  ojol: (
    <>
      <circle cx="5.5" cy="17" r="3" />
      <circle cx="18.5" cy="17" r="3" />
      <path d="M8.5 17h6.5l-2-6H9" />
      <path d="M13.5 11H16l2.5 6" />
      <path d="M15 7h3" />
    </>
  ),
};

export function IkonGaris({ nama, className = 'h-6 w-6' }: { nama: NamaIkon; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATH[nama]}
    </svg>
  );
}
