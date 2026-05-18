import SearchBar from '../search/SearchBar';

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
  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-14 bg-background/90 backdrop-blur border-b border-border flex items-center px-4 gap-4">
      <button
        onClick={onToggleSidebar}
        className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        <HamburgerIcon open={sidebarOpen} />
      </button>
      <span className="text-white font-light tracking-widest text-sm uppercase select-none flex-1">
        Portfolio
      </span>
      <SearchBar />
    </header>
  );
}
