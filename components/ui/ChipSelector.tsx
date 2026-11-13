'use client';

import { motion } from 'framer-motion';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface OpsiChip<T extends string> {
  id: T;
  label: string;
  /** Ikon garis (diutamakan); emoji hanya cadangan */
  ikon?: ReactNode;
  emoji?: string;
}

interface Props<T extends string> {
  /** id elemen judul pertanyaan, untuk aria-labelledby */
  labelId: string;
  opsi: OpsiChip<T>[];
  nilai: T | null;
  onPilih: (id: T) => void;
  ukuran?: 'besar' | 'biasa';
  className?: string;
}

/**
 * Pilihan tunggal berbentuk chip.
 * Semantik radiogroup: Tab masuk ke grup, panah pindah + memilih, Spasi/Enter memilih.
 */
export function ChipSelector<T extends string>({
  labelId,
  opsi,
  nilai,
  onPilih,
  ukuran = 'biasa',
  className = '',
}: Props<T>) {
  const tombol = useRef<(HTMLButtonElement | null)[]>([]);

  const indexTerpilih = opsi.findIndex((o) => o.id === nilai);
  // Roving tabindex: hanya satu chip yang bisa dicapai Tab
  const indexTab = indexTerpilih >= 0 ? indexTerpilih : 0;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const maju = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const mundur = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!maju && !mundur) return;
    e.preventDefault();
    const berikut = (i + (maju ? 1 : -1) + opsi.length) % opsi.length;
    tombol.current[berikut]?.focus();
    onPilih(opsi[berikut].id);
  };

  const besar = ukuran === 'besar';

  return (
    <div role="radiogroup" aria-labelledby={labelId} className={className}>
      {opsi.map((o, i) => {
        const terpilih = o.id === nilai;
        return (
          <motion.button
            key={o.id}
            ref={(el) => {
              tombol.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={terpilih}
            tabIndex={i === indexTab ? 0 : -1}
            onClick={() => onPilih(o.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            // Chip "melompat" saat dipilih
            animate={{ scale: terpilih ? 1.04 : 1, y: terpilih ? -2 : 0 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
            className={[
              'inline-flex min-h-sentuh items-center justify-center gap-2 border-2 border-tinta font-display font-medium',
              'transition-colors duration-150',
              besar ? 'rounded-kartu px-4 py-5 text-lg' : 'rounded-chip px-4 py-2.5 text-base',
              terpilih ? 'bg-tinta text-kertas' : 'bg-kertas text-tinta',
            ].join(' ')}
          >
            {o.ikon ?? (o.emoji && <span aria-hidden>{o.emoji}</span>)}
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}
