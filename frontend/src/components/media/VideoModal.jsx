import { useRef, useEffect } from 'react';

export default function VideoModal({ media, onClose }) {
  const videoRef = useRef(null);

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
        className="relative w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2">
          {media.title && (
            <span className="text-white/70 text-sm">{media.title}</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-white/70 hover:text-white text-xs border border-white/20 px-2 py-1 rounded"
            >
              Fullscreen
            </button>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-xs border border-white/20 px-2 py-1 rounded"
            >
              ✕ Close
            </button>
          </div>
        </div>
        <video
          ref={videoRef}
          src={media.url}
          controls
          autoPlay
          className="w-full rounded-lg max-h-[80vh]"
        />
      </div>
    </div>
  );
}
