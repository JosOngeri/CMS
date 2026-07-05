import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const FileUpload = ({
  onUpload,
  accept = 'image/*,.pdf,.doc,.docx',
  maxSize = 5 * 1024 * 1024, // 5MB
  maxFiles = 5,
  multiple = false,
  label,
  className = '',
  icon: Icon
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
  };

  const processFiles = (newFiles) => {
    let processedFiles = [];

    newFiles.forEach(file => {
      // Validate file type
      if (!validateFileType(file)) {
        alert(`Invalid file type: ${file.name}`);
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        alert(`File too large: ${file.name} (max ${maxSize / 1024 / 1024}MB)`);
        return;
      }

      processedFiles.push(file);
    });

    // Handle multiple files
    if (multiple) {
      if (files.length + processedFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        processedFiles = processedFiles.slice(0, maxFiles - files.length);
      }
      setFiles([...files, ...processedFiles]);
    } else {
      setFiles(processedFiles.slice(0, 1));
    }
  };

  const validateFileType = (file) => {
    if (accept === '*') return true;
    const acceptedTypes = accept.split(',').map(type => type.trim());
    return acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(category);
      }
      return file.type === type;
    });
  };

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(prev => ({
          ...prev,
          [file.name]: progress
        }));
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result = await onUpload(file);
        return { file, result };
      });

      await Promise.all(uploadPromises);
      setFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
            {label}
          </div>
        </label>
      )}

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-[var(--color-primary)]-500 bg-[var(--color-primary)]-50'
            : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload files"
        />
        <Upload className="h-12 w-12 mx-auto text-[var(--color-textSecondary)] mb-4" aria-hidden="true" />
        <p className="text-[var(--color-textSecondary)] mb-2">
          Drag and drop files here, or
        </p>
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          aria-label="Select files"
        >
          Browse Files
        </button>
        <p className="text-xs text-[var(--color-textSecondary)] mt-2">
          Max {maxSize / 1024 / 1024}MB per file, max {maxFiles} file{maxFiles > 1 ? 's' : ''}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-[var(--color-textSecondary)]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {uploadProgress[file.name] !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-primary)]-600 transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                    <span className="text-xs text-[var(--color-textSecondary)]">{uploadProgress[file.name]}%</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={uploadFiles}
          disabled={uploading}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed transition-colors min-h-[44px]"
          aria-label="Upload files"
          aria-busy={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Files'}
        </button>
      )}
    </div>
  );
};

export default FileUpload;
