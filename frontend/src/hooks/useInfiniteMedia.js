import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

export function useInfiniteMedia(params = {}, endpoint = '/media/feed') {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // Incrementing this forces the fetch effect to re-run even when page is
  // already 1 — which is the case for every SSE-triggered refresh.
  const [refreshKey, setRefreshKey] = useState(0);
  const paramsKey = JSON.stringify(params);
  const prevParamsKey = useRef(paramsKey);

  // Reset when filter params change (e.g. switching category).
  useEffect(() => {
    if (prevParamsKey.current !== paramsKey) {
      prevParamsKey.current = paramsKey;
      setItems([]);
      setPage(1);
      setTotalPages(1);
    }
  }, [paramsKey]);

  // Listen for real-time upload notifications pushed by the backend.
  // Only increment refreshKey — never clear items here.
  // Items are replaced only once fresh data actually arrives (below),
  // so the gallery never goes blank between the event and the response.
  useEffect(() => {
    const es = new EventSource('/api/events');
    es.addEventListener('new_media', () => {
      setPage(1);
      setRefreshKey(k => k + 1);
    });
    return () => es.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.get(endpoint, { params: { ...params, page, limit: 20 } })
      .then(res => {
        if (cancelled) return;
        const { data, pagination } = res.data;
        // page 1 replaces the list (covers both normal load and SSE refresh).
        // page > 1 appends (infinite scroll).
        setItems(prev => page === 1 ? data : [...prev, ...data]);
        setTotalPages(pagination.totalPages);
      })
      .catch(err => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [paramsKey, page, refreshKey]);

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) setPage(p => p + 1);
  }, [loading, page, totalPages]);

  const hasMore = page < totalPages;

  return { items, loading, error, loadMore, hasMore };
}
