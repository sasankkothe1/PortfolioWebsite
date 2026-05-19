import Masonry from 'react-masonry-css';
import MediaCard from './MediaCard';

const BREAKPOINTS = { default: 2 };

export default function MasonryGrid({ items }) {
  if (!items.length) {
    return (
      <div className="flex items-center justify-center py-20 text-white/30 text-sm">
        No photos yet.
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={BREAKPOINTS}
      className="masonry-grid"
      columnClassName="masonry-column"
    >
      {items.map(item => (
        <MediaCard key={item.id} media={item} />
      ))}
    </Masonry>
  );
}
