'use client';

import { useRef, type CSSProperties } from 'react';
import { getar } from '@/lib/sound';
import { formatRupiah } from '@/store/useSimulationStore';

interface Props {
  id?: string;
  /** Nama kontrol untuk pembaca layar */
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Garis pembanding halus di track */
  penanda?: { nilai: number; label: string };
  /** Getar tiap melewati kelipatan ini. 0 = tanpa getar. */
  getarTiap?: number;
  /** Format angka untuk pembaca layar & label ujung. Default rupiah. */
  format?: (n: number) => string;
}

const THUMB = 44; // px, sama dengan .slider-uang di globals.css

/** Posisi tengah thumb untuk pecahan 0–1 (thumb tidak pernah keluar dari track) */
const posisi = (pecahan: number) =>
  `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${pecahan.toFixed(4)})`;

export function MoneySlider({
  id,
  label,
  value,
  min = 0,
  max,
  step = 50_000,
  onChange,
  penanda,
  getarTiap = 500_000,
  format = formatRupiah,
}: Props) {
  const kelipatanTerakhir = useRef(getarTiap ? Math.floor(value / getarTiap) : 0);

  const pecahan = max > min ? (Math.min(Math.max(value, min), max) - min) / (max - min) : 0;

  const ubah = (baru: number) => {
    if (getarTiap) {
      const kelipatan = Math.floor(baru / getarTiap);
      if (kelipatan !== kelipatanTerakhir.current) {
        kelipatanTerakhir.current = kelipatan;
        getar(8);
      }
    }
    onChange(baru);
  };

  return (
    <div className="relative pb-9" data-kursor="ATUR">
      <input
        id={id}
        type="range"
        className="slider-uang"
        aria-label={label}
        aria-valuetext={format(value)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => ubah(Number(e.target.value))}
        style={{ '--isi': posisi(pecahan) } as CSSProperties}
      />

      {penanda && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-[34px] flex flex-col items-start"
          style={{ left: posisi((penanda.nilai - min) / (max - min)) }}
        >
          <span className="block h-3 w-px bg-tinta/50" />
          <span className="-ml-1 mt-1 whitespace-nowrap font-mono text-[0.6875rem] leading-tight text-tinta-pudar">
            {penanda.label}
          </span>
        </div>
      )}

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[0.6875rem] text-tinta-pudar"
      >
        {/* Label ujung digeser ke bawah penanda supaya tidak tabrakan */}
        <span className={penanda ? 'invisible' : ''}>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
