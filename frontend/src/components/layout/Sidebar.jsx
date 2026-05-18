import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import client from '../../api/client';

export default function Sidebar({ open, onClose }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client.get('/categories').then(res => setCategories(res.data.data || []));
  }, []);

  const linkClass = ({ isActive }) =>
    `block px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-surface border-r border-border z-40 flex flex-col py-16 px-4 gap-1 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavLink to="/" className={linkClass} onClick={onClose} end>
          Home
        </NavLink>
        <div className="my-2 border-t border-border" />
        {categories.map(cat => (
          <NavLink
            key={cat.id}
            to={`/c/${cat.slug}`}
            className={linkClass}
            onClick={onClose}
          >
            {cat.name}
          </NavLink>
        ))}
      </aside>
    </>
  );
}
