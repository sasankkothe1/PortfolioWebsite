import { useState } from 'react';
import ContentModal from './ContentModal';

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-lg">
      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
      <polygon points="10,8 18,12 10,16" fill="white" />
    </svg>
  );
}

function CarouselIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow">
      <rect x="2" y="5" width="13" height="14" rx="1.5" fill="rgba(0,0,0,0.4)" stroke="white" strokeWidth="1.5"/>
      <rect x="6" y="3" width="13" height="14" rx="1.5" fill="rgba(0,0,0,0.4)" stroke="white" strokeWidth="1.5"/>
      <rect x="9" y="7" width="13" height="14" rx="1.5" fill="rgba(0,0,0,0.6)" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

export default function MediaCard({ media }) {
  const [open, setOpen] = useState(false);
  const isVideo    = media.type === 'video';
  const isCarousel = media.type === 'carousel';

  return (
    <>
      <div
        className="relative group cursor-pointer overflow-hidden rounded-sm bg-surface"
        onClick={() => setOpen(true)}
      >
        <img
          src={media.thumbnail_url || media.url}
          alt={media.title || ''}
          className="w-full block transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
            <PlayIcon />
          </div>
        )}

        {isCarousel && (
          <div className="absolute top-2 right-2 opacity-90">
            <CarouselIcon />
          </div>
        )}

        {media.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">{media.title}</p>
          </div>
        )}
      </div>

      {open && <ContentModal media={media} onClose={() => setOpen(false)} />}
    </>
  );
}
