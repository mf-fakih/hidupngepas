import { ImageResponse } from 'next/og';
import { fontOg } from '@/lib/og-font';
import { PERSONAS, formatRupiah, type PersonaId } from '@/lib/simulasi';

/**
 * Kartu hasil 9:16 (1080×1920) untuk Story / TikTok.
 *
 * Menerima angka RINGKAS saja lewat query (tidak disimpan, tidak di-log):
 *   p   persona id              wajib
 *   sp  sisa per bulan dalam % penghasilan (dipakai kalau nominal disembunyikan)
 *   s   sisa per bulan (Rp)      hanya dikirim kalau user menyalakan "Tampilkan nominal gaji"
 *   i   penghasilan (Rp)         idem
 *   u   umur DP rumah            kosong = belum kekejar
 *   g   % penghasilan untuk gaya hidup
 *   h   1 = mode hard, k = 1 → KPR ditolak
 */
export const runtime = 'edge';

const W = 1080;
const H = 1920;

const KERTAS = '#F4EFE6';
const KERTAS_LIPAT = '#E5DDCE';
const TINTA = '#141414';
const TINTA_PUDAR = '#5C5850';
const MINUS = '#E5383B';
const MINUS_TEKS = '#C1121F'; // teks kecil: lolos AA di atas kertas
const AMAN = '#2DC653';
const NEON = '#C6FF3D';

const angka = (v: string | null, min: number, max: number) => {
  if (v === null || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
};

function Baris({ label, nilai, warna = TINTA }: { label: string; nilai: string; warna?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingTop: 22, paddingBottom: 22, borderBottom: `3px solid ${KERTAS_LIPAT}` }}>
      <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 34, color: TINTA_PUDAR, letterSpacing: 2 }}>{label}</div>
      <div style={{ display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 64, color: warna, lineHeight: 1 }}>{nilai}</div>
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  const idPersona = q.get('p') as PersonaId | null;
  const persona = idPersona && idPersona in PERSONAS ? PERSONAS[idPersona] : PERSONAS['si-paling-ngepas'];

  const sisaRp = angka(q.get('s'), -1_000_000_000, 1_000_000_000);
  const penghasilan = angka(q.get('i'), 0, 1_000_000_000);
  const sisaPct = angka(q.get('sp'), -999, 100) ?? 0;
  const umurDp = angka(q.get('u'), 10, 99);
  const gayaHidupPct = angka(q.get('g'), 0, 999) ?? 0;
  const modeHard = q.get('h') === '1';
  const kprDitolak = q.get('k') === '1';

  const minus = sisaRp !== null ? sisaRp < 0 : sisaPct < 0;
  const teksSisa =
    sisaRp !== null ? formatRupiah(sisaRp) : `${sisaPct > 0 ? '+' : ''}${sisaPct}% gaji`;

  const fonts = await fontOg();

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: KERTAS, fontFamily: 'Display', color: TINTA, position: 'relative' }}>
        {/* Teks latar raksasa, gaya marquee */}
        <div style={{ position: 'absolute', top: 70, left: -40, display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 150, color: 'rgba(20,20,20,0.06)', whiteSpace: 'nowrap' }}>
          GAJI NGEPAS • SISA -RP •
        </div>
        <div style={{ position: 'absolute', bottom: 60, left: -120, display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 150, color: 'rgba(20,20,20,0.06)', whiteSpace: 'nowrap' }}>
          TANGGAL TUA • PAYLATER •
        </div>

        {/* Struk */}
        <div style={{ width: 900, display: 'flex', flexDirection: 'column', background: '#FBF8F2', border: `5px solid ${TINTA}`, boxShadow: `18px 18px 0 ${TINTA}`, padding: '64px 64px 56px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Mono', fontWeight: 700, fontSize: 30, letterSpacing: 6 }}>
            <span>HIDUP NGEPAS</span>
            <span style={{ color: TINTA_PUDAR, fontWeight: 400 }}>HASIL SIMULASI</span>
          </div>
          <div style={{ display: 'flex', height: 4, marginTop: 28, background: TINTA }} />

          <div style={{ display: 'flex', marginTop: 48, fontFamily: 'Mono', fontSize: 30, color: TINTA_PUDAR, letterSpacing: 4 }}>PERSONA LO</div>
          <div style={{ display: 'flex', marginTop: 8, fontSize: 112, fontWeight: 700, lineHeight: 0.95, letterSpacing: -3 }}>{persona.nama}</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 44, lineHeight: 1.25, color: TINTA }}>“{persona.kalimat}”</div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
            {penghasilan !== null && <Baris label="PENGHASILAN" nilai={formatRupiah(penghasilan)} />}
            <Baris label="GAYA HIDUP" nilai={`${gayaHidupPct}% gaji`} />
            <Baris
              label="DP RUMAH"
              nilai={umurDp === null ? 'belum kekejar' : `umur ${umurDp}`}
              warna={umurDp === null || kprDitolak ? MINUS : TINTA}
            />
          </div>

          {/* SISA: blok warna, teks tinta */}
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, padding: '28px 32px', background: minus ? MINUS : AMAN, border: `5px solid ${TINTA}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Mono', fontWeight: 700, fontSize: 32, letterSpacing: 4 }}>
              <span>SISA / BULAN</span>
              <span>{minus ? 'MINUS' : 'AMAN'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontFamily: 'Mono', fontWeight: 700, fontSize: 96, lineHeight: 1 }}>{teksSisa}</div>
          </div>

          {kprDitolak && (
            <div style={{ display: 'flex', marginTop: 28, fontFamily: 'Mono', fontWeight: 700, fontSize: 30, color: MINUS_TEKS }}>* KPR rawan ditolak: riwayat telat paylater</div>
          )}
        </div>

        {modeHard && (
          <div style={{ position: 'absolute', top: 200, right: 70, display: 'flex', transform: 'rotate(6deg)', background: NEON, border: `5px solid ${TINTA}`, boxShadow: `8px 8px 0 ${TINTA}`, padding: '14px 26px', fontSize: 40, fontWeight: 700 }}>
            Mode hard
          </div>
        )}

        {/* Watermark */}
        <div style={{ position: 'absolute', bottom: 150, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>Hitung punya lo sendiri →</div>
          <div style={{ display: 'flex', marginTop: 10, fontFamily: 'Mono', fontSize: 34, color: TINTA_PUDAR }}>{url.host}</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, immutable' },
    },
  );
}
