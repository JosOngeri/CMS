import { useState, useCallback } from 'react';
import { Upload, FileText, X, Check, AlertCircle, FolderOpen, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const DocumentUpload = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [metadata, setMetadata] = useState({
    category: '',
    tags: '',
    description: ''
  });

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 50MB limit`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('category', metadata.category);
    formData.append('tags', metadata.tags);
    formData.append('description', metadata.description);

    try {
      const response = await api.post('/documents/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress({ percent: percentCompleted });
        }
      });

      if (response.data.success) {
        toast.success('Documents uploaded successfully');
        setFiles([]);
        setMetadata({ category: '', tags: '', description: '' });
        setUploadProgress({});
      }
    } catch (error) {
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Upload Documents</h2>

      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-[var(--color-primary)]-500 bg-[var(--color-primary)]-50' : 'border-[var(--color-border)]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)]" />
        <p className="text-lg font-medium mb-2">Drag and drop files here</p>
        <p className="text-sm text-[var(--color-textSecondary)] mb-4">or</p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 cursor-pointer">
          <FolderOpen size={20} />
          Browse Files
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files))}
          />
        </label>
        <p className="text-xs text-[var(--color-textSecondary)] mt-4">Max file size: 50MB</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Selected Files</h3>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="text-[var(--color-primary)]-600" size={20} />
                <div>
                  <div className="font-medium">{file.name}</div>
                  <div className="text-sm text-[var(--color-textSecondary)]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="p-2 hover:bg-[var(--color-surface)] rounded"
              >
                <X size={16} className="text-[var(--color-textSecondary)]" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={metadata.category}
            onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
            className="w-full p-2 border rounded-lg"
          >
            <option value="">Select category</option>
            <option value="policies">Policies</option>
            <option value="reports">Reports</option>
            <option value="forms">Forms</option>
            <option value="presentations">Presentations</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-textSecondary)]" size={16} />
            <input
              type="text"
              value={metadata.tags}
              onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
              placeholder="e.g., finance, 2024, quarterly"
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={metadata.description}
            onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
            placeholder="Add a description..."
            className="w-full p-2 border rounded-lg h-24 resize-none"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-[var(--color-primary)]-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="text-[var(--color-primary)]-600" size={16} />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
          <div className="w-full bg-[var(--color-primary)]-200 rounded-full h-2">
            <div
              className="bg-[var(--color-primary)]-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress.percent || 0}%` }}
            />
          </div>
          <div className="text-sm text-[var(--color-textSecondary)] mt-1">{uploadProgress.percent || 0}%</div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-full py-3 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <AlertCircle size={20} />
            Uploading...
          </>
        ) : (
          <>
            <Upload size={20} />
            Upload Documents
          </>
        )}
      </button>
    </div>
  );
};

export default DocumentUpload;
