import MasonryGrid from '../../components/media/MasonryGrid';
import Spinner from '../../components/ui/Spinner';
import InfiniteScrollSentinel from '../../components/ui/InfiniteScrollSentinel';
import { useInfiniteMedia } from '../../hooks/useInfiniteMedia';

export default function HomePage() {
  const { items, loading, error, loadMore, hasMore } = useInfiniteMedia();

  return (
    <div className="pt-6">
      <MasonryGrid items={items} />
      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="text-red-400 text-sm text-center py-4">{error}</p>
      )}
      <InfiniteScrollSentinel onIntersect={loadMore} hasMore={hasMore} />
    </div>
  );
}
