import { PERSONAS, type PersonaId } from '@/lib/simulasi';
import { UKURAN_OG, renderOgStruk } from '@/lib/og-struk';

export const runtime = 'edge';
export const alt = 'Kartu persona Hidup Ngepas';
export const size = UKURAN_OG;
export const contentType = 'image/png';


export default function Image({ params }: { params: { persona: string } }) {
  return renderOgStruk({ persona: PERSONAS[params.persona as PersonaId] });
}
