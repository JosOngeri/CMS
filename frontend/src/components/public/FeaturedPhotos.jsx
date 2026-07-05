/**
 * Featured Photos Component
 * Displays featured photos from the gallery
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ImageIcon } from 'lucide-react';
import { useDataFetch } from '../../hooks/useDataFetch';
import { GalleryEmptyState, ErrorEmptyState } from '../common/EmptyState';
import { useColorPalette } from '../../contexts/ColorPaletteContext';

const FeaturedPhotos = () => {
  const { data, loading, error, isEmpty, refetch } = useDataFetch(
    '/api/gallery/photos?limit=6',
    {
      transform: (result) => result.photos || []
    }
  );
  const { colors } = useColorPalette()

  return (
    <section className="py-16" style={{ backgroundColor: colors.surface }}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-3xl font-bold" style={{ color: colors.text }}>
            Photo Gallery
          </h2>
          <Link
            to="/gallery"
            className="flex items-center space-x-2 transition-colors"
            aria-label="View full photo gallery"
            style={{ color: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8' }
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1' }
          >
            <span>View Full Gallery</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto"></div>
          </div>
        ) : error ? (
          <ErrorEmptyState message={error} onRetry={refetch} />
        ) : isEmpty ? (
          <GalleryEmptyState />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.map((photo) => (
              <Link
                key={photo.id}
                to={`/gallery/album/${photo.album_id || 'default'}`}
                className="relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow aspect-square block"
              >
                <img
                  src={`/api/gallery/image/${photo.id}`}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x400?text=Photo';
                  }}
                />
                <div className="absolute inset-0 transition-all" style={{ backgroundColor: 'rgba(0, 0, 0, 0)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.4)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0)'}>
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-sm font-medium truncate">{photo.caption || 'Photo'}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedPhotos;
