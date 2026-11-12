'use client';

import { useEffect, useState } from 'react';

/** true kalau media query cocok. Selalu false di render pertama (aman untuk hidrasi). */
export function useMediaQuery(query: string): boolean {
  const [cocok, setCocok] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setCocok(mq.matches);
    const ubah = (e: MediaQueryListEvent) => setCocok(e.matches);
    mq.addEventListener('change', ubah);
    return () => mq.removeEventListener('change', ubah);
  }, [query]);

  return cocok;
}
