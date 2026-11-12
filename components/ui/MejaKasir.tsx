'use client';

import { useMemo } from 'react';
import { RollingNumber } from '@/components/ui/RollingNumber';
import {
  CITIES,
  LIFESTYLE_BY_ID,
  STATUS,
  calcEssentials,
  calcLifestyleItem,
  formatRupiah,
  formatRupiahRingkas,
  useLifestyleTotal,
  useSimulationStore,
} from '@/store/useSimulationStore';

type Langkah = 'kenalan' | 'gaji' | 'gaya-hidup';

interface Props {
  langkah: Langkah;
}

const NOMOR_LANGKAH: Record<Langkah, number> = { kenalan: 1, gaji: 2, 'gaya-hidup': 3 };

/** Kode akun buku besar. Urutannya sama dengan urutan baris di struk scene 05. */
const KODE_POKOK: Record<string, string> = {
  makan: 'POS-01',
  kos: 'KOS-02',
  transport: 'TRN-03',
  pulsa: 'PLS-04',
};
const BARIS_KOSONG = [
  { id: 'makan', label: 'MAKAN' },
  { id: 'kos', label: 'KOS + LISTRIK' },
  { id: 'transport', label: 'TRANSPORT' },
  { id: 'pulsa', label: 'PULSA + KUOTA' },
];

const JUMLAH_BLOK = 40;
const BLOK_LEBIH_MAKS = 20;
/** Sebelum gaji diisi, satu blok = Rp 125 rb (40 blok = Rp 5 juta) */
const SATUAN_AWAL = 125_000;

const ARSIR =
  'repeating-linear-gradient(45deg, rgb(var(--tinta)) 0 2px, transparent 2px 5px)';

/**
 * Meja hitung kasir: kolom kiri scene 02–04 di desktop (lg ke atas).
 * Semua angka di sini turunan langsung dari store, jadi tiap chip, geseran slider,
 * atau swipe kartu langsung kelihatan akibatnya. Di HP komponen ini tidak dirender
 * tampil (hidden) supaya alur satu jempol tetap ringkas.
 */
export function MejaKasir({ langkah }: Props) {
  const status = useSimulationStore((s) => s.status);
  const cityId = useSimulationStore((s) => s.cityId);
  const incomeStore = useSimulationStore((s) => s.income);
  const lifestyleIds = useSimulationStore((s) => s.lifestyleIds);
  const totalGaya = useLifestyleTotal();

  const gajiDiketahui = langkah !== 'kenalan';
  const income = gajiDiketahui ? incomeStore : 0;
  const gayaHidup = langkah === 'gaya-hidup' ? totalGaya : 0;

  const pokok = useMemo(
    () => (status && cityId ? calcEssentials(status, cityId) : null),
    [status, cityId],
  );
  const totalPokok = pokok?.total ?? 0;
  const totalKeluar = totalPokok + gayaHidup;
  const sisa = income - totalKeluar;

  // Layar besar: yang ditampilkan mengikuti langkah
  const layar = !gajiDiketahui
    ? { label: 'Biaya hidup dasar / bulan', nilai: totalPokok, kosong: !pokok, warna: 'text-kertas' }
    : {
        label: langkah === 'gaji' ? 'Sisa setelah kebutuhan pokok' : 'Sisa uang / bulan',
        nilai: sisa,
        kosong: false,
        warna: sisa < 0 ? 'text-minus' : 'text-aman',
      };

  // Blok anggaran
  const satuan = gajiDiketahui && income > 0 ? income / JUMLAH_BLOK : SATUAN_AWAL;
  const blokPokok = Math.round(totalPokok / satuan);
  const blokGaya = Math.round(gayaHidup / satuan);
  const blokTerpakai = blokPokok + blokGaya;
  const blokLebih = gajiDiketahui ? Math.min(BLOK_LEBIH_MAKS, Math.max(0, blokTerpakai - JUMLAH_BLOK)) : 0;
  const jumlahBlok = gajiDiketahui ? JUMLAH_BLOK + blokLebih : Math.max(JUMLAH_BLOK, Math.min(60, blokTerpakai));

  // Kertas struk yang ngintip: makin banyak yang diisi, makin panjang keluarnya
  const barisIntip = useMemo(() => {
    const baris: { kiri: string; kanan?: string }[] = [];
    if (status) baris.push({ kiri: `STATUS: ${STATUS[status].label.toUpperCase()}` });
    if (cityId) baris.push({ kiri: `KOTA: ${CITIES[cityId].nama.toUpperCase()}` });
    if (gajiDiketahui) baris.push({ kiri: 'PEMASUKAN', kanan: formatRupiah(income) });
    if (langkah === 'gaya-hidup') {
      // Paling baru di bawah, dekat mulut printer; yang lama terdorong ke atas
      lifestyleIds.slice(-4).forEach((id) =>
        baris.push({ kiri: LIFESTYLE_BY_ID[id].labelStruk, kanan: formatRupiah(calcLifestyleItem(id)) }),
      );
    }
    return baris;
  }, [status, cityId, gajiDiketahui, income, langkah, lifestyleIds]);

  // 2 baris kepala + isi; tinggi dihitung supaya transisi height bisa jalan
  const tinggiIntip = 30 + (1 + barisIntip.length) * 16.5;

  return (
    <aside aria-label="Meja hitung: ringkasan langsung" className="hidden lg:flex lg:h-[calc(100dvh-8.5rem)] lg:max-h-[46rem] lg:flex-col">
      {/* Papan nama */}
      <div className="flex items-center justify-between border-b-2 border-tinta pb-2">
        <p className="mikro font-bold text-tinta">Meja Hitung · Kasir 01</p>
        <p className="mikro flex items-center gap-2 text-tinta-pudar">
          <span aria-hidden className="inline-block h-2 w-2 animate-kedip rounded-full bg-minus" />
          Live · Langkah {NOMOR_LANGKAH[langkah]}/3
        </p>
      </div>

      {/* Layar kasir */}
      <div className="relative mt-4 rounded-[10px] border-2 border-tinta bg-tinta px-5 pb-4 pt-3 shadow-[6px_6px_0_rgb(var(--tinta)/0.18)]">
        <span aria-hidden className="selotip -top-3 right-8" style={{ ['--putar' as string]: '4deg' }} />
        <p className="mikro text-kertas/70">{layar.label}</p>
        <p aria-live="polite" className={`mt-1 font-mono text-[clamp(2.25rem,3.6vw,3.5rem)] font-bold leading-none tracking-tight ${layar.warna}`}>
          {layar.kosong ? (
            <span className="text-kertas/40">Rp --.---.---</span>
          ) : (
            <RollingNumber value={layar.nilai} />
          )}
        </p>
        <p className="mikro mt-3 text-kertas/70">
          {layar.kosong
            ? 'Menunggu status & kota'
            : !gajiDiketahui
              ? 'Belum termasuk jajan. Gaji diisi habis ini.'
              : sisa < 0
                ? `Tekor ${formatRupiahRingkas(-sisa)} tiap bulan`
                : `${income > 0 ? Math.round((sisa / income) * 100) : 0}% dari pemasukan masih utuh`}
        </p>
      </div>

      {/* Buku besar */}
      <div className="mt-4">
        <div className="ledger">
          <span className="kode">GAJ-00</span>
          <span>PEMASUKAN</span>
          <span className="nilai">{gajiDiketahui ? formatRupiah(income) : '—'}</span>
        </div>
        {(pokok?.baris ?? BARIS_KOSONG).map((b) => (
          <div key={b.id} className="ledger">
            <span className="kode">{KODE_POKOK[b.id] ?? 'POS-09'}</span>
            <span>{b.label}</span>
            <span className="nilai">{'nominal' in b ? `-${formatRupiah(b.nominal as number)}` : '—'}</span>
          </div>
        ))}
        <div className="ledger">
          <span className="kode">GYA-05</span>
          <span>GAYA HIDUP{langkah === 'gaya-hidup' ? ` (${lifestyleIds.length})` : ''}</span>
          <span className="nilai">{langkah === 'gaya-hidup' ? `-${formatRupiah(gayaHidup)}` : '—'}</span>
        </div>
      </div>

      {/* Blok anggaran */}
      <div className="mt-4">
        <div
          role="img"
          aria-label={
            gajiDiketahui
              ? `Dari ${JUMLAH_BLOK} blok pemasukan, ${Math.min(blokTerpakai, JUMLAH_BLOK)} terpakai${blokLebih ? `, lebih ${blokLebih} blok` : ''}.`
              : `Kebutuhan pokok setara ${blokPokok} blok.`
          }
          className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px]"
        >
          {Array.from({ length: jumlahBlok }, (_, i) => {
            const lebih = gajiDiketahui && i >= JUMLAH_BLOK;
            const jenis = lebih ? 'lebih' : i < blokPokok ? 'pokok' : i < blokTerpakai ? 'gaya' : 'sisa';
            return (
              <span
                key={i}
                className={`aspect-square border transition-colors duration-300 ${
                  jenis === 'lebih'
                    ? 'border-minus bg-minus'
                    : jenis === 'pokok'
                      ? 'border-tinta bg-tinta'
                      : jenis === 'gaya'
                        ? 'border-tinta'
                        : 'border-tinta/30'
                }`}
                style={jenis === 'gaya' ? { backgroundImage: ARSIR } : undefined}
              />
            );
          })}
        </div>
        <p className="mikro mt-2 flex flex-wrap gap-x-4 gap-y-1 text-tinta-pudar">
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="inline-block h-2 w-2 bg-tinta" /> Pokok
          </span>
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="inline-block h-2 w-2 border border-tinta" style={{ backgroundImage: ARSIR }} /> Gaya hidup
          </span>
          <span className="flex items-center gap-1.5">
            <i aria-hidden className="inline-block h-2 w-2 bg-minus" /> Tekor
          </span>
          <span className="ml-auto">1 blok = {formatRupiahRingkas(satuan)}</span>
        </p>
      </div>

      {/* Mulut printer: kertas struk ngintip, baru keluar penuh di scene 05 */}
      <div aria-hidden className="mt-auto flex min-h-0 flex-col justify-end overflow-hidden pt-4">
        <div className="mx-auto w-[78%] overflow-hidden transition-[height] duration-500 ease-out" style={{ height: tinggiIntip }}>
          <div className="struk-intip">
            <p className="text-center font-bold tracking-[0.18em]">*** HIDUP NGEPAS ***</p>
            {barisIntip.map((b, i) => (
              <p key={`${b.kiri}-${i}`} className="flex justify-between gap-3">
                <span className="truncate">{b.kiri}</span>
                {b.kanan && <span className="whitespace-nowrap">{b.kanan}</span>}
              </p>
            ))}
          </div>
        </div>
        <div className="relative h-5 shrink-0 rounded-[6px] border-2 border-tinta bg-tinta">
          <span className="absolute inset-x-[9%] top-[3px] h-[3px] rounded-full bg-kertas/25" />
        </div>
        <p className="mikro mt-2 text-center text-tinta-pudar">Struk lagi disiapin · keluar di babak 2</p>
      </div>
    </aside>
  );
}
