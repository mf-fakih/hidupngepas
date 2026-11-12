/**
 * Bunyi "ka-ching" kecil, disintesis dengan Web Audio.
 * Tanpa file audio: 0 KB tambahan, aman untuk mode hemat kuota.
 * Hanya dipanggil dari event user (swipe/klik), jadi lolos aturan autoplay browser.
 */
let ctx: AudioContext | null = null;

export function playKaChing(): void {
  if (typeof window === 'undefined') return;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();

    const mulai = ctx.currentTime;
    // Dua nada naik cepat: "ka" lalu "ching"
    const nada: [frekuensi: number, jeda: number][] = [
      [1318.5, 0],
      [1975.5, 0.07],
    ];

    for (const [frekuensi, jeda] of nada) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = mulai + jeda;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frekuensi, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    }
  } catch {
    // Audio gagal bukan alasan untuk mengganggu simulasi
  }
}

/** Getar pendek kalau perangkat mendukung (Android). iOS Safari mengabaikannya. */
export function getar(pola: number | number[] = 8): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pola);
    } catch {
      // abaikan
    }
  }
}
