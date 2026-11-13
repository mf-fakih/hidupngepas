'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { getar } from '@/lib/sound';
import { urlKartu, useResult, useSimulationStore } from '@/store/useSimulationStore';

const NAMA_FILE = 'hidup-ngepas.png';

/** Simpan blob sebagai file lewat <a download> */
function unduhBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = NAMA_FILE;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Placeholder selama gambar dicetak: sudah berbentuk kartu (struk, baris, blok sisa),
 * jadi tidak ada lompatan tata letak. Denyutnya mati kalau reduced motion.
 */
function KerangkaKartu() {
  const balok = 'rounded-sm bg-tinta/10';
  return (
    <div role="status" className="absolute inset-0 grid place-items-center bg-kertas p-[8%] motion-safe:animate-pulse">
      <span className="hanya-sr">Lagi nyetak kartu lo...</span>
      <div aria-hidden className="w-full border-2 border-tinta/20 bg-kertas-lipat/40 p-[7%]">
        <div className={`h-2 w-1/2 ${balok}`} />
        <div className="mt-3 h-px w-full bg-tinta/20" />
        <div className={`mt-4 h-2 w-1/3 ${balok}`} />
        <div className={`mt-2 h-6 w-4/5 ${balok}`} />
        <div className={`mt-2 h-2 w-full ${balok}`} />
        <div className={`mt-1.5 h-2 w-2/3 ${balok}`} />
        <div className="mt-5 space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="flex justify-between">
              <div className={`h-2 w-1/4 ${balok}`} />
              <div className={`h-3 w-1/3 ${balok}`} />
            </div>
          ))}
        </div>
        <div className="mt-5 h-12 w-full rounded-sm border-2 border-tinta/20 bg-tinta/10" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kartu preview: flip 3D saat masuk + kilau holografik                */
/* ------------------------------------------------------------------ */

function KartuHolo({ src, alt }: { src: string; alt: string }) {
  const kurangiGerak = useReducedMotion();
  const kartu = useRef<HTMLDivElement>(null);
  const [termuat, setTermuat] = useState(false);

  // Gerak kursor / kemiringan HP → CSS var (tanpa re-render React)
  const setMiring = (nx: number, ny: number) => {
    const el = kartu.current;
    if (!el || kurangiGerak) return;
    el.style.setProperty('--ry', `${(nx - 0.5) * 16}deg`);
    el.style.setProperty('--rx', `${(0.5 - ny) * 12}deg`);
    el.style.setProperty('--gx', `${nx * 100}%`);
    el.style.setProperty('--gy', `${ny * 100}%`);
  };

  useEffect(() => {
    if (kurangiGerak) return;
    const onMiring = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const nx = Math.min(1, Math.max(0, 0.5 + e.gamma / 60));
      const ny = Math.min(1, Math.max(0, 0.5 + (e.beta - 45) / 60));
      setMiring(nx, ny);
    };
    window.addEventListener('deviceorientation', onMiring, { passive: true });
    return () => window.removeEventListener('deviceorientation', onMiring);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurangiGerak]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setMiring((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const onPointerLeave = () => setMiring(0.5, 0.5);

  return (
    <div className="mx-auto w-[min(17rem,68vw)] [perspective:1100px] lg:mx-0 lg:w-[min(19rem,33dvh)] lg:shrink-0">
      <motion.div
        initial={kurangiGerak ? false : { rotateY: -180, y: 30, scale: 0.9 }}
        animate={{ rotateY: 0, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 70, damping: 14, delay: 0.25 }}
        className="relative [transform-style:preserve-3d]"
      >
        {/* Depan */}
        <div
          ref={kartu}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          className="relative aspect-[9/16] overflow-hidden rounded-[1.1rem] border-2 border-tinta bg-kertas-lipat shadow-tombol transition-transform duration-200 ease-out [backface-visibility:hidden]"
          style={{ transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={alt}
            onLoad={() => setTermuat(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${termuat ? 'opacity-100' : 'opacity-0'}`}
          />
          {!termuat && <KerangkaKartu />}
          {/* Kilau holografik: pelangi tipis + sorot yang ikut kursor */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-color-dodge opacity-60"
            style={{
              background:
                'radial-gradient(circle at var(--gx,50%) var(--gy,30%), rgb(255 255 255 / 0.55), transparent 38%),' +
                'linear-gradient(115deg, transparent 22%, rgb(198 255 61 / 0.28) 38%, rgb(255 120 200 / 0.24) 50%, rgb(90 200 255 / 0.26) 62%, transparent 78%)',
              backgroundSize: '100% 100%, 220% 220%',
              backgroundPosition: 'center, var(--gx,50%) var(--gy,50%)',
            }}
          />
        </div>

        {/* Belakang: terlihat sesaat saat kartu berputar masuk */}
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center rounded-[1.1rem] border-2 border-tinta bg-tinta [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <p className="rotate-[-8deg] font-mono text-2xl font-bold tracking-[0.2em] text-neon">HIDUP NGEPAS</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 08 — Kartu Hasil (Wrapped)                                          */
/* ------------------------------------------------------------------ */

export function Scene08Wrapped() {
  const hasil = useResult();
  const tampilkanNominal = useSimulationStore((s) => s.showAmountOnCard);
  const toggleShowAmount = useSimulationStore((s) => s.toggleShowAmount);
  const markCompleted = useSimulationStore((s) => s.markCompleted);
  const retryScenario = useSimulationStore((s) => s.retryScenario);
  const next = useSimulationStore((s) => s.next);

  const [sibuk, setSibuk] = useState<'share' | 'unduh' | null>(null);
  const [kabar, setKabar] = useState('');

  useEffect(() => {
    markCompleted();
  }, [markCompleted]);

  // Hanya angka ringkas yang dikirim ke /api/og. Nominal rupiah HANYA kalau toggle nyala.
  // URL sama persis dengan prefetch di scene 07, jadi biasanya gambarnya sudah di cache.
  const src = useMemo(() => (hasil ? urlKartu(hasil, tampilkanNominal) : null), [hasil, tampilkanNominal]);

  if (!hasil || !src) return null;

  const ambilBlob = async () => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Gagal membuat kartu (${res.status})`);
    return res.blob();
  };

  const share = async () => {
    setSibuk('share');
    try {
      const blob = await ambilBlob();
      const file = new File([blob], NAMA_FILE, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        // Link persona: preview-nya cuma persona, tanpa angka gaji
        const link = `${window.location.origin}/hasil/${hasil.persona.id}`;
        await navigator.share({
          files: [file],
          title: 'Hidup Ngepas',
          text: `Persona gue: ${hasil.persona.nama}. Lo apa? ${link}`,
        });
        setKabar('Kartu dibagikan.');
      } else {
        unduhBlob(blob); // browser desktop umumnya belum bisa share file
        setKabar('Browser ini belum bisa share langsung, jadi kartunya kami unduhin.');
      }
      getar(10);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setKabar('Gagal share. Coba "Unduh PNG" aja.');
    } finally {
      setSibuk(null);
    }
  };

  const unduh = async () => {
    setSibuk('unduh');
    try {
      unduhBlob(await ambilBlob());
      setKabar('Kartu diunduh.');
      getar(10);
    } catch {
      setKabar('Gagal mengunduh kartu. Coba lagi sebentar.');
    } finally {
      setSibuk(null);
    }
  };

  return (
    <section className="scene scene-split" aria-labelledby="judul-kartu">
      <div className="kolom-kiri">
        <p aria-hidden className="mikro mb-4 hidden text-tinta-pudar lg:block">
          Babak 3 — Hasil akhir · Kartu persona
        </p>
        <h2 id="judul-kartu" data-judul-scene tabIndex={-1} className="judul-editorial">
          Lo adalah: {hasil.persona.nama}.
        </h2>
        <p className="mt-2 text-tinta-pudar lg:mt-5 lg:max-w-[30ch] lg:border-l-4 lg:border-tinta lg:pl-5 lg:text-xl lg:leading-snug lg:text-tinta">
          {hasil.persona.kalimat}
        </p>

        {/* Desktop: lembar hasil ala buku besar */}
        <div aria-hidden className="mt-8 hidden lg:block">
          <div className="ledger border-t-2 border-t-tinta">
            <span className="kode">HSL-01</span>
            <span>GAYA HIDUP</span>
            <span className="nilai">{hasil.lifestylePct}% pemasukan</span>
          </div>
          <div className="ledger">
            <span className="kode">HSL-02</span>
            <span>SISA / BULAN</span>
            <span className={`nilai ${hasil.sisa < 0 ? 'text-minus-teks' : ''}`}>
              {hasil.income > 0 ? `${hasil.sisaPct}%` : '—'}
            </span>
          </div>
          <div className="ledger">
            <span className="kode">HSL-03</span>
            <span>DP RUMAH</span>
            <span className="nilai">{hasil.umurDpRumah === null ? 'belum kekejar' : `umur ${hasil.umurDpRumah}`}</span>
          </div>
          <span className="stempel mt-6 text-base text-tinta" style={{ ['--putar' as string]: '-2deg' }}>
            Dihitung di browser lo
          </span>
        </div>
      </div>

      <div className="kolom-kanan">
      <div className="lg:flex lg:items-center lg:gap-14">
      <div className="mt-6 lg:mt-0">
        <KartuHolo
          src={src}
          alt={`Kartu hasil Hidup Ngepas: persona ${hasil.persona.nama}, gaya hidup ${hasil.lifestylePct}% penghasilan, DP rumah ${
            hasil.umurDpRumah === null ? 'belum kekejar' : `umur ${hasil.umurDpRumah}`
          }.`}
        />
      </div>

      <div className="lg:max-w-[21rem]">
      <p aria-hidden className="mikro hidden text-tinta-pudar lg:block">Privasi kartu</p>
      {/* Toggle privasi */}
      <label className="mx-auto mt-6 flex lg:mx-0 lg:mt-3 min-h-sentuh w-full max-w-[19rem] cursor-pointer items-center justify-between gap-3 rounded-chip border-2 border-tinta px-4 py-2">
        <span className="font-display text-sm font-medium text-tinta">Tampilkan nominal gaji</span>
        <input
          type="checkbox"
          role="switch"
          checked={tampilkanNominal}
          onChange={toggleShowAmount}
          className="peer hanya-sr"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full border-2 border-tinta bg-kertas transition-colors peer-checked:bg-tinta peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta peer-checked:[&>span]:translate-x-5"
        >
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full border-2 border-tinta bg-neon transition-transform duration-200" />
        </span>
      </label>
      <p className="mx-auto mt-2 max-w-[19rem] text-center text-[0.75rem] leading-snug text-tinta-pudar lg:mx-0 lg:mt-3 lg:text-left lg:text-sm">
        {tampilkanNominal
          ? 'Gaji & sisa dalam rupiah ikut tercetak. Yakin mau di-share?'
          : 'Default disembunyiin. Kartu cuma nunjukin persen, bukan rupiah.'}{' '}
        Kartu digambar server dari angka ringkas ini, nggak disimpan.
      </p>

      <p role="status" className="mt-2 min-h-[1.25rem] text-center text-sm font-medium text-tinta lg:text-left">
        <AnimatePresence mode="wait">
          {kabar && (
            <motion.span key={kabar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {kabar}
            </motion.span>
          )}
        </AnimatePresence>
      </p>
      </div>
      </div>

      <div className="zona-jempol">
        <button type="button" onClick={share} disabled={sibuk !== null} className="tombol-cta">
          {sibuk === 'share' ? 'Nyiapin kartu...' : 'Share ke Story'}
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:max-w-[28rem]">
          <button type="button" onClick={unduh} disabled={sibuk !== null} className="tombol-polos !px-3 text-sm leading-tight">
            {sibuk === 'unduh' ? 'Ngunduh...' : 'Unduh PNG'}
          </button>
          <button type="button" onClick={retryScenario} className="tombol-polos !px-3 text-sm leading-tight">
            Coba skenario lain
          </button>
        </div>
        <button
          type="button"
          onClick={next}
          className="mx-auto mt-2 flex min-h-sentuh items-center px-4 font-display lg:mx-0 lg:px-0 text-sm font-medium text-tinta underline underline-offset-4"
        >
          Terus, gue harus ngapain?
        </button>
      </div>
      </div>
    </section>
  );
}
