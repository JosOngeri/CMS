import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';

const GalleryContext = createContext(null);

export const GalleryProvider = ({ children }) => {
  const { api } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Normalize the {success, data, error} envelope used across the API.
  const unwrap = (response) => response.data?.data ?? response.data;

  // Albums
  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/gallery/albums');
      setAlbums(unwrap(response));
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError(err.response?.data?.error || 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchAlbumById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/gallery/albums/${id}`);
      return unwrap(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch album');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createAlbum = useCallback(async (albumData) => {
    try {
      const response = await api.post('/gallery/albums', albumData);
      setAlbums(prev => [...prev, unwrap(response)]);
      return unwrap(response);
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create album' };
    }
  }, [api]);

  const updateAlbum = useCallback(async (id, albumData) => {
    try {
      const response = await api.put(`/gallery/albums/${id}`, albumData);
      const updated = unwrap(response);
      setAlbums(prev => prev.map(a => a.id === id ? updated : a));
      return updated;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to update album' };
    }
  }, [api]);

  const deleteAlbum = useCallback(async (id) => {
    try {
      await api.delete(`/gallery/albums/${id}`);
      setAlbums(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      throw err.response?.data || { error: 'Failed to delete album' };
    }
  }, [api]);

  // Photos
  const fetchPhotos = useCallback(async (albumId) => {
    setLoading(true);
    setError(null);
    try {
      const params = albumId ? { album_id: albumId } : {};
      const response = await api.get('/gallery/photos', { params });
      setPhotos(unwrap(response));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch photos');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createPhoto = useCallback(async (photoData) => {
    try {
      const response = await api.post('/gallery/photos', photoData);
      setPhotos(prev => [...prev, unwrap(response)]);
      return unwrap(response);
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create photo' };
    }
  }, [api]);

  const deletePhoto = useCallback(async (id) => {
    try {
      await api.delete(`/gallery/photos/${id}`);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw err.response?.data || { error: 'Failed to delete photo' };
    }
  }, [api]);

  // Tags
  const fetchTags = useCallback(async () => {
    try {
      const response = await api.get('/gallery/tags');
      setTags(unwrap(response));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tags');
    }
  }, [api]);

  const createTag = useCallback(async (name) => {
    try {
      const response = await api.post('/gallery/tags', { name });
      const tag = unwrap(response);
      setTags(prev => [...prev, tag]);
      return tag;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create tag' };
    }
  }, [api]);

  // Comments
  const fetchPhotoComments = useCallback(async (photoId) => {
    try {
      const response = await api.get(`/gallery/photos/${photoId}/comments`);
      return unwrap(response);
    } catch (err) {
      return [];
    }
  }, [api]);

  const addPhotoComment = useCallback(async (photoId, comment) => {
    try {
      const response = await api.post(`/gallery/photos/${photoId}/comments`, { comment });
      return unwrap(response);
    } catch (err) {
      throw err.response?.data || { error: 'Failed to add comment' };
    }
  }, [api]);

  const value = useMemo(() => ({
    albums, photos, tags, loading, error,
    fetchAlbums, fetchAlbumById, createAlbum, updateAlbum, deleteAlbum,
    fetchPhotos, createPhoto, deletePhoto,
    fetchTags, createTag,
    fetchPhotoComments, addPhotoComment
  }), [albums, photos, tags, loading, error, fetchAlbums, fetchAlbumById, createAlbum, updateAlbum, deleteAlbum, fetchPhotos, createPhoto, deletePhoto, fetchTags, createTag, fetchPhotoComments, addPhotoComment]);

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGallery = () => {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within a GalleryProvider');
  }
  return context;
};
