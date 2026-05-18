import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';

export function useInfiniteMedia(params = {}, endpoint = '/media/feed') {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params);
  const prevParamsKey = useRef(paramsKey);

  useEffect(() => {
    if (prevParamsKey.current !== paramsKey) {
      prevParamsKey.current = paramsKey;
      setItems([]);
      setPage(1);
      setTotalPages(1);
    }
  }, [paramsKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    client.get(endpoint, { params: { ...params, page, limit: 20 } })
      .then(res => {
        if (cancelled) return;
        const { data, pagination } = res.data;
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
  }, [paramsKey, page]);

  const loadMore = useCallback(() => {
    if (!loading && page < totalPages) setPage(p => p + 1);
  }, [loading, page, totalPages]);

  const hasMore = page < totalPages;

  return { items, loading, error, loadMore, hasMore };
}
