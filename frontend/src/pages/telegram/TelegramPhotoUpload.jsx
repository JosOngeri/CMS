import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../contexts/ToastContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const TelegramPhotoUpload = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const toast = useToast();
  const { colors } = useColorPalette();

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    setIsUploading(true);
    const results = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);

      try {
        const response = await axios.post(`/api/telegram/channels/${channelId}/upload-photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [i]: progress }));
          },
        });
        results.push({ success: true, file: file.name, data: response.data });
      } catch (err) {
        results.push({ success: false, file: file.name, error: err.message });
      }
    }

    setIsUploading(false);
    setUploadProgress({});

    const successCount = results.filter(r => r.success).length;
    if (successCount === selectedFiles.length) {
      toast.success(`Successfully uploaded ${successCount} photo(s)`);
      navigate(`/telegram/channels/${channelId}/posts`);
    } else {
      toast.error(`Uploaded ${successCount}/${selectedFiles.length} photos. Some failed.`);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: colors.background }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
            Upload Photos
          </h1>
          <p className="mt-2" style={{ color: colors.textSecondary }}>
            Upload photos to your Telegram channel
          </p>
        </div>

        {/* Upload Form */}
        <div className="p-6 rounded-lg shadow-sm" style={{ backgroundColor: colors.surface }}>
          <div className="space-y-6">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Select Photos
              </label>
              <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: colors.border }}>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="photo-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`cursor-pointer flex flex-col items-center ${isUploading ? 'opacity-50' : ''}`}
                >
                  <Upload className="h-12 w-12 mb-3" style={{ color: colors.primary }} />
                  <span className="text-lg font-medium" style={{ color: colors.text }}>
                    Click to upload photos
                  </span>
                  <span className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                    or drag and drop
                  </span>
                  <span className="text-xs mt-2" style={{ color: colors.textSecondary }}>
                    PNG, JPG, GIF up to 50MB
                  </span>
                </label>
              </div>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Selected Photos ({selectedFiles.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group"
                      style={{ backgroundColor: colors.background }}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {isUploading && uploadProgress[index] !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
                          <div className="h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-primary)]-500 transition-all"
                              style={{ width: `${uploadProgress[index]}%` }}
                            />
                          </div>
                          <span className="text-xs text-white">{uploadProgress[index]}%</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs truncate" style={{ color: colors.text }}>
                          {file.name}
                        </p>
                        <p className="text-xs" style={{ color: colors.textSecondary }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                Caption (optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                disabled={isUploading}
                className="w-full px-4 py-3 rounded-lg resize-none"
                style={{
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
                placeholder="Add a caption for your photos..."
              />
            </div>

            {/* Upload Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={isUploading}
                className="flex-1 py-3 rounded-lg font-medium"
                style={{ backgroundColor: colors.background, color: colors.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="flex-1 py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{
                  backgroundColor: colors.primary,
                  opacity: (isUploading || selectedFiles.length === 0) ? 0.7 : 1,
                  cursor: (isUploading || selectedFiles.length === 0) ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" />
                    Upload Photos
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramPhotoUpload;