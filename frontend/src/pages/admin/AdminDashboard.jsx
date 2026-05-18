import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import EditModal from '../../components/admin/EditModal';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleting, setDeleting] = useState(null);
  const [editing, setEditing] = useState(null);

  const fetchMedia = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await client.get('/media/feed', { params: { page: p, limit: 20 } });
      setItems(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(1); }, [fetchMedia]);

  const handleDelete = async (item) => {
    const label = item.type === 'carousel' ? 'carousel and all its images' : 'this item';
    if (!confirm(`Delete ${label}?`)) return;
    const key = item.type === 'carousel' ? item.carousel_id : item.id;
    setDeleting(key);
    try {
      if (item.type === 'carousel') {
        await client.delete(`/carousels/${item.carousel_id}`);
      } else {
        await client.delete(`/media/${item.id}`);
      }
      setItems(prev => prev.filter(i =>
        item.type === 'carousel' ? i.carousel_id !== item.carousel_id : i.id !== item.id
      ));
    } catch {
      alert('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-white text-lg font-light tracking-widest uppercase">Dashboard</h1>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/upload')}
              className="bg-white text-black text-sm px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
            >
              + Upload
            </button>
            <button
              onClick={handleLogout}
              className="text-white/50 text-sm px-4 py-2 border border-border rounded-lg hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map(item => {
                const key = item.type === 'carousel' ? `carousel-${item.carousel_id}` : `media-${item.id}`;
                const deleteKey = item.type === 'carousel' ? item.carousel_id : item.id;
                return (
                  <div key={key} className="relative group bg-surface rounded-lg overflow-hidden">
                    <img
                      src={item.thumbnail_url || item.url}
                      alt={item.title || ''}
                      className="w-full aspect-square object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      {item.type === 'video' && (
                        <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">Video</span>
                      )}
                      {item.type === 'carousel' && (
                        <span className="bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">Carousel</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setEditing(item)}
                        className="bg-white/20 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/30"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleting === deleteKey}
                        className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting === deleteKey ? '…' : 'Delete'}
                      </button>
                    </div>
                    {item.title && (
                      <div className="px-2 py-1.5 border-t border-border">
                        <p className="text-white/60 text-xs truncate">{item.title}</p>
                      </div>
                    )}
                    {item.category_name && (
                      <div className="px-2 pb-1.5">
                        <span className="text-white/30 text-xs">{item.category_name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-8">
                <button onClick={() => fetchMedia(page - 1)} disabled={page <= 1} className="text-sm text-white/50 disabled:opacity-30 hover:text-white">← Prev</button>
                <span className="text-white/30 text-sm">{page} / {totalPages}</span>
                <button onClick={() => fetchMedia(page + 1)} disabled={page >= totalPages} className="text-sm text-white/50 disabled:opacity-30 hover:text-white">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => fetchMedia(page)}
        />
      )}
    </div>
  );
}
