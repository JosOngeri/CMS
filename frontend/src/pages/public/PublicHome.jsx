import HeroSection from '../../components/public/HeroSection';
import ServiceTimes from '../../components/public/ServiceTimes';
import FeaturedAnnouncements from '../../components/public/FeaturedAnnouncements';
import FeaturedPhotos from '../../components/public/FeaturedPhotos';
import MinistriesCarousel from '../../components/public/MinistriesCarousel';
import LiveStreamSection from '../../components/public/LiveStreamSection';

const PublicHome = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ServiceTimes />
      <FeaturedAnnouncements />
      <FeaturedPhotos />
      <MinistriesCarousel />
      <LiveStreamSection />
    </div>
  );
};

export default PublicHome;
