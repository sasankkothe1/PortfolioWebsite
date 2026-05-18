import { useState, useEffect } from 'react';
import client from '../../api/client';
import TagInput from './TagInput';
import Spinner from '../ui/Spinner';

export default function EditModal({ item, onClose, onSaved }) {
  const [title, setTitle] = useState(item.title || '');
  const [categoryId, setCategoryId] = useState(item.category_id ? String(item.category_id) : '');
  const [tags, setTags] = useState(item.tags || []);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/categories').then(res => setCategories(res.data.data || []));
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = item.type === 'carousel'
        ? `/carousels/${item.carousel_id ?? item.id}`
        : `/media/${item.id}`;
      await client.patch(endpoint, {
        title: title || null,
        category_id: categoryId || null,
        tags,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-light tracking-widest text-sm uppercase">
            Edit {item.type === 'carousel' ? 'Carousel' : item.type === 'video' ? 'Video' : 'Photo'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-sm">✕</button>
        </div>

        {/* Thumbnail preview */}
        <img
          src={item.thumbnail_url || item.url}
          alt=""
          className="w-full h-32 object-cover rounded-lg mb-5 opacity-70"
        />

        <form onSubmit={save} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-background border border-border rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40 text-sm"
          />

          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="bg-background border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/40 text-sm"
          >
            <option value="">No category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <TagInput value={tags} onChange={setTags} />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-white/50 rounded-lg py-2.5 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-white text-black rounded-lg py-2.5 text-sm font-medium hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner size="sm" /> Saving…</> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
