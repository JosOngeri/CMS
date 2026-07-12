import { useState, useEffect } from 'react';
import { useGallery } from '../../contexts/GalleryContext';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Image as ImageIcon, Edit, Trash2, MoreVertical } from 'lucide-react';

function GalleryAlbums() {
  const { albums, loading, error, fetchAlbums, createAlbum, deleteAlbum, fetchPhotos, photos } = useGallery();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumDescription, setNewAlbumDescription] = useState('');
  const [view, setView] = useState('albums'); // 'albums' or 'photos'

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleViewPhotos = async () => {
    setView('photos');
    await fetchPhotos(); // Fetch all photos without album filter
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 ">Error: {error}</p>
        <button onClick={fetchAlbums} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
          Retry
        </button>
      </div>
    );
  }

  const handleCreateAlbum = async (e) => {
    e.preventDefault();
    try {
      await createAlbum({
        title: newAlbumTitle,
        description: newAlbumDescription
      });
      toast.success('Album created successfully');
      setShowCreateModal(false);
      setNewAlbumTitle('');
      setNewAlbumDescription('');
    } catch (error) {
      toast.error(error.message || 'Failed to create album');
    }
  };

  const handleDeleteAlbum = async (id) => {
    if (window.confirm('Are you sure you want to delete this album? All photos in it will also be deleted.')) {
      try {
        await deleteAlbum(id);
        toast.success('Album deleted successfully');
      } catch (error) {
        toast.error(error.message || 'Failed to delete album');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] ">Photo Gallery</h1>
          <p className="text-[var(--color-textSecondary)] ">Manage your photo albums</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setView('albums')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'albums'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                : 'bg-[var(--color-surface)]  text-[var(--color-text)]  hover:bg-[var(--color-surface)] '
            }`}
          >
            Albums
          </button>
          <button
            onClick={handleViewPhotos}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'photos'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
                : 'bg-[var(--color-surface)]  text-[var(--color-text)]  hover:bg-[var(--color-surface)] '
            }`}
          >
            All Photos
          </button>
          {view === 'albums' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 shadow-md"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Album
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--color-surface)]  rounded-xl shadow-md p-6 border-t-4 border-pink-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Total Albums</p>
              <p className="text-3xl font-bold text-[var(--color-text)]  mt-1">{albums.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-pink-100 ">
              <FolderOpen className="h-6 w-6 text-pink-600 " />
            </div>
          </div>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-xl shadow-md p-6 border-t-4 border-purple-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Total Photos</p>
              <p className="text-3xl font-bold text-[var(--color-text)]  mt-1">
                {albums.reduce((sum, album) => sum + (album.photo_count || 0), 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-purple-100 ">
              <ImageIcon className="h-6 w-6 text-purple-600 " />
            </div>
          </div>
        </div>
        <div className="bg-[var(--color-surface)]  rounded-xl shadow-md p-6 border-t-4 border-amber-500 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)] ">Storage Used</p>
              <p className="text-3xl font-bold text-[var(--color-text)]  mt-1">--</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-100 ">
              <ImageIcon className="h-6 w-6 text-amber-600 " />
            </div>
          </div>
        </div>
      </div>

      {/* Albums Grid */}
      {view === 'albums' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-[var(--color-textSecondary)] ">Loading albums...</div>
          ) : albums.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-8 bg-gradient-to-br from-pink-50  to-rose-50  rounded-2xl border border-pink-200  max-w-md mx-auto">
                <FolderOpen className="h-16 w-16 text-pink-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-2">No albums yet</h3>
                <p className="text-[var(--color-textSecondary)]  mb-4">Create your first photo album to get started</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600"
                >
                  Create Album
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => navigate(`/dashboard/gallery/albums/${album.id}`)}
                  className="bg-[var(--color-surface)]  rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                >
                  <div className="h-40 bg-gradient-to-br from-pink-100 via-purple-100 to-[var(--color-primary)]-100 flex items-center justify-center">
                    {album.cover_photo_id ? (
                      <img
                        src="/placeholder.jpg"
                        alt={album.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-16 w-16 text-pink-300  group-hover:scale-110 transition-transform" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-text)]  mb-1">{album.title}</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]  mb-3 line-clamp-2">{album.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-textSecondary)]">
                        {album.photo_count || 0} photos
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/gallery/albums/${album.id}/edit`);
                          }}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-primary hover:bg-[var(--color-primary)]-50 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.id);
                          }}
                          className="p-2 text-[var(--color-textSecondary)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* All Photos Grid */}
      {view === 'photos' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-[var(--color-textSecondary)] ">Loading photos...</div>
          ) : photos.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-8 bg-gradient-to-br from-pink-50  to-rose-50  rounded-2xl border border-pink-200  max-w-md mx-auto">
                <ImageIcon className="h-16 w-16 text-pink-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-2">No photos yet</h3>
                <p className="text-[var(--color-textSecondary)]  mb-4">Upload photos or sync from Telegram to get started</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => navigate('/dashboard/gallery/albums/new/upload')}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600"
                  >
                    Upload Photo
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/admin/settings')}
                    className="px-4 py-2 bg-[var(--color-surface)]  text-[var(--color-text)]  rounded-lg hover:bg-[var(--color-surface)] "
                  >
                    Configure Telegram
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group bg-[var(--color-surface)]  rounded-xl shadow-md overflow-hidden aspect-square"
                >
                  <img
                    src={photo.thumbnail_url || photo.file_url}
                    alt={photo.title || 'Photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.is_featured && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      Featured
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => {
                        if (photo.album_id) {
                          navigate(`/dashboard/gallery/albums/${photo.album_id}`);
                        }
                      }}
                      className="px-4 py-2 bg-[var(--color-surface)]  rounded-lg text-[var(--color-text)]  hover:bg-[var(--color-surface)]"
                    >
                      View in Album
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)]  rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[var(--color-text)]  mb-4">Create New Album</h2>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">Album Title *</label>
                <input
                  type="text"
                  value={newAlbumTitle}
                  onChange={(e) => setNewAlbumTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-[var(--color-surface)]  text-[var(--color-text)]"
                  placeholder="My Vacation Photos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">Description</label>
                <textarea
                  value={newAlbumDescription}
                  onChange={(e) => setNewAlbumDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 bg-[var(--color-surface)]  text-[var(--color-text)]"
                  rows="3"
                  placeholder="Describe this album..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-[var(--color-text)]  hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600"
                >
                  Create Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryAlbums;
