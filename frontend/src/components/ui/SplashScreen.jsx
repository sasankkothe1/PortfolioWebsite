import { useState, useEffect } from 'react';
import logo from '../../assets/LogoLightTransparent.png';

export default function SplashScreen({ onDone }) {
  const [filling, setFilling] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Small delay so the browser has painted before the animation starts.
    const t1 = setTimeout(() => setFilling(true), 50);
    // Start fading after the fill completes.
    const t2 = setTimeout(() => setFading(true), 1800);
    // Unmount after fade finishes.
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center transition-opacity duration-700 ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="relative w-48 h-48 sm:w-56 sm:h-56">
        {/* Faint outline — the "unfilled" state */}
        <img
          src={logo}
          alt=""
          className="absolute inset-0 w-full h-full object-contain opacity-20"
          draggable={false}
        />
        {/* Full logo revealed bottom-to-top — the "filling" state */}
        <img
          src={logo}
          alt="Portfolio"
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            clipPath: filling ? 'inset(0% 0 0% 0)' : 'inset(100% 0 0% 0)',
            transition: 'clip-path 1500ms ease-in-out',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
}
