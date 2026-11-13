/**
 * Font untuk semua gambar next/og (kartu 9:16 dan OG landscape).
 * Di-bundle dari paket @fontsource lewat new URL(..., import.meta.url):
 * jalan di edge runtime, tidak memanggil Google Fonts, tidak butuh fs.
 * Satori belum mendukung woff2, jadi pakai .woff.
 */

type FontOg = { name: string; data: ArrayBuffer; weight: 400 | 700 };

let cache: Promise<FontOg[]> | null = null;

export function fontOg(): Promise<FontOg[]> {
  cache ??= Promise.all([
    fetch(new URL('../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff', import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL('../node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff', import.meta.url)).then((r) => r.arrayBuffer()),
  ])
    .then(([display, mono, monoTebal]) => [
      { name: 'Display', data: display, weight: 700 as const },
      { name: 'Mono', data: mono, weight: 400 as const },
      { name: 'Mono', data: monoTebal, weight: 700 as const },
    ])
    .catch(() => {
      cache = null; // coba lagi di request berikutnya; kali ini pakai font bawaan
      return [];
    });
  return cache;
}
