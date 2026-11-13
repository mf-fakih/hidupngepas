import { UKURAN_OG, renderOgStruk } from '@/lib/og-struk';

export const runtime = 'edge';
export const alt = 'Hidup Ngepas: gaji lo cukup buat hidup? Atau cuma ngepas?';
export const size = UKURAN_OG;
export const contentType = 'image/png';

export default function Image() {
  return renderOgStruk();
}
