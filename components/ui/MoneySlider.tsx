'use client';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
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
  const jepit = (n: number) => Math.min(max, Math.max(min, n));
  const bulatStep = (n: number) => jepit(Math.round((n - min) / step) * step + min);

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

  // step="any" supaya thumb tepat di nilai hasil ketikan (mis. 2.720.000, bukan 2.700.000).
  // Akibatnya keyboard harus diurus sendiri: panah = 1 step, PageUp/PageDown = 10 step.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const lompat: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: -step * 10,
    };
    if (e.key in lompat) {
      e.preventDefault();
      const d = lompat[e.key];
      const diGrid = (value - min) % step === 0;
      // Nilai hasil ketikan (di luar kelipatan step): langkah pertama mendarat di kelipatan terdekat searah tombol
      const baru = diGrid
        ? value + d
        : (d > 0 ? Math.ceil((value - min) / step) : Math.floor((value - min) / step)) * step + min;
      ubah(jepit(baru));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      ubah(e.key === 'Home' ? min : max);
    }
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
        step="any"
        value={value}
        // Geser dengan jari/mouse: dibulatkan ke kelipatan step
        onChange={(e) => ubah(bulatStep(Number(e.target.value)))}
        onKeyDown={onKeyDown}
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
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
