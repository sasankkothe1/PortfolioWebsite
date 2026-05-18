import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 3) { setSuggestions([]); return; }
    try {
      const res = await client.get('/tags/suggestions', { params: { q } });
      setSuggestions(res.data.data || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, fetchSuggestions]);

  const submit = (value) => {
    const q = (value || query).trim();
    if (!q) return;
    setQuery(q);
    setShowSuggestions(false);
    setSuggestions([]);
    navigate(`/search?tag=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setActiveSuggestion(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeSuggestion >= 0) {
        submit(suggestions[activeSuggestion]);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setShowSuggestions(true); setActiveSuggestion(-1); }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => suggestions.length && setShowSuggestions(true)}
        placeholder="Search..."
        className="w-full bg-surface border border-border rounded-full px-4 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg overflow-hidden z-40 shadow-xl">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`px-4 py-2 text-sm cursor-pointer ${i === activeSuggestion ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'}`}
              onMouseDown={() => submit(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
