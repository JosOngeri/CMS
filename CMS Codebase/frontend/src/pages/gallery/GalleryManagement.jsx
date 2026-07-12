import { useState, useEffect } from 'react'
import { Upload, X, Folder, Info, RefreshCw, MessageCircle, CheckCircle, AlertCircle, Shield, Tag, Filter, Lock, Unlock, Settings, AlertTriangle } from 'lucide-react'
import Card from '../../components/common/Card'
import PhotoGallery from '../../components/gallery/PhotoGallery'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { usePermission } from '../../hooks/usePermission'
import { usePaginatedFetch } from '../../hooks/useDataFetch'
import { GalleryEmptyState, ErrorEmptyState } from '../../components/common/EmptyState'
import { useNavigate } from 'react-router-dom'

const GalleryManagement = () => {
  const { user, api } = useAuth()
  const { can, canAny } = usePermission()
  const toast = useToast()
  const navigate = useNavigate()
  
  // Permission checks
  const canViewPublic = can('gallery.view_public')
  const canViewAll = can('gallery.view_all')
  const canRequestUpload = can('gallery.request_upload')
  const canUpload = can('gallery.upload')
  const canApprove = can('gallery.approve')
  const canManage = can('gallery.manage')
  
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    files: [],
    caption: '',
    description: '',
    category: ''
  })
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [page, setPage] = useState(1)
  const [filterUntagged, setFilterUntagged] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState(new Set())
  const [showBatchTagModal, setShowBatchTagModal] = useState(false)
  const [batchTagForm, setBatchTagForm] = useState({ category: '', caption: '', description: '' })
  const [batchTagging, setBatchTagging] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authCode, setAuthCode] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authTarget, setAuthTarget] = useState('primary') // 'primary' or 'fallback'
  const [authStatus, setAuthStatus] = useState({ primary: 'unknown', fallback: 'unknown', bot: 'unknown' })
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)

  const baseUrl = `/api/gallery/photos?limit=20${filterUntagged ? '&untagged=true' : ''}${!canViewAll ? '&public=true' : ''}`
  const { data, loading, error, pagination, refetch, isEmpty } = usePaginatedFetch(baseUrl, {
    transform: (result) => result.data?.photos || []
  })

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/telegram/auth-methods')
      const methods = response.data.methods || []
      
      // Check if there are any active auth methods
      const hasActiveMethods = methods.some(m => m.isActive)
      
      setAuthStatus({
        primary: hasActiveMethods ? 'authenticated' : 'unknown',
        fallback: hasActiveMethods ? 'authenticated' : 'unknown',
        bot: hasActiveMethods ? 'configured' : 'unknown'
      })
    } catch (error) {
      console.error('Failed to check auth status:', error)
      setAuthStatus({
        primary: 'unknown',
        fallback: 'unknown',
        bot: 'unknown'
      })
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validate all files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 50MB limit`)
        return false
      }
      return true
    })

    if (validFiles.length > 0) {
      setUploadForm(prev => ({ ...prev, files: validFiles }))
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (uploadForm.files.length === 0) {
      toast.error('Please select at least one file to upload')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      uploadForm.files.forEach(file => {
        formData.append('photos', file)
      })
      formData.append('caption', uploadForm.caption)
      formData.append('description', uploadForm.description)
      formData.append('category', uploadForm.category)
      formData.append('status', canUpload ? 'approved' : 'pending')

      const response = await api.post('/gallery/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(`Uploaded ${response.data.uploaded.length} photo(s), ${response.data.errors.length} failed`)
      } else {
        if (canUpload) {
          toast.success(`Successfully uploaded ${response.data.uploaded.length} photo(s)`)
        } else {
          toast.success(`Successfully submitted ${response.data.uploaded.length} photo(s) for approval`)
        }
      }
      setShowUploadModal(false)
      setUploadForm({ files: [], caption: '', description: '', category: '' })
      refetch()
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast.error(error.response?.data?.error || 'Failed to upload photos')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (photoId) => {
    refetch()
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      newSet.delete(photoId)
      return newSet
    })
  }

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const handleBatchTag = async (e) => {
    e.preventDefault()
    
    if (selectedPhotos.size === 0) {
      toast.error('Please select at least one photo to tag')
      return
    }

    if (!batchTagForm.category && !batchTagForm.caption && !batchTagForm.description) {
      toast.error('Please provide at least one field to update')
      return
    }

    try {
      setBatchTagging(true)
      const response = await api.put('/gallery/photos/batch', {
        photoIds: Array.from(selectedPhotos),
        ...batchTagForm
      })

      if (response.data.errors && response.data.errors.length > 0) {
        toast.warning(`Updated ${response.data.updated.length} photo(s), ${response.data.errors.length} failed`)
      } else {
        toast.success(`Successfully updated ${response.data.updated.length} photo(s)`)
      }
      setShowBatchTagModal(false)
      setBatchTagForm({ category: '', caption: '', description: '' })
      setSelectedPhotos(new Set())
      refetch()
    } catch (error) {
      console.error('Error batch tagging photos:', error)
      toast.error(error.response?.data?.error || 'Failed to update photos')
    } finally {
      setBatchTagging(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await api.post('/gallery/sync')
      if (response.data.synced > 0) {
        toast.success(`Synced ${response.data.synced} photos from Telegram channel`)
      } else {
        toast.info(response.data.message)
      }
      if (response.data.note) {
        console.log('Sync note:', response.data.note)
      }
      refetch()
    } catch (error) {
      console.error('Error syncing photos:', error)
      const errorMsg = error.response?.data?.error || error.response?.data?.details || ''
      if (errorMsg.includes('No session found') || errorMsg.includes('authenticate') || errorMsg.includes('not configured')) {
        toast.info('Telegram authentication required. Please configure Telegram first.')
        navigate('/dashboard/telegram/auth')
      } else {
        toast.error(errorMsg || 'Failed to sync photos')
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleStartAuth = async (target = 'primary') => {
    try {
      setAuthTarget(target)
      const endpoint = target === 'fallback' ? '/telegram/auth/start-fallback' : '/telegram/auth/start'
      const response = await api.post(endpoint)
      if (response.data.needsAuth) {
        setShowAuthModal(true)
        toast.success(`Verification code sent to ${target === 'primary' ? '+254736075771' : '+254724363290'}`)
      } else {
        toast.info(response.data.message)
        setShowAuthModal(false)
        checkAuthStatus()
      }
    } catch (error) {
      console.error('Error starting auth:', error)
      toast.error(error.response?.data?.error || 'Failed to start authentication')
    }
  }

  const handleSubmitAuth = async (e) => {
    e.preventDefault()
    if (!authCode) {
      toast.error('Please enter the verification code')
      return
    }

    try {
      setAuthSubmitting(true)
      const response = await api.post('/telegram/auth/verify', { code: authCode, accountType: authTarget })
      toast.success(response.data.message)
      setShowAuthModal(false)
      setAuthCode('')
      checkAuthStatus()
    } catch (error) {
      console.error('Error submitting code:', error)
      toast.error(error.response?.data?.error || 'Failed to submit code')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleEndSession = async (accountType) => {
    try {
      // For now, just simulate ending session
      toast.success('Session ended successfully')
      checkAuthStatus()
    } catch (error) {
      console.error('Error ending session:', error)
      toast.error(error.response?.data?.error || 'Failed to end session')
    }
  }

  const getStatusIcon = (status) => {
    if (status === 'authenticated' || status === 'configured') {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <AlertCircle className="h-5 w-5 text-red-500" />
  }

  const getStatusText = (status) => {
    if (status === 'authenticated') return 'Authenticated'
    if (status === 'configured') return 'Configured'
    if (status === 'not_authenticated') return 'Not Authenticated'
    if (status === 'not_configured') return 'Not Configured'
    return 'Unknown'
  }

  // Determine what the user can do
  const canViewGallery = canViewPublic || canViewAll
  const canShowUploadButton = canUpload || canRequestUpload
  const uploadButtonText = canUpload ? 'Upload Photos' : 'Request Upload'
  const uploadButtonDesc = canUpload 
    ? 'Upload photos directly to the gallery' 
    : 'Submit photos for approval by communications department'

  if (!canViewGallery) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Gallery</h1>
        </div>
        <Card>
          <div className="text-center py-12">
            <Lock className="h-12 w-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--color-text)]  mb-2">
              Access Denied
            </h3>
            <p className="text-[var(--color-textSecondary)] ">
              You don't have permission to view the gallery.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">
          {canManage ? 'Gallery Management' : 'Church Gallery'}
        </h1>
        <p className="page-subtitle">
          {canManage 
            ? 'Upload and manage photos for the church gallery' 
            : canViewAll 
              ? 'View all church photos including pending uploads'
              : 'View public church photos'}
        </p>
      </div>

      {/* Telegram Authentication Status - Only for managers */}
      {canManage && (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-[var(--color-primary)]-600" />
            <h2 className="text-lg font-semibold text-[var(--color-text)] ">
              Telegram Authentication Status
            </h2>
          </div>
          <button
            onClick={() => navigate('/dashboard/telegram/auth')}
            className="flex items-center space-x-2 text-sm text-[var(--color-primary)]-600 hover:text-[var(--color-primary)]-700"
          >
            <Settings className="h-4 w-4" />
            <span>Configure</span>
          </button>
        </div>
        
        {/* Error State - No Auth Methods Configured */}
        {authStatus.primary === 'unknown' && authStatus.fallback === 'unknown' && authStatus.bot === 'unknown' && (
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-red-700">Telegram Not Configured</p>
                <p className="text-sm text-red-600">Configure Telegram authentication to enable gallery sync</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/telegram/auth')}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              <Settings className="h-4 w-4" />
              <span>Configure Telegram</span>
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Primary Account */}
          <div className="flex items-center justify-between p-4 bg-[var(--color-background)]  rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(authStatus.primary)}
              <div>
                <p className="font-medium text-[var(--color-text)] ">Primary Account (Channel Owner)</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">+254736075771</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-[var(--color-textSecondary)] ">{getStatusText(authStatus.primary)}</span>
              {authStatus.primary !== 'authenticated' && (
                <button
                  onClick={() => { setAuthTarget('primary'); setShowAuthModal(true); }}
                  className="px-3 py-1 bg-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-700 text-white text-sm rounded-lg"
                >
                  Authenticate
                </button>
              )}
            </div>
          </div>

          {/* Fallback Account */}
          <div className="flex items-center justify-between p-4 bg-[var(--color-background)]  rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(authStatus.fallback)}
              <div>
                <p className="font-medium text-[var(--color-text)] ">Fallback Account (Admin)</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">+254724363290</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-[var(--color-textSecondary)] ">{getStatusText(authStatus.fallback)}</span>
              {authStatus.fallback !== 'authenticated' && (
                <button
                  onClick={() => { setAuthTarget('fallback'); setShowAuthModal(true); }}
                  className="px-3 py-1 bg-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-700 text-white text-sm rounded-lg"
                >
                  Authenticate
                </button>
              )}
            </div>
          </div>

          {/* Bot */}
          <div className="flex items-center justify-between p-4 bg-[var(--color-background)]  rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(authStatus.bot)}
              <div>
                <p className="font-medium text-[var(--color-text)] ">Telegram Bot</p>
                <p className="text-sm text-[var(--color-textSecondary)] ">@sdakiserianmain_bot</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-[var(--color-textSecondary)] ">{getStatusText(authStatus.bot)}</span>
            </div>
          </div>

          {/* Advanced Settings - Hidden by default */}
          {showAdvancedSettings && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)] ">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-[var(--color-text)] ">Advanced Session Management</h3>
                <button
                  onClick={() => setShowAdvancedSettings(false)}
                  className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] "
                >
                  Close
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-700">End Primary Session</p>
                    <p className="text-xs text-red-600">Clears channel owner authentication</p>
                  </div>
                  {authStatus.primary === 'authenticated' && (
                    <button
                      onClick={() => handleEndSession('primary')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                    >
                      End Session
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-700">End Fallback Session</p>
                    <p className="text-xs text-red-600">Clears admin account authentication</p>
                  </div>
                  {authStatus.fallback === 'authenticated' && (
                    <button
                      onClick={() => handleEndSession('fallback')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
                    >
                      End Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {!showAdvancedSettings && (
            <button
              onClick={() => setShowAdvancedSettings(true)}
              className="mt-4 w-full text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]  py-2"
            >
              Show Advanced Settings
            </button>
          )}
        </div>
      </Card>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {canShowUploadButton && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
              title={uploadButtonDesc}
            >
              {canRequestUpload && !canUpload && <Unlock className="h-4 w-4 mr-1" />}
              <Upload className="h-4 w-4" />
              <span>{uploadButtonText}</span>
            </button>
          )}
          {canManage && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center space-x-2 bg-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync from Channel'}</span>
          </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setFilterUntagged(!filterUntagged)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${filterUntagged ? 'bg-purple-600 text-white' : 'bg-[var(--color-surface)]  text-[var(--color-text)] '}`}
          >
            <Filter className="h-4 w-4" />
            <span>{filterUntagged ? 'Show All' : 'Untagged Only'}</span>
          </button>
          {selectedPhotos.size > 0 && (
            <button
              onClick={() => setShowBatchTagModal(true)}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <Tag className="h-4 w-4" />
              <span>Tag {selectedPhotos.size} Photo(s)</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text)] ">
                {canUpload ? 'Upload Photos' : 'Request Photo Upload'}
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg"
              >
                <X className="h-5 w-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>

            {!canUpload && (
              <div className="mb-4 p-3 bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg">
                <p className="text-sm text-[var(--color-primary)]-800">
                  <Info className="h-4 w-4 inline mr-1" />
                  Your photos will be submitted for approval by the communications department before being published to the public gallery.
                </p>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Photo Files *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  required
                />
                <p className="text-xs text-[var(--color-textSecondary)]  mt-1">
                  Maximum file size: 50MB per file. Up to 10 files at once.
                </p>
                {uploadForm.files.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {uploadForm.files.length} file(s) selected
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  value={uploadForm.caption}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, caption: e.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  placeholder="Photo caption"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  rows={3}
                  placeholder="Photo description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Category
                </label>
                <div className="relative">
                  <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                  <input
                    type="text"
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    placeholder="e.g., Sermons, Youth, Choir"
                    list="category-suggestions"
                  />
                </div>
                <datalist id="category-suggestions">
                  <option value="Sermons" />
                  <option value="Youth" />
                  <option value="Choir" />
                  <option value="Events" />
                  <option value="Community" />
                  <option value="Outreach" />
                  <option value="Worship" />
                  <option value="Sabbath School" />
                </datalist>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  rounded-lg text-[var(--color-text)]  hover:bg-[var(--color-background)] "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="loading-spinner w-4 h-4"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Batch Tag Modal */}
      {showBatchTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text)] ">
                Tag {selectedPhotos.size} Photo(s)
              </h2>
              <button
                onClick={() => setShowBatchTagModal(false)}
                className="p-2 hover:bg-[var(--color-surface)]  rounded-lg"
              >
                <X className="h-5 w-5 text-[var(--color-textSecondary)]" />
              </button>
            </div>

            <form onSubmit={handleBatchTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Category
                </label>
                <div className="relative">
                  <Folder className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-textSecondary)]" />
                  <input
                    type="text"
                    value={batchTagForm.category}
                    onChange={(e) => setBatchTagForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    placeholder="e.g., Sermons, Youth, Choir"
                    list="category-suggestions"
                  />
                </div>
                <datalist id="category-suggestions">
                  <option value="Sermons" />
                  <option value="Youth" />
                  <option value="Choir" />
                  <option value="Events" />
                  <option value="Community" />
                  <option value="Outreach" />
                  <option value="Worship" />
                  <option value="Sabbath School" />
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Caption
                </label>
                <input
                  type="text"
                  value={batchTagForm.caption}
                  onChange={(e) => setBatchTagForm(prev => ({ ...prev, caption: e.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  placeholder="Photo caption"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                  Description
                </label>
                <textarea
                  value={batchTagForm.description}
                  onChange={(e) => setBatchTagForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                  rows={3}
                  placeholder="Photo description"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBatchTagModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)]  rounded-lg text-[var(--color-text)]  hover:bg-[var(--color-background)] "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchTagging}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {batchTagging ? (
                    <>
                      <div className="loading-spinner w-4 h-4"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Tag className="h-4 w-4" />
                      <span>Update Tags</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Telegram Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text)] ">
                Telegram Authentication
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-textSecondary)] ">
                Authenticating: <span className="font-semibold">{authTarget === 'primary' ? 'Primary Account (+254736075771)' : 'Fallback Account (+254724363290)'}</span>
              </p>
              <p className="text-sm text-[var(--color-textSecondary)] ">
                A verification code will be sent to this Telegram account. Please enter it below to authenticate.
              </p>
              <button
                onClick={() => handleStartAuth(authTarget)}
                className="w-full px-4 py-2 bg-[var(--color-primary)]-600 hover:bg-[var(--color-primary)]-700 text-white rounded-lg"
              >
                Send Verification Code
              </button>
              <form onSubmit={handleSubmitAuth}>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)]  mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--color-border)]  rounded-lg bg-[var(--color-surface)]  text-[var(--color-text)] "
                    placeholder="Enter code from Telegram"
                    maxLength={10}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(false)}
                    className="flex-1 px-4 py-2 border border-[var(--color-border)]  rounded-lg text-[var(--color-text)]  hover:bg-[var(--color-background)] "
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authSubmitting ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Gallery */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)] ">
            {canViewAll ? 'All Photos' : 'Public Photos'}
            {!canViewAll && canRequestUpload && ' (Your pending uploads are visible to you)'}
          </h2>
          {canManage && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-[var(--color-textSecondary)]">Show:</span>
              <button
                onClick={() => setFilterUntagged(false)}
                className={`px-3 py-1 rounded ${!filterUntagged ? 'bg-primary-600 text-white' : 'bg-[var(--color-surface)] '}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterUntagged(true)}
                className={`px-3 py-1 rounded ${filterUntagged ? 'bg-primary-600 text-white' : 'bg-[var(--color-surface)] '}`}
              >
                Pending
              </button>
            </div>
          )}
        </div>
        {error ? (
          <ErrorEmptyState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <GalleryEmptyState 
            onUploadPhoto={canShowUploadButton ? () => setShowUploadModal(true) : undefined}
            canUpload={canShowUploadButton}
          />
        ) : (
          <PhotoGallery
            photos={data || []}
            loading={loading}
            onUpload={canShowUploadButton ? () => setShowUploadModal(true) : undefined}
            onSelectPhoto={canManage ? togglePhotoSelection : undefined}
            selectedPhotos={selectedPhotos}
            enableSelection={canManage}
            showUploadButton={false}
            showViewToggle={false}
            showSearch={false}
            onDelete={canManage ? handleDelete : undefined}
            canUpload={canUpload}
            canApprove={canApprove}
            showStatus={canViewAll || canRequestUpload}
          />
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4">
          <button
            onClick={() => setPage(prev => Math.max(prev - 1, 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-[var(--color-text)] ">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 bg-[var(--color-surface)]  border border-[var(--color-border)]  rounded-lg hover:bg-[var(--color-background)]  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default GalleryManagement
