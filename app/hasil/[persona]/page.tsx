import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PERSONAS, type PersonaId } from '@/lib/simulasi';

/**
 * Halaman tujuan link share per persona. Hanya memuat persona (tanpa angka gaji),
 * supaya preview link di WhatsApp/X punya gambar & judul sesuai hasil.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(PERSONAS).map((persona) => ({ persona }));
}

export function generateMetadata({ params }: { params: { persona: string } }): Metadata {
  const persona = PERSONAS[params.persona as PersonaId];
  if (!persona) return {};
  const judul = `Persona gue: ${persona.nama}`;
  return {
    title: `${judul} — Hidup Ngepas`,
    description: `“${persona.kalimat}” Gaji lo cukup buat hidup? Cek di simulasi 2 menit, tanpa login.`,
    alternates: { canonical: `/hasil/${persona.id}` },
    openGraph: { title: judul, description: persona.kalimat, url: `/hasil/${persona.id}` },
    twitter: { title: judul, description: persona.kalimat },
  };
}

export default function HalamanPersona({ params }: { params: { persona: string } }) {
  const persona = PERSONAS[params.persona as PersonaId];
  if (!persona) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-scene flex-col justify-center px-5 py-16">
      <p className="mikro text-tinta-pudar">Hidup Ngepas · kartu persona</p>
      <h1 className="judul-editorial mt-4">Persona temen lo: {persona.nama}.</h1>
      <p className="mt-4 max-w-[34ch] border-l-4 border-tinta pl-4 text-lg leading-snug text-tinta">
        “{persona.kalimat}”
      </p>
      <p className="mt-8 text-tinta-pudar">Lo sendiri gimana? Dua menit, tanpa login, dihitung di HP lo.</p>
      <div className="mt-6">
        <Link href="/" className="tombol-cta">
          Hitung punya gue
        </Link>
      </div>
    </main>
  );
}
