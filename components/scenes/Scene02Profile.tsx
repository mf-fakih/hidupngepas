'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ChipSelector, type OpsiChip } from '@/components/ui/ChipSelector';
import { MejaKasir } from '@/components/ui/MejaKasir';
import {
  ASUMSI,
  CITIES,
  CITY_LIST,
  STATUS_LIST,
  formatRupiah,
  useSimulationStore,
  type CityId,
  type Status,
} from '@/store/useSimulationStore';

const EMOJI_STATUS: Record<Status, string> = {
  sekolah: '🎒',
  kuliah: '🎓',
  kerja: '💼',
  'cari-kerja': '📨',
};

const OPSI_STATUS: OpsiChip<Status>[] = STATUS_LIST.map((s) => ({
  id: s.id,
  label: s.label,
  emoji: EMOJI_STATUS[s.id],
}));

/* ------------------------------------------------------------------ */
/* Peta Indonesia minimalis                                            */
/* Bentuk pulau disederhanakan (bukan peta presisi). Titik kota        */
/* dihitung dari lintang/bujur: x = (bujur − 95) / 46 × 400,           */
/* y = (6 − lintang) / 17 × 150.                                       */
/* ------------------------------------------------------------------ */

const PULAU = [
  // Sumatra
  'M3 5 12 3 35 18 55 38 75 62 92 82 96 103 88 104 70 88 50 66 30 44 12 24Z',
  // Jawa
  'M90 108 105 106 125 111 150 113 168 118 170 126 150 125 125 122 100 118 90 114Z',
  // Kalimantan
  'M124 58 128 40 145 30 165 14 185 12 200 22 207 42 196 60 190 80 172 88 152 84 136 80 126 70Z',
  // Sulawesi
  'M212 70 218 48 236 40 262 40 260 47 238 50 228 58 246 62 252 70 238 70 240 84 248 96 240 98 230 82 224 84 222 100 212 102 214 84Z',
  // Papua
  'M313 62 328 58 340 66 352 60 372 62 398 70 398 128 380 118 362 104 345 92 330 82 318 74Z',
  // Bali – Nusa Tenggara
  'M173 125h6v4h-6Z',
  'M181 126h6v4h-6Z',
  'M190 126h16v4h-16Z',
  'M213 127h24v4h-24Z',
  'M244 134 262 128 264 132 247 139Z',
  // Maluku
  'M283 40 288 38 290 54 285 56Z',
  'M282 82h18v5h-18Z',
];

const TITIK: Record<Exclude<CityId, 'lainnya'>, { x: number; y: number }> = {
  medan: { x: 32, y: 21 },
  'bandar-lampung': { x: 89, y: 101 },
  jakarta: { x: 103, y: 108 },
  bandung: { x: 110, y: 114 },
  yogyakarta: { x: 134, y: 122 },
  surabaya: { x: 154, y: 117 },
  makassar: { x: 212, y: 98 },
};

function PetaIndonesia({ cityId }: { cityId: CityId | null }) {
  const sorot = cityId && cityId !== 'lainnya' ? TITIK[cityId] : null;
  const semuaMenyala = cityId === 'lainnya';

  return (
    <svg viewBox="0 0 400 150" aria-hidden className="h-auto w-full">
      <g
        fill="rgb(var(--tinta))"
        style={{ opacity: semuaMenyala ? 0.26 : 0.1, transition: 'opacity 300ms ease' }}
      >
        {PULAU.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {Object.entries(TITIK).map(([id, t]) => (
        <circle key={id} cx={t.x} cy={t.y} r="2" fill="rgb(var(--tinta) / 0.35)" />
      ))}

      {sorot && (
        <g key={cityId}>
          <motion.circle
            cx={sorot.x}
            cy={sorot.y}
            fill="none"
            stroke="rgb(var(--minus))"
            strokeWidth="2"
            initial={{ r: 4, opacity: 0.9 }}
            animate={{ r: 16, opacity: 0 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.circle
            cx={sorot.x}
            cy={sorot.y}
            fill="rgb(var(--minus))"
            stroke="rgb(var(--kertas))"
            strokeWidth="1.5"
            initial={{ r: 0 }}
            animate={{ r: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
          />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Stepper umur: ringan, satu jempol, default ikut status              */
/* ------------------------------------------------------------------ */

function StepperUmur() {
  const age = useSimulationStore((s) => s.age);
  const setAge = useSimulationStore((s) => s.setAge);
  const kelasTombol =
    'grid h-sentuh w-sentuh shrink-0 place-items-center rounded-full border-2 border-tinta bg-kertas font-mono text-2xl font-bold leading-none text-tinta disabled:opacity-30';

  return (
    <div className="mt-6 lg:mt-8">
      <p id="label-umur" className="font-display text-lg font-bold text-tinta">
        Umur lo
      </p>
      <div role="group" aria-labelledby="label-umur" className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAge(age - 1)}
          disabled={age <= ASUMSI.UMUR_MIN}
          aria-label="Kurangi umur"
          className={kelasTombol}
        >
          −
        </button>
        <output aria-live="polite" className="min-w-[3ch] text-center font-mono text-3xl font-bold text-tinta">
          {age}
        </output>
        <button
          type="button"
          onClick={() => setAge(age + 1)}
          disabled={age >= ASUMSI.UMUR_MAKS_INPUT}
          aria-label="Tambah umur"
          className={kelasTombol}
        >
          +
        </button>
        <span className="text-sm leading-snug text-tinta-pudar">tahun. Timeline lo mulai dari sini.</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — Status & Kota                                                  */
/* ------------------------------------------------------------------ */

export function Scene02Profile() {
  const status = useSimulationStore((s) => s.status);
  const cityId = useSimulationStore((s) => s.cityId);
  const setStatus = useSimulationStore((s) => s.setStatus);
  const setCity = useSimulationStore((s) => s.setCity);
  const next = useSimulationStore((s) => s.next);

  const [cari, setCari] = useState('');

  const opsiKota = useMemo<OpsiChip<CityId>[]>(() => {
    const kunci = cari.trim().toLowerCase();
    const cocok = CITY_LIST.filter(
      (k) => k.id !== 'lainnya' && (!kunci || k.nama.toLowerCase().includes(kunci)),
    );
    // "Lainnya" selalu ada, supaya pencarian yang tidak ketemu tetap punya jalan keluar
    return [...cocok, CITIES.lainnya].map((k) => ({
      id: k.id,
      label: k.id === 'lainnya' ? 'Lainnya' : k.nama,
    }));
  }, [cari]);

  const tidakKetemu = cari.trim() !== '' && opsiKota.length === 1;
  const lengkap = status !== null && cityId !== null;
  const kota = cityId ? CITIES[cityId] : null;

  return (
    <section className="scene scene-split" aria-labelledby="judul-profil">
      <div className="kolom-kiri">
        <MejaKasir langkah="kenalan" />
      </div>

      <div className="kolom-kanan">
      <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
        Form 01 — Data diri · diisi 2 kolom
      </p>
      <h2 id="judul-profil" data-judul-scene tabIndex={-1} className="judul-editorial">
        Sekarang lo lagi...
      </h2>

      <ChipSelector
        labelId="judul-profil"
        opsi={OPSI_STATUS}
        nilai={status}
        onPilih={setStatus}
        ukuran="besar"
        className="mt-4 grid grid-cols-2 gap-3 lg:mt-8 lg:max-w-[34rem]"
      />

      {/* Muncul setelah status dipilih: default umur ikut status (sekolah 17, kuliah 20, ...) */}
      {status && <StepperUmur />}

      <h3
        id="judul-kota"
        className="mt-9 text-2xl font-bold text-tinta lg:mt-14 lg:border-t-2 lg:border-tinta lg:pt-5 lg:text-5xl lg:leading-[0.95] lg:tracking-tighter"
      >
        Tinggal di mana?
      </h3>

      <label htmlFor="cari-kota" className="hanya-sr">
        Cari kota
      </label>
      <input
        id="cari-kota"
        type="search"
        inputMode="search"
        autoComplete="off"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        placeholder="Cari kota lo"
        className="mt-3 min-h-sentuh w-full rounded-chip border-2 border-tinta bg-kertas px-4 font-display text-base text-tinta placeholder:text-tinta-pudar lg:mt-5 lg:max-w-[22rem]"
      />

      <ChipSelector
        labelId="judul-kota"
        opsi={opsiKota}
        nilai={cityId}
        onPilih={setCity}
        className="mt-3 flex flex-wrap gap-2"
      />

      {tidakKetemu && (
        <p role="status" className="mt-2 text-sm text-tinta-pudar">
          Kota itu belum ada di data kami. Pilih “Lainnya” dulu, angkanya kami pakai rata-rata.
        </p>
      )}

      {/* Tag biaya kos di bawah peta, bukan menimpanya: Jawa (Jakarta, Bandung, ...) ada di bawah */}
      <div className="relative mt-5 lg:mt-8 lg:max-w-[40rem] lg:border lg:border-dashed lg:border-tinta/40 lg:p-4">
        <span aria-hidden className="selotip -top-3 left-10 hidden lg:block" />
        <p aria-hidden className="mikro mb-1 hidden text-tinta-pudar lg:block">
          Lampiran A — Peta biaya kos
        </p>
        <PetaIndonesia cityId={cityId} />
        <div aria-live="polite" className="-mt-2 flex min-h-[2.75rem] justify-end">
          <AnimatePresence mode="wait">
            {kota && (
              <motion.p
                key={kota.id}
                initial={{ opacity: 0, y: 8, rotate: -2 }}
                animate={{ opacity: 1, y: 0, rotate: -2 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                className="tekstur-thermal border border-tinta/20 px-3 py-1.5 font-mono text-struk text-tinta shadow-struk"
              >
                Biaya kos rata-rata di sini:{' '}
                <strong className="whitespace-nowrap">{formatRupiah(kota.kos)}</strong>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="zona-jempol">
        <button type="button" onClick={next} disabled={!lengkap} className="tombol-cta">
          {lengkap ? 'Lanjut' : 'Pilih status dan kota dulu'}
        </button>
      </div>
      </div>
    </section>
  );
}
