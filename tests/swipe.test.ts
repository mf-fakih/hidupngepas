import { describe, expect, it } from 'vitest';
import {
  LIFESTYLE_ITEMS,
  calcLifestyle,
  kartuBerikutnya,
  terapkanSwipe,
  terapkanUndo,
  type StateSwipe,
} from '@/lib/simulasi';

const kosong: StateSwipe = { swipedIds: [], lifestyleIds: [], tornIds: [] };

describe('P0-2: swipe selalu berlaku untuk kartu yang tampil', () => {
  it('8 klik "Gue banget" beruntun: total = jumlah item yang benar-benar diterima', () => {
    let s = kosong;
    // Tiap klik membaca kartu yang tampil SAAT itu, seperti komponen
    for (let i = 0; i < 8; i++) {
      const tampil = kartuBerikutnya(s.swipedIds);
      if (tampil) s = terapkanSwipe(s, tampil, 'kanan');
    }
    expect(s.lifestyleIds).toEqual(LIFESTYLE_ITEMS.map((i) => i.id));
    const harapan = LIFESTYLE_ITEMS.reduce((t, i) => t + calcLifestyle([i.id]).total, 0);
    expect(calcLifestyle(s.lifestyleIds).total).toBe(harapan);
  });

  it('aksi basi untuk kartu lain diabaikan (klik dobel sebelum kartu berganti)', () => {
    let s = kosong;
    const pertama = kartuBerikutnya(s.swipedIds)!;
    s = terapkanSwipe(s, pertama, 'kanan');
    // Klik kedua tanpa jeda masih membawa id kartu pertama → tidak boleh mencatat apa pun
    const sebelum = s;
    s = terapkanSwipe(s, pertama, 'kanan');
    expect(s).toBe(sebelum);
    // Kartu yang belum tampil juga tidak bisa "diselipkan"
    const lompat = LIFESTYLE_ITEMS[5].id;
    expect(terapkanSwipe(s, lompat, 'kanan')).toBe(s);
  });

  it('campuran 8 klik kanan/kiri tanpa jeda menghasilkan total yang tepat', () => {
    const pola = ['kanan', 'kiri', 'kanan', 'kanan', 'kiri', 'kanan', 'kiri', 'kanan'] as const;
    let s = kosong;
    const diterima: string[] = [];
    pola.forEach((arah) => {
      const tampil = kartuBerikutnya(s.swipedIds)!;
      if (arah === 'kanan') diterima.push(tampil);
      // Klik ganda basi di sela-sela: harus diabaikan
      s = terapkanSwipe(terapkanSwipe(s, tampil, arah), tampil, arah);
    });
    expect(s.lifestyleIds).toEqual(diterima);
    expect(s.swipedIds).toHaveLength(8);
  });

  it('"Balikin kartu terakhir" mengembalikan item yang benar beserta totalnya', () => {
    let s = kosong;
    s = terapkanSwipe(s, 'kopi-susu', 'kanan');
    s = terapkanSwipe(s, 'streaming', 'kiri');
    s = terapkanSwipe(s, 'konser', 'kanan');
    const totalSebelum = calcLifestyle(s.lifestyleIds).total;
    s = { ...s, tornIds: ['konser'] };

    s = terapkanUndo(s);
    expect(kartuBerikutnya(s.swipedIds)).toBe('konser');
    expect(s.lifestyleIds).toEqual(['kopi-susu']);
    expect(s.tornIds).toEqual([]); // sobekan item yang dibalikin ikut hilang
    expect(totalSebelum - calcLifestyle(s.lifestyleIds).total).toBe(calcLifestyle(['konser']).total);

    // Undo kartu yang di-skip tidak mengubah total
    s = terapkanUndo(s);
    expect(kartuBerikutnya(s.swipedIds)).toBe('streaming');
    expect(s.lifestyleIds).toEqual(['kopi-susu']);
  });
});
