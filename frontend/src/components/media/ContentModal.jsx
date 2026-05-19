import { useState, useEffect, useRef, useCallback } from 'react';
import client from '../../api/client';
import Spinner from '../ui/Spinner';

function ArrowButton({ direction, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction}
      className="absolute top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 disabled:opacity-20 text-white w-10 h-10 rounded-full flex items-center justify-center text-2xl transition-colors select-none"
      style={{ [direction === 'left' ? 'left' : 'right']: '12px' }}
    >
      {direction === 'left' ? '‹' : '›'}
    </button>
  );
}

export default function ContentModal({ media, onClose }) {
  const [content, setContent] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const videoRef = useRef(null);

  // Fetch full content from backend on mount.
  useEffect(() => {
    const endpoint = media.type === 'carousel'
      ? `/carousels/${media.carousel_id ?? media.id}`
      : `/media/${media.id}`;

    client.get(endpoint)
      .then(res => setContent(res.data.data))
      .catch(onClose);
  }, [media.id]);

  const prev = useCallback(() => setCarouselIndex(i => Math.max(i - 1, 0)), []);
  const next = useCallback(() => {
    if (!content?.images) return;
    setCarouselIndex(i => Math.min(i + 1, content.images.length - 1));
  }, [content]);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape')      onClose();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  const renderContent = () => {
    if (!content) {
      // Show cover thumbnail immediately while the request is in flight.
      return (
        <div className="relative flex items-center justify-center min-h-[60vh]">
          <img
            src={media.thumbnail_url || media.url}
            alt=""
            className="max-h-[75vh] max-w-full object-contain rounded-lg opacity-40"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </div>
      );
    }

    if (content.type === 'image') {
      return (
        <img
          src={content.url}
          alt={content.title || ''}
          className="max-h-[80vh] max-w-full object-contain rounded-lg"
        />
      );
    }

    if (content.type === 'video') {
      return (
        <div className="w-full max-w-4xl">
          <div className="flex justify-end mb-2">
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white/50 hover:text-white text-xs border border-white/20 px-2 py-1 rounded"
            >
              Fullscreen
            </button>
          </div>
          <video
            ref={videoRef}
            src={content.url}
            controls
            autoPlay
            className="w-full rounded-lg max-h-[75vh]"
          />
        </div>
      );
    }

    if (content.type === 'carousel') {
      const images = content.images || [];
      return (
        <div className="w-full max-w-4xl flex flex-col items-center gap-4">
          <div className="relative w-full flex items-center justify-center">
            <ArrowButton direction="left"  onClick={prev} disabled={carouselIndex === 0} />
            <img
              key={images[carouselIndex]?.id}
              src={images[carouselIndex]?.url}
              alt=""
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />
            <ArrowButton direction="right" onClick={next} disabled={carouselIndex === images.length - 1} />
          </div>
          {images.length > 1 && (
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCarouselIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === carouselIndex ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  const title = content?.title || media.title || '';
  const counter = content?.type === 'carousel' && content.images?.length > 1
    ? ` · ${carouselIndex + 1} / ${content.images.length}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col items-center gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full max-w-4xl">
          <span className="text-white/40 text-sm truncate">
            {title}{counter}
          </span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-sm ml-4 shrink-0"
          >
            ✕ Close
          </button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
