import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGallery } from '../../contexts/GalleryContext';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';

function GalleryPhotoUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createPhoto } = useGallery();
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_featured: false
  });

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles([...files, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // For now, we'll create a mock URL. In production, this would upload to a server
        const fileUrl = URL.createObjectURL(file);
        const thumbnailUrl = fileUrl; // In production, generate thumbnail

        await createPhoto({
          album_id: parseInt(id),
          title: formData.title || file.name,
          description: formData.description,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          file_size: file.size,
          file_type: file.type,
          is_featured: formData.is_featured
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error uploading file:', error);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} photo(s) uploaded successfully`);
      navigate(`/dashboard/gallery/albums/${id}`);
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} photo(s) failed to upload`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(`/dashboard/gallery/albums/${id}`)}
          className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Upload Photos</h1>
          <p className="text-[var(--color-textSecondary)]">Add photos to your album</p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-xl shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Select Photos</label>
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center hover:border-pink-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-12 w-12 text-[var(--color-textSecondary)] mb-3" />
                <p className="text-[var(--color-textSecondary)] mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-[var(--color-textSecondary)]">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>
          </div>

          {/* Selected Files Preview */}
          {files.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Selected Files ({files.length})</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {files.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1 truncate">{file.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Photo title (optional)"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
              />
              <label htmlFor="featured" className="text-sm text-[var(--color-text)]">Mark as featured</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              rows="3"
              placeholder="Photo description (optional)"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/gallery/albums/${id}`)}
              className="px-4 py-2 text-[var(--color-text)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Photo${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GalleryPhotoUpload;
