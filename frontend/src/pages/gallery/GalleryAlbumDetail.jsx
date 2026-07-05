import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGallery } from '../../contexts/GalleryContext';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Upload, Trash2, Edit, Image as ImageIcon } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';

function GalleryAlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchAlbumById, deletePhoto } = useGallery();
  const { toast } = useToast();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    loadAlbum();
  }, [id]);

  const loadAlbum = async () => {
    setLoading(true);
    const data = await fetchAlbumById(id);
    if (data) {
      setAlbum(data);
    }
    setLoading(false);
  };

  const handleDeletePhoto = async (photoId) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await deletePhoto(photoId);
        toast.success('Photo deleted successfully');
        loadAlbum();
      } catch (error) {
        toast.error(error.message || 'Failed to delete photo');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-[var(--color-textSecondary)]">Loading album...</div>;
  }

  if (!album) {
    return <div className="text-center py-12 text-[var(--color-textSecondary)]">Album not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard/gallery')}
            className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{album.title}</h1>
            <p className="text-[var(--color-textSecondary)]">{album.description || 'No description'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/dashboard/gallery/albums/${id}/upload`)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 shadow-md"
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Photos
        </button>
      </div>

      {/* Photos Grid */}
      {album.photos && album.photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {album.photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group bg-[var(--color-surface)] rounded-xl shadow-md overflow-hidden aspect-square"
            >
              <img
                src={photo.thumbnail_url || photo.file_url}
                alt={photo.title || 'Photo'}
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform"
                loading="lazy"
                onClick={() => setSelectedPhoto(photo)}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="p-2 bg-[var(--color-surface)] rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {photo.is_featured && (
                <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                  Featured
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="p-8 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl border border-pink-200 max-w-md mx-auto">
            <ImageIcon className="h-16 w-16 text-pink-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">No photos yet</h3>
            <p className="text-[var(--color-textSecondary)] mb-4">Upload your first photo to this album</p>
            <button
              onClick={() => navigate(`/dashboard/gallery/albums/${id}/upload`)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600"
            >
              Upload Photo
            </button>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            <img
              src={selectedPhoto.file_url}
              alt={selectedPhoto.title || 'Photo'}
              className="max-w-full max-h-screen object-contain"
              loading="lazy"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-[var(--color-surface)] rounded-full text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            >
              ✕
            </button>
            {selectedPhoto.title && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded-lg">
                <h3 className="font-semibold">{selectedPhoto.title}</h3>
                {selectedPhoto.description && (
                  <p className="text-sm text-[var(--color-textSecondary)] mt-1">{selectedPhoto.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryAlbumDetail;
