import { ImageResponse } from 'next/og';
import { fontOg } from '@/lib/og-font';
import type { Persona } from '@/lib/simulasi';

/**
 * Gambar OG landscape 1200×630 bertema struk, untuk preview link
 * (WhatsApp, X, Telegram, LINE). Font lokal dari lib/og-font.ts.
 */

export const UKURAN_OG = { width: 1200, height: 630 };

const KERTAS = '#F4EFE6';
const KERTAS_STRUK = '#FBF8F2';
const TINTA = '#141414';
const TINTA_PUDAR = '#5C5850';
const NEON = '#C6FF3D';

function BarisStruk({ label, nilai, warna = TINTA }: { label: string; nilai: string; warna?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Mono', fontSize: 19, color: warna, paddingTop: 7, paddingBottom: 7 }}>
      <span>{label}</span>
      <span>{nilai}</span>
    </div>
  );
}

/** Struk contoh di sisi kanan. Angkanya ilustrasi, bukan data siapa pun. */
function Struk({ persona }: { persona?: Persona }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 380, padding: '30px 30px 26px', background: KERTAS_STRUK, border: `4px solid ${TINTA}`, boxShadow: `14px 14px 0 ${TINTA}`, transform: 'rotate(3deg)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', fontFamily: 'Mono', fontWeight: 700, fontSize: 24, letterSpacing: 4 }}>HIDUP NGEPAS</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, fontFamily: 'Mono', fontSize: 16, color: TINTA_PUDAR, letterSpacing: 2 }}>
        {persona ? 'KARTU PERSONA' : 'STRUK BULANAN · CONTOH'}
      </div>
      <div style={{ display: 'flex', marginTop: 16, marginBottom: 6, borderTop: `3px dashed ${TINTA}` }} />
      <BarisStruk label="GAJI" nilai="5.000.000" />
      <BarisStruk label="KOS + LISTRIK" nilai="-1.800.000" />
      <BarisStruk label="MAKAN" nilai="-1.500.000" />
      <BarisStruk label="KOPI SUSU" nilai="-520.000" />
      <BarisStruk label="NONGKRONG" nilai="-400.000" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, padding: '12px 14px', background: TINTA, color: KERTAS, fontFamily: 'Mono', fontWeight: 700, fontSize: 24 }}>
        <span>SISA</span>
        <span>Rp ???.???</span>
      </div>
      {/* Barcode: Satori belum mendukung repeating-linear-gradient */}
      <div style={{ display: 'flex', marginTop: 16, height: 34, gap: 3 }}>
        {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 2, 1, 2].map((w, i) => (
          <div key={i} style={{ display: 'flex', width: w, height: '100%', background: TINTA }} />
        ))}
      </div>
    </div>
  );
}

export async function renderOgStruk({ persona }: { persona?: Persona } = {}) {
  const fonts = await fontOg();

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 90px 0 72px', background: KERTAS, color: TINTA, fontFamily: 'Display', position: 'relative' }}>
        {/* Marquee latar */}
        <div style={{ position: 'absolute', bottom: -18, left: -30, display: 'flex', fontFamily: 'Mono', fontWeight: 700, fontSize: 120, color: 'rgba(20,20,20,0.06)', whiteSpace: 'nowrap' }}>
          GAJI NGEPAS • SISA -RP • TANGGAL TUA •
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
          <div style={{ display: 'flex', fontFamily: 'Mono', fontSize: 16, letterSpacing: 3, color: TINTA_PUDAR }}>
            SIMULATOR REALITA FINANSIAL · TANPA LOGIN
          </div>

          {persona ? (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26 }}>
              <div style={{ display: 'flex', fontSize: 44, letterSpacing: -1 }}>Persona gue:</div>
              <div style={{ display: 'flex', marginTop: 6, fontSize: persona.nama.length > 16 ? 64 : 84, lineHeight: 0.95, letterSpacing: -3 }}>{persona.nama}</div>
              <div style={{ display: 'flex', marginTop: 24, fontSize: 30, lineHeight: 1.25, color: TINTA }}>“{persona.kalimat}”</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: 22, fontSize: 70, lineHeight: 1, letterSpacing: -2.5 }}>
              <span>Gaji lo cukup</span>
              <span>buat hidup? Atau</span>
              <span>cuma</span>
              <div style={{ display: 'flex', marginTop: 6, padding: '2px 16px 12px', background: TINTA, color: KERTAS }}>ngepas?</div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 34 }}>
            <div style={{ display: 'flex', padding: '14px 26px', background: NEON, border: `4px solid ${TINTA}`, boxShadow: `6px 6px 0 ${TINTA}`, fontSize: 26, whiteSpace: 'nowrap' }}>
              {persona ? 'Lo apa? Hitung →' : 'Cek hidup lo →'}
            </div>
            <div style={{ display: 'flex', marginLeft: 26, fontFamily: 'Mono', fontSize: 20, color: TINTA_PUDAR }}>hidupngepas.vercel.app</div>
          </div>
        </div>

        <Struk persona={persona} />
      </div>
    ),
    {
      ...UKURAN_OG,
      fonts: fonts.length ? fonts : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
    },
  );
}
