import { useEffect } from 'react';

export default function ImageModal({ media, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-white/70 hover:text-white text-sm"
        >
          ✕ Close
        </button>
        <img
          src={media.url}
          alt={media.title || ''}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        {media.title && (
          <p className="text-white/50 text-sm mt-2 text-center">{media.title}</p>
        )}
      </div>
    </div>
  );
}
