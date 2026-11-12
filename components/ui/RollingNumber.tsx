'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { formatRupiah } from '@/store/useSimulationStore';

const ANGKA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const TINGGI = 1.2; // em, tinggi satu digit

function Digit({ nilai }: { nilai: number }) {
  return (
    <span
      className="relative inline-block overflow-hidden align-bottom"
      style={{ height: `${TINGGI}em`, lineHeight: `${TINGGI}em` }}
    >
      <motion.span
        className="block"
        // Digit baru (angka bertambah panjang) ikut bergulir dari 0
        initial={{ y: '0em' }}
        animate={{ y: `${-nilai * TINGGI}em` }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        {ANGKA.map((n) => (
          <span key={n} className="block" style={{ height: `${TINGGI}em` }}>
            {n}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

interface Props {
  value: number;
  className?: string;
}

/**
 * Angka rupiah yang bergulir per digit, seperti mesin hitung kasir.
 * Pembaca layar mendapat nilai utuh; dengan reduced-motion angka langsung berganti.
 */
export function RollingNumber({ value, className }: Props) {
  const kurangiGerak = useReducedMotion();
  const teks = formatRupiah(value);

  if (kurangiGerak) {
    return (
      <span className={className} data-angka>
        {teks}
      </span>
    );
  }

  const karakter = teks.split('');

  return (
    <span className={className} data-angka>
      <span className="hanya-sr">{teks}</span>
      <span aria-hidden className="inline-flex whitespace-pre">
        {karakter.map((k, i) => {
          // Key dihitung dari kanan: satuan tetap satuan walau angka bertambah panjang
          const key = karakter.length - i;
          return /\d/.test(k) ? (
            <Digit key={key} nilai={Number(k)} />
          ) : (
            <span key={key} style={{ lineHeight: `${TINGGI}em` }}>
              {k}
            </span>
          );
        })}
      </span>
    </span>
  );
}
