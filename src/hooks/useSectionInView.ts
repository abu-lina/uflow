import { useEffect, useState } from 'react';

export function useSectionInView(sectionId: string, threshold = 0.5) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const observer = new window.IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold,
    });

    observer.observe(section);

    return () => observer.disconnect();
  }, [sectionId, threshold]);

  return inView;
}
