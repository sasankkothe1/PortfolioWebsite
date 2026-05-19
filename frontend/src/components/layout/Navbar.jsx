import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../search/SearchBar';
import logo from '../../assets/LogoLightTransparent.png';

function HamburgerIcon({ open }) {
  return (
    <div className="flex flex-col gap-1.5 w-5">
      <span className={`block h-px bg-white transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`} />
      <span className={`block h-px bg-white transition-all duration-200 ${open ? 'opacity-0' : ''}`} />
      <span className={`block h-px bg-white transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`} />
    </div>
  );
}

export default function Navbar({ sidebarOpen, onToggleSidebar }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 60);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-20 h-16 bg-background/90 backdrop-blur flex items-center px-4 transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}
    >
      {/* Left: hamburger */}
      <button
        onClick={onToggleSidebar}
        className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors shrink-0"
        aria-label="Toggle menu"
      >
        <HamburgerIcon open={sidebarOpen} />
      </button>

      {/* Centre: logo — absolutely positioned so it is always pixel-perfect centred */}
      <Link
        to="/"
        className="absolute left-1/2 -translate-x-1/2"
      >
        <img
          src={logo}
          alt="Portfolio"
          className="h-11 w-auto"
          draggable={false}
        />
      </Link>

      {/* Right: search */}
      <div className="ml-auto shrink-0">
        <SearchBar />
      </div>
    </header>
  );
}
