import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useInfiniteMedia } from '../hooks/useInfiniteMedia';

const mockGet = vi.fn();

vi.mock('../api/client', () => ({
  default: { get: (...args) => mockGet(...args) },
  API_BASE: '/api',
}));

// Suppress EventSource (SSE) in tests.
global.EventSource = class {
  constructor() { this.close = vi.fn(); }
  addEventListener() {}
};

const makePage = (items, page = 1, totalPages = 1) => ({
  data: { data: items, pagination: { page, limit: 20, total: items.length, totalPages } },
});

const item = id => ({ id, type: 'image', url: 'https://x.com/a.jpg', thumbnail_url: null, title: null, tags: [] });

describe('useInfiniteMedia', () => {
  beforeEach(() => { mockGet.mockReset(); });

  it('fetches page 1 on mount', async () => {
    mockGet.mockResolvedValue(makePage([item(1), item(2)]));
    const { result } = renderHook(() => useInfiniteMedia());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(2);
    expect(mockGet).toHaveBeenCalledWith('/media/feed', expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }));
  });

  it('appends items when loadMore called (infinite scroll)', async () => {
    mockGet
      .mockResolvedValueOnce(makePage([item(1), item(2)], 1, 2))
      .mockResolvedValueOnce(makePage([item(3), item(4)], 2, 2));

    const { result } = renderHook(() => useInfiniteMedia());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(result.current.items.map(i => i.id)).toEqual([1, 2, 3, 4]);
  });

  it('hasMore is false when on last page', async () => {
    mockGet.mockResolvedValue(makePage([item(1)], 1, 1));
    const { result } = renderHook(() => useInfiniteMedia());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it('resets to page 1 when params change (e.g. category switch)', async () => {
    mockGet.mockResolvedValue(makePage([item(1), item(2)], 1, 2));

    const { result, rerender } = renderHook(
      ({ params }) => useInfiniteMedia(params),
      { initialProps: { params: { category: 'travel' } } }
    );
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    mockGet.mockResolvedValue(makePage([item(10), item(11)], 1, 1));
    rerender({ params: { category: 'portraits' } });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe(10);
    });
    expect(result.current.items).toHaveLength(2);
  });

  it('shows error state when API call fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useInfiniteMedia());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toHaveLength(0);
  });
});
