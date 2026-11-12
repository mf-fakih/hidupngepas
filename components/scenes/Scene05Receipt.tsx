'use client';

import { useDrag } from '@use-gesture/react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useState } from 'react';
import { ReceiptPrinter } from '@/components/ui/ReceiptPrinter';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { getar } from '@/lib/sound';
import {
  CITIES,
  STATUS,
  formatRupiah,
  useMonthly,
  useSimulationStore,
  type BarisStruk,
  type LifestyleId,
} from '@/store/useSimulationStore';

/** Jarak geser (px) sampai baris dianggap disobek / ditempel lagi */
const AMBANG_SOBEK = 72;

/* ------------------------------------------------------------------ */
/* Baris biasa (pemasukan, kebutuhan pokok, total)                     */
/* ------------------------------------------------------------------ */

function Baris({ label, nominal, tebal = false }: { label: string; nominal: number; tebal?: boolean }) {
  return (
    <div data-baris-struk className={`struk-baris ${tebal ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span aria-hidden className="isi" />
      <span data-angka className="whitespace-nowrap">
        {formatRupiah(nominal)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Baris gaya hidup: geser ke samping atau tekan gunting untuk sobek   */
/* ------------------------------------------------------------------ */

function BarisSobek({ baris, onToggle }: { baris: BarisStruk; onToggle: () => void }) {
  const disobek = !!baris.disobek;
  const x = useMotionValue(0);
  const miring = useTransform(x, [-120, 0, 120], [-3, 0, 3]);

  const bind = useDrag(
    ({ active, movement: [mx] }) => {
      if (active) {
        x.set(mx * 0.8); // sedikit "berat", kertas ditahan jari
        return;
      }
      if (Math.abs(mx) > AMBANG_SOBEK) {
        getar(disobek ? 8 : [6, 30, 12]);
        onToggle();
      }
      animate(x, 0, { type: 'spring', stiffness: 520, damping: 30 });
    },
    { axis: 'x', filterTaps: true },
  );

  return (
    // GSAP memegang wrapper ini (muncul saat dicetak); gesture & Framer di dalamnya
    <div data-baris-struk>
      <div {...bind()} className="touch-pan-y">
        <motion.div
          style={{ x, rotate: miring }}
          animate={{ opacity: disobek ? 0.45 : 1 }}
          data-kursor={disobek ? 'TEMPEL ↺' : 'SOBEK ✂'}
          className="struk-baris cursor-grab active:cursor-grabbing"
        >
          <span className={disobek ? 'line-through' : ''}>{baris.label}</span>
          <span aria-hidden className="isi" />
          <span data-angka className={`whitespace-nowrap ${disobek ? 'line-through' : ''}`}>
            {formatRupiah(baris.nominal)}
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={disobek}
            aria-label={disobek ? `Tempel lagi ${baris.label}` : `Sobek ${baris.label}`}
            className="-my-2 -mr-2 grid h-sentuh w-sentuh shrink-0 place-items-center rounded-full text-base"
          >
            <span aria-hidden>{disobek ? '↺' : '✂'}</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — Struk Realita                                                  */
/* ------------------------------------------------------------------ */

export function Scene05Receipt() {
  const bulanan = useMonthly();
  const status = useSimulationStore((s) => s.status);
  const cityId = useSimulationStore((s) => s.cityId);
  const tornIds = useSimulationStore((s) => s.tornIds);
  const toggleTorn = useSimulationStore((s) => s.toggleTorn);
  const resetTorn = useSimulationStore((s) => s.resetTorn);
  const next = useSimulationStore((s) => s.next);

  const [tercetak, setTercetak] = useState(false);
  const [kabar, setKabar] = useState('');
  // Tanggal & nomor struk cukup dibuat sekali; scene ini tidak pernah di-render server
  const [cap] = useState(() => {
    const kini = new Date();
    return {
      tanggal: kini.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      jam: kini.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      nomor: String(kini.getTime()).slice(-6),
    };
  });

  // SceneRouter mengalihkan deep-link tanpa data, jadi ini hanya sesaat sebelum rehidrasi
  if (!bulanan || !status || !cityId) return null;

  const { income, pokok, gayaHidup, total, sisa, isMinus, lifestylePct } = bulanan;
  const labelPemasukan = status === 'kerja' ? 'GAJI' : status === 'cari-kerja' ? 'SAMPINGAN' : 'UANG SAKU';

  const hematSobek = gayaHidup.baris.reduce((n, b) => n + (b.disobek ? b.nominal : 0), 0);

  const sobek = (id: LifestyleId, label: string) => {
    const akanDisobek = !tornIds.includes(id);
    toggleTorn(id);
    setKabar(akanDisobek ? `${label} disobek dari struk.` : `${label} ditempel lagi.`);
  };

  return (
    <section className="scene scene-split" aria-labelledby="judul-struk">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
          Babak 2 — Struk realita · No. {cap.nomor}
        </p>
        <h2 id="judul-struk" data-judul-scene tabIndex={-1} className="judul-editorial">
          Ini struk hidup lo bulan ini.
        </h2>
        <p className="mt-2 text-tinta-pudar lg:mt-5 lg:max-w-[32ch] lg:text-lg lg:text-tinta">
          {gayaHidup.baris.length > 0
            ? 'Geser baris gaya hidup buat nyobek. Totalnya ikut berubah.'
            : 'Nggak ada gaya hidup yang bisa disobek. Lurus banget.'}
        </p>

        {/* Desktop: rekap kasir yang ikut berubah tiap baris disobek */}
        <div aria-hidden className="relative mt-8 hidden lg:block">
          <span className="selotip -top-3 left-6" style={{ ['--putar' as string]: '-3deg' }} />
          <div className="border-2 border-tinta bg-kertas px-5 pb-4 pt-5 shadow-[6px_6px_0_rgb(var(--tinta)/0.18)]">
            <p className="mikro text-tinta-pudar">Rekap kasir · {CITIES[cityId].nama}</p>
            <div className="ledger mt-2">
              <span className="kode">GAJ-00</span>
              <span>{labelPemasukan}</span>
              <span className="nilai">{formatRupiah(income)}</span>
            </div>
            <div className="ledger">
              <span className="kode">POK-01</span>
              <span>KEBUTUHAN POKOK</span>
              <span className="nilai">-{formatRupiah(pokok.total)}</span>
            </div>
            <div className="ledger">
              <span className="kode">GYA-05</span>
              <span>GAYA HIDUP ({gayaHidup.baris.filter((b) => !b.disobek).length})</span>
              <span className="nilai">-{formatRupiah(gayaHidup.total)}</span>
            </div>
            <div className="ledger">
              <span className="kode">SBK-06</span>
              <span>DISOBEK ({gayaHidup.baris.filter((b) => b.disobek).length})</span>
              <span className="nilai">{hematSobek > 0 ? `+${formatRupiah(hematSobek)}` : '—'}</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="mikro text-tinta-pudar">Sisa / bulan</p>
                <RollingNumber
                  value={sisa}
                  className={`mt-1 block font-mono text-[clamp(2rem,3.4vw,3.25rem)] font-bold leading-none tracking-tight ${
                    isMinus ? 'text-minus' : 'text-tinta'
                  }`}
                />
              </div>
              {tercetak && (
                <span
                  className={`stempel mb-1 text-lg ${isMinus ? 'text-minus-teks' : 'text-aman-teks'}`}
                  style={{ ['--putar' as string]: isMinus ? '-2deg' : '3deg' }}
                >
                  {isMinus ? 'Minus' : 'Aman'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="kolom-kanan">
      <div className="lg:grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <ReceiptPrinter className="mt-6 lg:mt-0" onSelesaiCetak={() => setTercetak(true)}>
        {/* Kepala struk */}
        <div data-baris-struk className="text-center">
          <p className="font-bold tracking-[0.2em]">HIDUP NGEPAS</p>
          <p>STRUK REALITA BULANAN</p>
          <p className="tinta-pudar">
            {CITIES[cityId].nama.toUpperCase()} · {STATUS[status].label.toUpperCase()}
          </p>
          <p className="tinta-pudar">
            {cap.tanggal} {cap.jam} · No. {cap.nomor}
          </p>
        </div>

        <hr className="garis-putus" />

        <p data-baris-struk className="tinta-pudar">PEMASUKAN</p>
        <Baris label={labelPemasukan} nominal={income} />

        <hr className="garis-putus" />

        <p data-baris-struk className="tinta-pudar">KEBUTUHAN POKOK</p>
        {pokok.baris.map((b) => (
          <Baris key={b.id} label={b.label} nominal={b.nominal} />
        ))}

        {gayaHidup.baris.length > 0 && (
          <>
            <p data-baris-struk className="tinta-pudar mt-3">
              GAYA HIDUP <span aria-hidden>← geser buat sobek →</span>
            </p>
            {gayaHidup.baris.map((b) => (
              <BarisSobek
                key={b.id}
                baris={b}
                onToggle={() => sobek(b.id as LifestyleId, b.label)}
              />
            ))}
          </>
        )}

        <hr className="garis-putus" />

        <Baris label="TOTAL KELUAR" nominal={total} tebal />

        {/* SISA: blok warna penuh supaya hijau/merah asli tetap terbaca (teks tinta di atasnya) */}
        <div
          data-cap-struk
          className={`mt-4 rounded-md border-2 border-tinta px-3 py-3 text-tinta ${
            isMinus ? 'bg-minus' : 'bg-aman'
          }`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold tracking-[0.15em]">SISA</span>
            <span className="font-bold">{isMinus ? 'MINUS' : 'AMAN'}</span>
          </div>
          <RollingNumber
            value={sisa}
            className={`mt-1 block text-right text-[clamp(1.75rem,8vw,2.25rem)] font-bold leading-none ${
              isMinus ? 'animate-kedip motion-reduce:animate-none' : ''
            }`}
          />
        </div>

        {lifestylePct > 0 && (
          <p data-baris-struk className="mt-3">
            Gaya hidup makan <strong>{lifestylePct}%</strong> {labelPemasukan.toLowerCase()} lo.
          </p>
        )}

        {tornIds.length > 0 && (
          <button
            type="button"
            onClick={() => {
              resetTorn();
              setKabar('Semua sobekan ditempel lagi.');
            }}
            className="mt-2 inline-flex min-h-sentuh items-center underline underline-offset-4"
          >
            Tempel semua lagi
          </button>
        )}

        <hr className="garis-putus" />
        <p data-baris-struk className="tinta-pudar text-center text-[0.6875rem] leading-snug">
          * Biaya kota & harga gaya hidup masih estimasi kasar,
          <br />
          bukan data resmi BPS/UMK.
        </p>
        <p data-baris-struk className="mt-2 text-center">
          TERIMA KASIH SUDAH JUJUR
          <br />
          SAMA DIRI SENDIRI
        </p>
      </ReceiptPrinter>

        {/* Desktop: catatan pinggir ala editor, menempel selama struk di-scroll */}
        <ol aria-hidden className="sticky top-28 hidden space-y-6 pt-6 lg:block">
          {[
            ['01', 'Scroll', 'Kertasnya masih nyangkut di printer. Tarik pelan-pelan sampai SISA kecetak.'],
            ['02', 'Sobek', 'Geser baris gaya hidup ke samping, atau klik guntingnya. Total langsung dihitung ulang.'],
            ['03', 'Tempel', 'Nyesel? Geser lagi baris yang udah dicoret. Nggak ada yang hilang beneran.'],
          ].map(([no, judul, isi]) => (
            <li key={no} className="border-t border-dashed border-tinta/40 pt-3">
              <p className="mikro text-tinta-pudar">Catatan {no}</p>
              <p className="mt-1 font-display text-2xl font-bold leading-none tracking-tight text-tinta">{judul}</p>
              <p className="mt-2 max-w-[26ch] text-sm leading-snug text-tinta">{isi}</p>
            </li>
          ))}
        </ol>
      </div>

      <p role="status" className="hanya-sr">
        {kabar ||
          (tercetak
            ? `Struk selesai dicetak. Sisa ${formatRupiah(sisa)}${isMinus ? ', minus' : ''}.`
            : '')}
      </p>

      <div className="zona-jempol">
        <button type="button" onClick={next} className="tombol-cta">
          {isMinus ? 'Terus gimana dong?' : 'Lihat masa depan gue'}
        </button>
      </div>
      </div>
    </section>
  );
}
