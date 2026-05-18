import { useEffect, useRef } from 'react';

export default function InfiniteScrollSentinel({ onIntersect, hasMore }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) onIntersect();
    }, { rootMargin: '200px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onIntersect]);

  return <div ref={ref} className="h-1" />;
}
