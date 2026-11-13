'use client';

import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KursorKonteks } from '@/components/providers/KursorKonteks';
import { MagneticCTA } from '@/components/providers/MagneticCTA';
import { SceneRouter } from '@/components/providers/SceneRouter';
import { SmoothScroll } from '@/components/providers/SmoothScroll';
import { Scene00Preloader } from '@/components/scenes/Scene00Preloader';
import { Scene01Hero } from '@/components/scenes/Scene01Hero';
import { Scene02Profile } from '@/components/scenes/Scene02Profile';
import { Scene03Income } from '@/components/scenes/Scene03Income';
import { Scene04SwipeCards } from '@/components/scenes/Scene04SwipeCards';
import { Scene05Receipt } from '@/components/scenes/Scene05Receipt';
import { Scene05aPaylaterModal } from '@/components/scenes/Scene05aPaylaterModal';
import { Scene05bPaylaterPath } from '@/components/scenes/Scene05bPaylaterPath';
import { Scene05cSavingPath } from '@/components/scenes/Scene05cSavingPath';
import { Scene06Timeline } from '@/components/scenes/Scene06Timeline';
import { Scene07Stats } from '@/components/scenes/Scene07Stats';
import { Scene08Wrapped } from '@/components/scenes/Scene08Wrapped';
import { Scene09Actions } from '@/components/scenes/Scene09Actions';
import { KineticMarquee } from '@/components/ui/KineticMarquee';
import { ProgressBar3Babak } from '@/components/ui/ProgressBar3Babak';
import { scrollKeAtas } from '@/lib/lenis';
import { useSimulationStore, type SceneId } from '@/store/useSimulationStore';

function renderScene(scene: SceneId, siap: boolean) {
  switch (scene) {
    case 'hero':
      return <Scene01Hero siap={siap} />;
    case 'kenalan':
      return <Scene02Profile />;
    case 'gaji':
      return <Scene03Income />;
    case 'gaya-hidup':
      return <Scene04SwipeCards />;
    case 'struk':
      return <Scene05Receipt />;
    case 'cairkan':
      return <Scene05aPaylaterModal />;
    case 'paylater':
      return <Scene05bPaylaterPath />;
    case 'nabung':
      return <Scene05cSavingPath />;
    case 'timeline':
      return <Scene06Timeline />;
    case 'bareng':
      return <Scene07Stats />;
    case 'kartu':
      return <Scene08Wrapped />;
    case 'aksi':
      return <Scene09Actions />;
  }
}

export default function Page() {
  const scene = useSimulationStore((s) => s.scene);
  const [preloaderSelesai, setPreloaderSelesai] = useState(false);
  const tutupPreloader = useCallback(() => setPreloaderSelesai(true), []);

  // Pindah scene: balik ke atas, dan fokus ke judul supaya pembaca layar
  // dan pengguna keyboard langsung tahu sedang di mana.
  const pertama = useRef(true);
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    scrollKeAtas();
    const id = window.setTimeout(() => {
      document.querySelector<HTMLElement>('[data-judul-scene]')?.focus({ preventScroll: true });
    }, 220);
    return () => window.clearTimeout(id);
  }, [scene]);

  return (
    // reducedMotion="user": Framer Motion mematikan animasi transform
    // untuk user yang mengaktifkan prefers-reduced-motion
    <MotionConfig reducedMotion="user">
      <SceneRouter />
      <SmoothScroll />
      <MagneticCTA />
      <KursorKonteks />
      <KineticMarquee />
      <ProgressBar3Babak />
      {!preloaderSelesai && <Scene00Preloader onDone={tutupPreloader} />}

      {/* relative TANPA z-index: scene lama yang sedang keluar diposisikan absolut di sini,
          dan modal fixed z-50 di dalam scene tetap bisa menutupi header z-40 */}
      <main className="relative">
        {/* Crossfade, bukan "wait": scene baru masuk SAAT scene lama memudar,
            jadi tidak pernah ada layar kosong di antara keduanya */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={scene}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {renderScene(scene, preloaderSelesai)}
          </motion.div>
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
