import React, { useState } from 'react';
import {
  Upload,
  X,
  Palette,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { useColorPalette } from '../../../contexts/ColorPaletteContext';

const DepartmentBranding = ({ department, onUpdate }) => {
  const toast = useToast();
  const { colors } = useColorPalette();
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoColor, setLogoColor] = useState(department?.logo_color || 'var(--color-primary)');
  const [bannerColor, setBannerColor] = useState(department?.banner_color || 'var(--color-primary)');
  const [uploading, setUploading] = useState(false);

  const fetchWithRetry = async (fetchFn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await fetchFn()
        return result
      } catch (error) {
        if (error.message?.includes('429') && i < retries - 1) {
          // Exponential backoff for rate limiting
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
          continue
        }
        throw error
      }
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      setUploading(true);
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${department.id}/logo`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || 'Failed to upload logo';
          const error = new Error(errorMessage);
          error.status = res.status;
          throw error;
        }
        return res;
      });

      const data = await response.json();
      toast.success('Logo uploaded successfully');
      onUpdate({ logo_url: data.data.logoUrl });
      setLogoFile(null);
    } catch (error) {
      console.error('Logo upload error:', error);
      let errorMessage = 'Failed to upload logo';
      
      if (error.status === 403) {
        errorMessage = 'You do not have permission to upload logo';
      } else if (error.status === 404) {
        errorMessage = 'Department not found';
      } else if (error.status === 413) {
        errorMessage = 'File too large (max 5MB)';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setBannerFile(file);
    const formData = new FormData();
    formData.append('banner', file);

    try {
      setUploading(true);
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${department.id}/banner`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || 'Failed to upload banner';
          const error = new Error(errorMessage);
          error.status = res.status;
          throw error;
        }
        return res;
      });

      const data = await response.json();
      toast.success('Banner uploaded successfully');
      onUpdate({ banner_url: data.data.bannerUrl });
      setBannerFile(null);
    } catch (error) {
      console.error('Banner upload error:', error);
      let errorMessage = 'Failed to upload banner';
      
      if (error.status === 403) {
        errorMessage = 'You do not have permission to upload banner';
      } else if (error.status === 404) {
        errorMessage = 'Department not found';
      } else if (error.status === 413) {
        errorMessage = 'File too large (max 5MB)';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleColorUpdate = async () => {
    try {
      setUploading(true);
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${department.id}/colors`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logoColor, bannerColor }),
        });
        if (!res.ok) {
          const error = new Error('Failed to update colors');
          error.status = res.status;
          throw error;
        }
        return res;
      });

      toast.success('Colors updated successfully');
      onUpdate({ logo_color: logoColor, banner_color: bannerColor });
    } catch (error) {
      console.error('Color update error:', error);
      toast.error(error.message || 'Failed to update colors');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      setUploading(true);
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${department.id}/colors`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logoColor, bannerColor, logoUrl: null }),
        });
        if (!res.ok) {
          const error = new Error('Failed to remove logo');
          error.status = res.status;
          throw error;
        }
        return res;
      });

      toast.success('Logo removed successfully');
      onUpdate({ logo_url: null });
    } catch (error) {
      console.error('Logo removal error:', error);
      toast.error(error.message || 'Failed to remove logo');
    } finally {
      setUploading(false);
    }
  };

  const removeBanner = async () => {
    try {
      setUploading(true);
      const response = await fetchWithRetry(async () => {
        const res = await fetch(`/api/departments/${department.id}/colors`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logoColor, bannerColor, bannerUrl: null }),
        });
        if (!res.ok) {
          const error = new Error('Failed to remove banner');
          error.status = res.status;
          throw error;
        }
        return res;
      });

      toast.success('Banner removed successfully');
      onUpdate({ banner_url: null });
    } catch (error) {
      console.error('Banner removal error:', error);
      toast.error(error.message || 'Failed to remove banner');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo Section */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <ImageIcon className="w-5 h-5" />
          Department Logo
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div
              className="w-24 h-24 rounded-full bg-cover bg-center border-4 flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: logoColor,
                backgroundImage: department.logo_url ? `url(${department.logo_url})` : 'none',
                borderColor: colors.border,
              }}
            >
              {!department.logo_url && (
                <span className="text-white text-3xl font-bold">{department.name?.[0] || 'D'}</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="logo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ backgroundColor: colors.primary }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </label>
              {department.logo_url && (
                <button
                  onClick={removeLogo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white"
                  style={{ backgroundColor: colors.error }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.error + 'CC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.error}
                  disabled={uploading}
                >
                  <X className="w-4 h-4" />
                  Remove Logo
                </button>
              )}
            </div>
          </div>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Recommended: Square image, minimum 200x200px. Max size: 5MB.
          </p>
        </div>
      </div>

      {/* Banner Section */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <ImageIcon className="w-5 h-5" />
          Department Banner
        </h3>
        <div className="space-y-4">
          <div
            className="h-32 rounded-lg bg-cover bg-center border-2 overflow-hidden relative"
            style={{
              backgroundColor: bannerColor,
              backgroundImage: department.banner_url ? `url(${department.banner_url})` : 'none',
              borderColor: colors.border,
            }}
          >
            {!department.banner_url && (
              <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--color-surface)' }}>
                No banner uploaded
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="banner-upload"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="banner-upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
              style={{ backgroundColor: colors.primary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary + 'CC'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Banner'}
            </label>
            {department.banner_url && (
              <button
                onClick={removeBanner}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ backgroundColor: colors.error }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.error + 'CC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.error}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
                Remove Banner
              </button>
            )}
          </div>
          <p className="text-sm" style={{ color: colors.textSecondary }}>
            Recommended: 1200x400px. Max size: 5MB.
          </p>
        </div>
      </div>

      {/* Color Theme Section */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <Palette className="w-5 h-5" />
          Brand Colors
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Logo Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer border-2"
                style={{ borderColor: colors.border }}
              />
              <input
                type="text"
                value={logoColor}
                onChange={(e) => setLogoColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text
                }}
                placeholder="var(--color-primary)"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
              Banner Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer border-2"
                style={{ borderColor: colors.border }}
              />
              <input
                type="text"
                value={bannerColor}
                onChange={(e) => setBannerColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg"
                style={{ 
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.background,
                  color: colors.text
                }}
                placeholder="var(--color-primary)"
              />
            </div>
          </div>
          <button
            onClick={handleColorUpdate}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white"
            style={{ backgroundColor: colors.success }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.success + 'CC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.success}
          >
            <Check className="w-4 h-4" />
            {uploading ? 'Saving...' : 'Save Colors'}
          </button>
        </div>
      </div>

      {/* Preview Section */}
      <div className="rounded-lg shadow p-6" style={{ backgroundColor: colors.surface }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Preview</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
          <div
            className="h-24 bg-cover bg-center relative"
            style={{
              backgroundColor: bannerColor,
              backgroundImage: department.banner_url ? `url(${department.banner_url})` : 'none',
            }}
          >
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }} />
          </div>
          <div className="p-4 flex items-center gap-4" style={{ backgroundColor: colors.surface }}>
            <div
              className="w-16 h-16 rounded-full bg-cover bg-center border-4 -mt-8 relative z-10"
              style={{
                backgroundColor: logoColor,
                backgroundImage: department.logo_url ? `url(${department.logo_url})` : 'none',
                borderColor: colors.surface,
              }}
            >
              {!department.logo_url && (
                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
                  {department.name?.[0] || 'D'}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-bold" style={{ color: colors.text }}>{department.name}</h4>
              <p className="text-sm" style={{ color: colors.textSecondary }}>{department.category}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentBranding;
