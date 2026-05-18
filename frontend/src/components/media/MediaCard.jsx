import { useState } from 'react';
import VideoModal from './VideoModal';
import ImageModal from './ImageModal';

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10 drop-shadow-lg">
      <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
      <polygon points="10,8 18,12 10,16" fill="white" />
    </svg>
  );
}

export default function MediaCard({ media }) {
  const [open, setOpen] = useState(false);
  const isVideo = media.type === 'video';
  const src = isVideo ? media.thumbnail_url : media.url;

  return (
    <>
      <div
        className="relative group cursor-pointer overflow-hidden rounded-sm bg-surface"
        onClick={() => setOpen(true)}
      >
        <img
          src={src}
          alt={media.title || ''}
          className="w-full block transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
            <PlayIcon />
          </div>
        )}
        {media.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">{media.title}</p>
          </div>
        )}
      </div>

      {open && isVideo && <VideoModal media={media} onClose={() => setOpen(false)} />}
      {open && !isVideo && <ImageModal media={media} onClose={() => setOpen(false)} />}
    </>
  );
}
