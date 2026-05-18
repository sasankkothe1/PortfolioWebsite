import Masonry from 'react-masonry-css';
import MediaCard from './MediaCard';

const BREAKPOINTS = { default: 4, 1280: 4, 1024: 3, 768: 2, 480: 1 };

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
