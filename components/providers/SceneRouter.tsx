'use client';

import { useEffect } from 'react';
import {
  SCENE_BY_ID,
  sceneFromHash,
  sceneYangBoleh,
  useSimulationStore,
  type SceneId,
} from '@/store/useSimulationStore';

/**
 * Dua tugas, dipasang sekali di page.tsx:
 *   1. Membaca localStorage setelah mount (store memakai skipHydration).
 *   2. Menjaga scene di store dan hash URL tetap sama, dua arah:
 *        store berubah  → pushState('#gaji')      → tombol back browser punya riwayat
 *        back / forward → popstate → goTo(scene)  → deep-link /#gaya-hidup jalan
 */

// Aturan deep-link ada di lib/simulasi.ts (sceneYangBoleh), supaya bisa dites.

function tulisHash(scene: SceneId, ganti = false) {
  const hash = SCENE_BY_ID[scene].hash;
  if (window.location.hash.replace(/^#/, '') === hash) return;
  const url = hash ? `#${hash}` : window.location.pathname + window.location.search;
  if (ganti) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
}

export function SceneRouter() {
  useEffect(() => {
    const store = useSimulationStore;
    let batal = false;

    const bacaHash = () => {
      const diminta = sceneFromHash(window.location.hash);
      const boleh = sceneYangBoleh(diminta, store.getState());
      if (boleh !== diminta) tulisHash(boleh, true);
      store.getState().goTo(boleh);
    };

    const berhenti = store.subscribe((kini, dulu) => {
      if (kini.scene !== dulu.scene) tulisHash(kini.scene);
    });

    window.addEventListener('popstate', bacaHash);

    // Data tersimpan harus masuk dulu, baru hash dinilai boleh atau tidak
    void Promise.resolve(store.persist.rehydrate()).then(() => {
      if (!batal) bacaHash();
    });

    return () => {
      batal = true;
      berhenti();
      window.removeEventListener('popstate', bacaHash);
    };
  }, []);

  return null;
}
