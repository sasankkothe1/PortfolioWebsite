import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import client from '../../api/client';
import Spinner from '../../components/ui/Spinner';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 8,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
  onProgress: () => {},
};

async function maybeCompress(file) {
  if (file.type.startsWith('image/') && file.size > 8 * 1024 * 1024) {
    return imageCompression(file, COMPRESSION_OPTIONS);
  }
  return file;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('single'); // 'single' | 'carousel'

  // single upload state
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  // carousel state
  const [carouselFiles, setCarouselFiles] = useState([]); // [{ file, previewUrl }]
  const [coverIndex, setCoverIndex] = useState(0);

  // shared state
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    client.get('/categories').then(res => setCategories(res.data.data || []));
  }, []);

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setCarouselFiles([]);
    setCoverIndex(0);
    setTitle('');
    setTags('');
    setCategoryId('');
    setProgress(0);
    setError('');
  };

  const selectSingleFile = async (f) => {
    if (!f) return;
    setSuccess(false);
    setError('');
    setCompressing(true);
    try {
      const processed = await maybeCompress(f);
      setFile(processed);
      setPreview(URL.createObjectURL(processed));
    } finally {
      setCompressing(false);
    }
  };

  const selectCarouselFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setSuccess(false);
    setError('');
    setCompressing(true);
    try {
      const processed = await Promise.all(
        Array.from(fileList).map(async f => {
          const compressed = await maybeCompress(f);
          return { file: compressed, previewUrl: URL.createObjectURL(compressed) };
        })
      );
      setCarouselFiles(prev => [...prev, ...processed]);
    } finally {
      setCompressing(false);
    }
  };

  const removeCarouselFile = (index) => {
    setCarouselFiles(prev => {
      const next = prev.filter((_, i) => i !== index);
      setCoverIndex(ci => Math.min(ci, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (mode === 'single') {
      selectSingleFile(e.dataTransfer.files[0]);
    } else {
      selectCarouselFiles(e.dataTransfer.files);
    }
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

  const submitSingle = async () => {
    if (!file) { setError('Please select a file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    if (title) fd.append('title', title);
    if (categoryId) fd.append('category_id', categoryId);
    if (tags) fd.append('tags', tags);

    await client.post('/media', fd, {
      onUploadProgress: e => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
    });
  };

  const submitCarousel = async () => {
    if (carouselFiles.length < 2) { setError('Add at least 2 images for a carousel'); return; }
    const fd = new FormData();
    carouselFiles.forEach(({ file: f }) => fd.append('files', f));
    if (title) fd.append('title', title);
    if (categoryId) fd.append('category_id', categoryId);
    if (tags) fd.append('tags', tags);
    fd.append('cover_index', coverIndex);

    await client.post('/carousels', fd, {
      onUploadProgress: e => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setUploading(true);
    setProgress(0);
    try {
      if (mode === 'single') await submitSingle();
      else await submitCarousel();
      setSuccess(true);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const canSubmit = mode === 'single' ? !!file : carouselFiles.length >= 2;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/admin/dashboard')} className="text-white/40 hover:text-white text-sm">← Back</button>
          <h1 className="text-white text-lg font-light tracking-widest uppercase">Upload</h1>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-surface border border-border rounded-lg p-1 mb-6">
          {['single', 'carousel'].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); resetForm(); setSuccess(false); }}
              className={`flex-1 py-2 text-sm rounded-md transition-colors capitalize ${mode === m ? 'bg-white text-black' : 'text-white/50 hover:text-white'}`}
            >
              {m === 'single' ? 'Single File' : 'Carousel'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">

          {/* Drop zone */}
          {mode === 'single' ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-white/40 bg-white/5' : 'border-border hover:border-white/20'}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              {compressing ? (
                <div className="flex flex-col items-center gap-2 text-white/40 text-sm"><Spinner /><span>Compressing…</span></div>
              ) : preview ? (
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
              <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => selectSingleFile(e.target.files[0])} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-white/40 bg-white/5' : 'border-border hover:border-white/20'}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                {compressing ? (
                  <div className="flex flex-col items-center gap-2 text-white/40 text-sm"><Spinner /><span>Compressing…</span></div>
                ) : (
                  <div className="text-white/30">
                    <p className="text-sm mb-1">Drop images here or click to browse</p>
                    <p className="text-xs">Select multiple — minimum 2 for a carousel</p>
                  </div>
                )}
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => selectCarouselFiles(e.target.files)} />
              </div>

              {carouselFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {carouselFiles.map(({ previewUrl }, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={previewUrl}
                        alt=""
                        className={`w-full aspect-square object-cover rounded-lg transition-all ${coverIndex === i ? 'ring-2 ring-white' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeCarouselFile(i)}
                        className="absolute top-1 right-1 bg-black/70 text-white text-xs w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        ✕
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverIndex(i)}
                        className={`absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                          coverIndex === i
                            ? 'bg-white text-black font-medium'
                            : 'bg-black/60 text-white/70 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {coverIndex === i ? '★ Cover' : '☆ Cover'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {carouselFiles.length > 0 && (
                <p className="text-white/30 text-xs">{carouselFiles.length} image{carouselFiles.length !== 1 ? 's' : ''} selected. Drag more to add.</p>
              )}
            </div>
          )}

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
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {!showNewCat ? (
              <button type="button" onClick={() => setShowNewCat(true)} className="text-xs text-white/40 hover:text-white/70 text-left">+ Add new category</button>
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
                <button type="button" onClick={addCategory} className="text-sm text-white bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20">Add</button>
                <button type="button" onClick={() => setShowNewCat(false)} className="text-sm text-white/40 hover:text-white">✕</button>
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
              <div className="h-full bg-white transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">Uploaded successfully!</p>}

          <button
            type="submit"
            disabled={uploading || !canSubmit}
            className="bg-white text-black rounded-lg py-3 text-sm font-medium hover:bg-white/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? <><Spinner size="sm" />{progress}%</> : mode === 'carousel' ? `Upload Carousel (${carouselFiles.length} images)` : 'Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}
