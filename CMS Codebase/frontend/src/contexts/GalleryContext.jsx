import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const GalleryContext = createContext(null);

export const GalleryProvider = ({ children }) => {
  const { api } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Albums
  const fetchAlbums = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/gallery/albums');
      setAlbums(response.data);
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError(err.response?.data?.error || 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbumById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/gallery/albums/${id}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch album');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createAlbum = async (albumData) => {
    try {
      const response = await api.post('/gallery/albums', albumData);
      setAlbums(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create album' };
    }
  };

  const updateAlbum = async (id, albumData) => {
    try {
      const response = await api.put(`/gallery/albums/${id}`, albumData);
      setAlbums(prev => prev.map(a => a.id === id ? response.data : a));
      return response.data;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to update album' };
    }
  };

  const deleteAlbum = async (id) => {
    try {
      await api.delete(`/gallery/albums/${id}`);
      setAlbums(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      throw err.response?.data || { error: 'Failed to delete album' };
    }
  };

  // Photos
  const fetchPhotos = async (albumId) => {
    setLoading(true);
    setError(null);
    try {
      const params = albumId ? { album_id: albumId } : {};
      const response = await api.get('/gallery/photos', { params });
      setPhotos(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch photos');
    } finally {
      setLoading(false);
    }
  };

  const createPhoto = async (photoData) => {
    try {
      const response = await api.post('/gallery/photos', photoData);
      setPhotos(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create photo' };
    }
  };

  const deletePhoto = async (id) => {
    try {
      await api.delete(`/gallery/photos/${id}`);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      throw err.response?.data || { error: 'Failed to delete photo' };
    }
  };

  // Tags
  const fetchTags = async () => {
    try {
      const response = await api.get('/gallery/tags');
      setTags(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tags');
    }
  };

  const createTag = async (name) => {
    try {
      const response = await api.post('/gallery/tags', { name });
      setTags(prev => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to create tag' };
    }
  };

  // Comments
  const fetchPhotoComments = async (photoId) => {
    try {
      const response = await api.get(`/gallery/photos/${photoId}/comments`);
      return response.data;
    } catch (err) {
      return [];
    }
  };

  const addPhotoComment = async (photoId, comment) => {
    try {
      const response = await api.post(`/gallery/photos/${photoId}/comments`, { comment });
      return response.data;
    } catch (err) {
      throw err.response?.data || { error: 'Failed to add comment' };
    }
  };

  return (
    <GalleryContext.Provider value={{
      albums, photos, tags, loading, error,
      fetchAlbums, fetchAlbumById, createAlbum, updateAlbum, deleteAlbum,
      fetchPhotos, createPhoto, deletePhoto,
      fetchTags, createTag,
      fetchPhotoComments, addPhotoComment
    }}>
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
