import type Lenis from 'lenis';

/**
 * Satu instance Lenis untuk seluruh app, dipasang oleh SmoothScroll.
 * null kalau reduced motion (scroll native biasa).
 */
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null): void {
  instance = l;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Balik ke atas tanpa animasi: dipakai saat pindah scene */
export function scrollKeAtas(): void {
  if (instance) instance.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

/** Kunci scroll (modal, klimaks animasi). Tanpa Lenis cukup overflow hidden. */
export function kunciScroll(kunci: boolean): void {
  if (instance) {
    if (kunci) instance.stop();
    else instance.start();
    return;
  }
  document.documentElement.style.overflow = kunci ? 'hidden' : '';
}
