import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import Spinner from '../../components/ui/Spinner';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    client.get('/categories').then(res => setCategories(res.data.data || []));
  }, []);

  const selectFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setSuccess(false);
    setError('');
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await client.post('/categories', { name: newCatName.trim() });
      const cat = res.data.data;
      setCategories(prev => [...prev, cat]);
      setCategoryId(String(cat.id));
      setNewCatName('');
      setShowNewCat(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create category');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setError('');
    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    if (categoryId) fd.append('category_id', categoryId);
    if (tags) fd.append('tags', tags);

    try {
      await client.post('/media', fd, {
        onUploadProgress: e => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setSuccess(true);
      setFile(null);
      setPreview(null);
      setTitle('');
      setTags('');
      setCategoryId('');
      setProgress(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-white/40 hover:text-white text-sm">
            ← Back
          </button>
          <h1 className="text-white text-lg font-light tracking-widest uppercase">Upload</h1>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-white/40 bg-white/5' : 'border-border hover:border-white/20'}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            {preview ? (
              file?.type.startsWith('video/') ? (
                <video src={preview} className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
              )
            ) : (
              <div className="text-white/30">
                <p className="text-sm mb-1">Drop photo or video here</p>
                <p className="text-xs">or click to browse</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => selectFile(e.target.files[0])}
            />
          </div>

          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40 text-sm"
          />

          <div className="flex flex-col gap-2">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-white outline-none focus:border-white/40 text-sm"
            >
              <option value="">No category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!showNewCat ? (
              <button
                type="button"
                onClick={() => setShowNewCat(true)}
                className="text-xs text-white/40 hover:text-white/70 text-left"
              >
                + Add new category
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-white placeholder-white/30 outline-none text-sm"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                />
                <button type="button" onClick={addCategory} className="text-sm text-white bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20">
                  Add
                </button>
                <button type="button" onClick={() => setShowNewCat(false)} className="text-sm text-white/40 hover:text-white">
                  ✕
                </button>
              </div>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Tags (comma separated: paris, sunset, travel)"
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40 text-sm"
            />
            <p className="text-white/30 text-xs mt-1">Tags are invisible to visitors but power the search.</p>
          </div>

          {uploading && (
            <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Uploaded successfully!</p>}

          <button
            type="submit"
            disabled={uploading || !file}
            className="bg-white text-black rounded-lg py-3 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? <><Spinner size="sm" />{progress}%</> : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}
