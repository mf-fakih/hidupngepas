'use client';

/**
 * Hidup Ngepas — state simulasi (Zustand + persist) dan hook turunan.
 *
 *   4. Store Zustand + persist ke localStorage
 *   5. Hook turunan (useMonthly, useProjection, useResult, ...)
 *
 * Tipe, dataset, dan rumus ada di lib/simulasi.ts (modul murni, aman untuk server)
 * dan di-re-export dari sini, jadi komponen cukup mengimpor dari store.
 *
 * Semua dihitung di browser. Satu-satunya yang keluar: angka ringkas kartu hasil
 * ke /api/og (lihat CLAUDE.md).
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  ASUMSI,
  SCENE_BY_ID,
  STATUS,
  WHAT_IF_AWAL,
  calcLifestyle,
  calcMonthly,
  calcPaylater,
  compareWhatIf,
  getNextScene,
  getPrevScene,
  hitungSimulasi,
  jepit,
  terapkanSwipe,
  terapkanUndo,
  type CityId,
  type HasilKartu,
  type KonteksNavigasi,
  type LifestyleId,
  type Monthly,
  type Paylater,
  type PaylaterChoice,
  type SceneId,
  type SimulationInput,
  type Status,
  type WhatIf,
} from '@/lib/simulasi';

export * from '@/lib/simulasi';

/* ================================================================== */
/* 4. STORE                                                            */
/* ================================================================== */

interface SimulationState {
  // Babak 1 — input
  status: Status | null;
  cityId: CityId | null;
  age: number;
  income: number;
  lifestyleIds: LifestyleId[];
  /** Semua kartu yang sudah di-swipe (kanan maupun kiri), urut waktu — untuk undo */
  swipedIds: LifestyleId[];

  // Babak 2 — realita
  tornIds: LifestyleId[];
  paylaterChoice: PaylaterChoice;
  whatIf: WhatIf;

  // Navigasi & preferensi
  scene: SceneId;
  soundOn: boolean;
  /** Toggle "tampilkan angka" di kartu hasil. Default mati demi privasi. */
  showAmountOnCard: boolean;
  /** Timestamp terakhir sampai kartu hasil → tawaran "Lanjut dari hasil terakhir?" */
  completedAt: number | null;
  /** true setelah localStorage selesai dibaca (lihat catatan hidrasi di bawah) */
  hasHydrated: boolean;
}

interface SimulationActions {
  setStatus: (status: Status) => void;
  setCity: (cityId: CityId) => void;
  setAge: (age: number) => void;
  setIncome: (income: number) => void;

  swipe: (id: LifestyleId, arah: 'kanan' | 'kiri') => void;
  undoSwipe: () => void;

  toggleTorn: (id: LifestyleId) => void;
  resetTorn: () => void;
  choosePaylater: (choice: Exclude<PaylaterChoice, null>) => void;
  setWhatIf: (patch: Partial<WhatIf>) => void;
  resetWhatIf: () => void;

  goTo: (scene: SceneId) => void;
  next: () => void;
  back: () => void;

  toggleSound: () => void;
  toggleShowAmount: () => void;
  markCompleted: () => void;
  /** "Coba skenario lain": balik ke scene 03, status/kota/gaji tetap tersimpan */
  retryScenario: () => void;
  resetAll: () => void;
}

export type SimulationStore = SimulationState & SimulationActions;

const STATE_AWAL: SimulationState = {
  status: null,
  cityId: null,
  age: STATUS.kerja.umurDefault,
  income: ASUMSI.UPAH_RATA_20_24,
  lifestyleIds: [],
  swipedIds: [],
  tornIds: [],
  paylaterChoice: null,
  whatIf: WHAT_IF_AWAL,
  scene: 'hero',
  soundOn: false,
  showAmountOnCard: false,
  completedAt: null,
  hasHydrated: false,
};

/** Ambil input simulasi dari state. null kalau status/kota belum dipilih. */
export function selectInput(s: SimulationState): SimulationInput | null {
  if (!s.status || !s.cityId) return null;
  return {
    status: s.status,
    cityId: s.cityId,
    age: s.age,
    income: s.income,
    lifestyleIds: s.lifestyleIds,
    tornIds: s.tornIds,
    paylaterChoice: s.paylaterChoice,
  };
}

const konteksNavigasi = (s: SimulationState): KonteksNavigasi => {
  const input = selectInput(s);
  return {
    // Pop-up paylater ditentukan dari SISA yang sedang tampil di struk (setelah sobekan)
    isMinus: input ? calcMonthly(input).isMinus : false,
    paylaterChoice: s.paylaterChoice,
  };
};

export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      ...STATE_AWAL,

      setStatus: (status) =>
        set({
          status,
          age: STATUS[status].umurDefault,
          // Gaji berubah makna (gaji ↔ uang saku), keputusan paylater lama tidak relevan lagi
          paylaterChoice: null,
        }),

      setCity: (cityId) => set({ cityId, paylaterChoice: null }),

      setAge: (age) => set({ age: jepit(Math.round(age), ASUMSI.UMUR_MIN, ASUMSI.UMUR_MAKS_INPUT) }),

      setIncome: (income) =>
        set({
          income: jepit(Math.round(Number.isFinite(income) ? income : 0), 0, ASUMSI.GAJI_MAKS),
          paylaterChoice: null,
        }),

      swipe: (id, arah) => set((s) => terapkanSwipe(s, id, arah)),

      undoSwipe: () => set((s) => terapkanUndo(s)),

      // Struk berubah → SISA berubah → keputusan paylater lama tidak berlaku lagi
      toggleTorn: (id) =>
        set((s) => ({
          tornIds: s.tornIds.includes(id)
            ? s.tornIds.filter((t) => t !== id)
            : [...s.tornIds, id],
          paylaterChoice: null,
        })),

      resetTorn: () => set({ tornIds: [], paylaterChoice: null }),

      choosePaylater: (choice) => set({ paylaterChoice: choice }),

      setWhatIf: (patch) =>
        set((s) => ({
          whatIf: {
            ...s.whatIf,
            ...patch,
            raisePct: jepit(patch.raisePct ?? s.whatIf.raisePct, 0, 100),
            jajanHematPct: jepit(patch.jajanHematPct ?? s.whatIf.jajanHematPct, 0, 100),
          },
        })),

      resetWhatIf: () => set({ whatIf: WHAT_IF_AWAL }),

      goTo: (scene) => set({ scene }),
      next: () => set((s) => ({ scene: getNextScene(s.scene, konteksNavigasi(s)) })),
      back: () => set((s) => ({ scene: getPrevScene(s.scene, konteksNavigasi(s)) })),

      toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
      toggleShowAmount: () => set((s) => ({ showAmountOnCard: !s.showAmountOnCard })),
      markCompleted: () => set({ completedAt: Date.now() }),

      retryScenario: () =>
        set({
          lifestyleIds: [],
          swipedIds: [],
          tornIds: [],
          paylaterChoice: null,
          whatIf: WHAT_IF_AWAL,
          scene: 'gaji',
        }),

      resetAll: () => set({ ...STATE_AWAL, hasHydrated: get().hasHydrated }),
    }),
    {
      name: 'hidup-ngepas:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),

      // Jawaban user (termasuk sobekan struk) & preferensi. Scene aktif mengikuti hash URL,
      // what-if sengaja mulai bersih tiap kunjungan.
      partialize: (s) => ({
        status: s.status,
        cityId: s.cityId,
        age: s.age,
        income: s.income,
        lifestyleIds: s.lifestyleIds,
        swipedIds: s.swipedIds,
        tornIds: s.tornIds,
        paylaterChoice: s.paylaterChoice,
        soundOn: s.soundOn,
        showAmountOnCard: s.showAmountOnCard,
        completedAt: s.completedAt,
      }),

      /**
       * CATATAN HIDRASI (Next.js App Router)
       * localStorage tidak ada saat SSR. Kalau store langsung membaca localStorage
       * di render pertama client, HTML server ≠ client → hydration error.
       * Jadi pembacaan ditunda: panggil sekali di komponen client paling atas
       *
       *   useEffect(() => { void useSimulationStore.persist.rehydrate(); }, []);
       *
       * lalu pakai `hasHydrated` untuk menahan UI yang bergantung pada data tersimpan
       * (contoh: tawaran "Lanjut dari hasil terakhir?").
       */
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useSimulationStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/* ================================================================== */
/* 5. HOOK TURUNAN                                                     */
/* ================================================================== */
/*
 * Selector Zustand yang mengembalikan objek baru tiap render bikin render loop.
 * Jadi: ambil field mentah dengan useShallow, hitung dengan useMemo.
 */

export function useSimulationInput(): SimulationInput | null {
  const [status, cityId, age, income, lifestyleIds, tornIds, paylaterChoice] = useSimulationStore(
    useShallow((s) => [
      s.status,
      s.cityId,
      s.age,
      s.income,
      s.lifestyleIds,
      s.tornIds,
      s.paylaterChoice,
    ] as const),
  );

  return useMemo(
    () =>
      status && cityId
        ? { status, cityId, age, income, lifestyleIds, tornIds, paylaterChoice }
        : null,
    [status, cityId, age, income, lifestyleIds, tornIds, paylaterChoice],
  );
}

/** Hasil simulasi tanpa what-if: sumber angka struk, jalur 05b/05c, kartu, dan anggaran */
export function useSimulasi() {
  const input = useSimulationInput();
  return useMemo(() => (input ? hitungSimulasi(input) : null), [input]);
}

/** Struk scene 05: baris, total, SISA (ikut berubah saat baris disobek) */
export function useMonthly(): Monthly | null {
  return useSimulasi()?.bulanan ?? null;
}

/** Total gaya hidup berjalan untuk rolling number di scene 04 */
export function useLifestyleTotal(): number {
  const lifestyleIds = useSimulationStore((s) => s.lifestyleIds);
  return useMemo(() => calcLifestyle(lifestyleIds).total, [lifestyleIds]);
}

/** Struk paylater scene 05b */
export function usePaylater(): Paylater | null {
  const bulanan = useMonthly();
  return useMemo(() => (bulanan ? calcPaylater(bulanan.sisa) : null), [bulanan]);
}

/** Timeline scene 06: proyeksi dasar vs proyeksi what-if */
export function useProjection() {
  const input = useSimulationInput();
  const whatIf = useSimulationStore((s) => s.whatIf);
  return useMemo(() => (input ? compareWhatIf(input, whatIf) : null), [input, whatIf]);
}

/** Kartu hasil scene 08 */
export function useResult(): HasilKartu | null {
  return useSimulasi()?.kartu ?? null;
}

/** Segmen progress bar yang aktif (1–3) */
export function useBabak(): 1 | 2 | 3 {
  return useSimulationStore((s) => SCENE_BY_ID[s.scene].babak);
}

/** User lama yang sudah pernah selesai → tawarkan "Lanjut dari hasil terakhir?" */
export function useBisaLanjut(): boolean {
  return useSimulationStore(
    (s) => s.hasHydrated && s.completedAt !== null && s.status !== null && s.cityId !== null,
  );
}
