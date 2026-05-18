import { useState, useEffect, useRef } from 'react';
import client from '../../api/client';

export default function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch suggestions whenever input changes (including empty — shows popular tags).
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await client.get('/tags/suggestions', { params: { q: input } });
        // Filter out tags already added.
        setSuggestions((res.data.data || []).filter(t => !value.includes(t)));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [input, value]);

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const removeTag = (tag) => onChange(value.filter(t => t !== tag));

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        addTag(suggestions[activeIndex]);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length) {
      removeTag(value[value.length - 1]);
    } else if (e.key === 'ArrowDown') {
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div
        className="min-h-[48px] bg-surface border border-border rounded-lg px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:border-white/40"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 bg-white/10 text-white text-xs px-2 py-1 rounded-full">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-white/50 hover:text-white leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); setActiveIndex(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={onKeyDown}
          placeholder={value.length ? '' : 'Add tags…'}
          className="flex-1 min-w-24 bg-transparent text-white text-sm placeholder-white/30 outline-none"
        />
      </div>
      <p className="text-white/30 text-xs mt-1">Press Enter or comma to add. Tags are invisible to visitors.</p>

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg overflow-hidden z-40 shadow-xl max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => addTag(s)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === activeIndex ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
