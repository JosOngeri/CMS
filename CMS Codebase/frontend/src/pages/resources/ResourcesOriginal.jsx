import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image,
  Video,
  Mic,
  Download,
  Folder,
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Trash2,
  Edit,
  Eye,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { ResourcesEmptyState } from '../../components/common/EmptyState';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';

const ResourcesOriginal = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const resourceTabs = [
    { id: 'overview', label: 'Overview', icon: Folder },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'sermons', label: 'Sermons', icon: Mic },
    { id: 'gallery', label: 'Gallery', icon: Video },
    { id: 'downloads', label: 'Downloads', icon: Download }
  ];

  const handleUpload = () => {
    toast.info('Upload functionality will be implemented');
  };

  const handleDelete = (fileId) => {
    toast.info('Delete functionality will be implemented');
  };

  const handleView = (file) => {
    toast.info('View functionality will be implemented');
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Resources</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Manage church documents, media, and resources</p>
        </div>
        <button
          onClick={handleUpload}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload
        </button>
      </div>

      <TabNavigation 
        tabs={resourceTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="resources-tab"
      />

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Total Documents</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <FileText className="w-8 h-8 text-[var(--color-primary)]-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Media Files</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0</p>
                </div>
                <Image className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Storage Used</p>
                  <p className="text-2xl font-bold text-[var(--color-text)]">0 MB</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('documents')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <FileText className="w-5 h-5 text-[var(--color-primary)]-600" />
                <span className="text-[var(--color-text)]">View Documents</span>
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <Image className="w-5 h-5 text-green-600" />
                <span className="text-[var(--color-text)]">View Media</span>
              </button>
              <button
                onClick={handleUpload}
                className="flex items-center gap-3 p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                <Upload className="w-5 h-5 text-purple-600" />
                <span className="text-[var(--color-text)]">Upload File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
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
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <FileText className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No documents found</p>
          </div>
        </div>
      )}

      {/* Media Tab */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
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
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Media
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Image className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No media files found</p>
          </div>
        </div>
      )}

      {/* Sermons Tab */}
      {activeTab === 'sermons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search sermons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Sermon
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Mic className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No sermons found</p>
          </div>
        </div>
      )}

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search gallery..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add to Gallery
            </button>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Video className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No gallery items found</p>
          </div>
        </div>
      )}

      {/* Downloads Tab */}
      {activeTab === 'downloads' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search downloads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 text-center">
            <Download className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No downloads available</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesOriginal;
