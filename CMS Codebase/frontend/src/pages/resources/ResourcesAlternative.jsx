import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image,
  Video,
  Mic,
  Download,
  Folder,
  FolderOpen,
  Upload,
  Search,
  ChevronRight,
  X,
  Grid,
  List,
  Plus,
  Trash2,
  Edit,
  Eye,
  Home,
  MoreVertical,
  File,
  Archive
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { ResourcesEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';

const ResourcesAlternative = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Mock folder structure
  const [folders] = useState([
    { id: 1, name: 'Documents', type: 'folder', itemCount: 12 },
    { id: 2, name: 'Media', type: 'folder', itemCount: 8 },
    { id: 3, name: 'Sermons', type: 'folder', itemCount: 5 },
    { id: 4, name: 'Gallery', type: 'folder', itemCount: 15 },
    { id: 5, name: 'Downloads', type: 'folder', itemCount: 3 },
    { id: 6, name: 'Archives', type: 'folder', itemCount: 2 }
  ]);

  // Mock files
  const [files] = useState([
    { id: 101, name: 'Church Constitution.pdf', type: 'pdf', size: '2.4 MB', modified: '2024-01-15' },
    { id: 102, name: 'Weekly Bulletin.docx', type: 'doc', size: '156 KB', modified: '2024-01-14' },
    { id: 103, name: 'Sunday Service.jpg', type: 'image', size: '3.2 MB', modified: '2024-01-13' },
    { id: 104, name: 'Sermon Recording.mp3', type: 'audio', size: '45 MB', modified: '2024-01-12' },
    { id: 105, name: 'Event Video.mp4', type: 'video', size: '128 MB', modified: '2024-01-11' }
  ]);

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc': return <FileText className="w-8 h-8 text-[var(--color-primary)]-500" />;
      case 'image': return <Image className="w-8 h-8 text-green-500" />;
      case 'audio': return <Mic className="w-8 h-8 text-purple-500" />;
      case 'video': return <Video className="w-8 h-8 text-orange-500" />;
      default: return <File className="w-8 h-8 text-[var(--color-textSecondary)]" />;
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentPath([...currentPath, folder]);
  };

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
  };

  const handleUpload = () => {
    toast.info('Upload functionality will be implemented');
  };

  const handleDelete = (fileId) => {
    toast.info('Delete functionality will be implemented');
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full">
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Resources</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">File manager for church resources</p>
        </div>
        <button
          onClick={handleUpload}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-200px)]">
        {/* Left Panel - Folder Tree */}
        <div className="w-64 bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h3 className="font-semibold text-[var(--color-text)] mb-3">Folders</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--color-background)] transition-colors text-left"
              >
                <Folder className="w-5 h-5 text-[var(--color-primary)]-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{folder.name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{folder.itemCount} items</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle Panel - File Grid */}
        <div className="flex-1 bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          {/* Breadcrumb */}
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
            <button
              onClick={() => setCurrentPath([])}
              className="p-1 hover:bg-[var(--color-surface)] rounded transition-colors"
            >
              <Home className="w-4 h-4 text-[var(--color-textSecondary)]" />
            </button>
            {currentPath.map((folder, index) => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-[var(--color-textSecondary)]" />
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-800"
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 border border-[var(--color-border)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' : 'text-[var(--color-textSecondary)]'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-600' : 'text-[var(--color-textSecondary)]'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-left"
                  >
                    <Folder className="w-12 h-12 text-[var(--color-primary)]-500 mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{folder.name}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{folder.itemCount} items</p>
                  </button>
                ))}
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-left ${
                      selectedFile?.id === file.id ? 'ring-2 ring-[var(--color-primary)]-500' : ''
                    }`}
                  >
                    {getFileIcon(file.type)}
                    <p className="text-sm font-medium text-[var(--color-text)] truncate mt-2">{file.name}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{file.size}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderClick(folder)}
                    className="w-full flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-left"
                  >
                    <Folder className="w-5 h-5 text-[var(--color-primary)]-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{folder.name}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{folder.itemCount} items</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  </button>
                ))}
                {filteredFiles.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center gap-3 p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors text-left ${
                      selectedFile?.id === file.id ? 'ring-2 ring-[var(--color-primary)]-500' : ''
                    }`}
                  >
                    {getFileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{file.name}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">{file.size} • {file.modified}</p>
                    </div>
                    <MoreVertical className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - File Preview */}
        <div className="w-80 bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] flex flex-col">
          {selectedFile ? (
            <>
              <div className="p-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[var(--color-text)]">File Preview</h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-[var(--color-surface)] rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-[var(--color-textSecondary)]" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{selectedFile.name}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{selectedFile.size}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-4">
                <div className="bg-[var(--color-background)] rounded-lg p-8 text-center mb-4">
                  {getFileIcon(selectedFile.type)}
                  <p className="text-sm text-[var(--color-textSecondary)] mt-2">Preview not available</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-textSecondary)]">Type</span>
                    <span className="text-[var(--color-text)]">{selectedFile.type.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-textSecondary)]">Size</span>
                    <span className="text-[var(--color-text)]">{selectedFile.size}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-textSecondary)]">Modified</span>
                    <span className="text-[var(--color-text)]">{selectedFile.modified}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-[var(--color-border)] flex gap-2">
                <button
                  onClick={() => toast.info('Download functionality will be implemented')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => toast.info('Edit functionality will be implemented')}
                  className="p-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedFile.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <File className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
                <p className="text-[var(--color-textSecondary)] text-sm">Select a file to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesAlternative;
