/**
 * Service Times Component
 * Displays church service times with enhanced design
 */

import { Clock, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const serviceTimes = [
  { 
    day: 'Sabbath School', 
    time: '9:00 AM - 10:00 AM',
    icon: Calendar,
    description: 'Bible study for all ages',
    highlight: true,
    link: '/announcements'
  },
  { 
    day: 'Main Service', 
    time: '10:30 AM - 12:30 PM',
    icon: Clock,
    description: 'Worship service with sermon',
    highlight: true,
    link: '/announcements'
  },
  { 
    day: 'Afternoon Service', 
    time: '2:30 PM - 4:00 PM',
    icon: Clock,
    description: 'Afternoon fellowship',
    highlight: false,
    link: '/announcements'
  },
  { 
    day: 'Prayer Meeting', 
    time: 'Wednesday 6:00 PM - 7:30 PM',
    icon: Calendar,
    description: 'Mid-week prayer & study',
    highlight: false,
    link: '/announcements'
  }
];

const ServiceTimes = () => {
  const addToCalendar = (serviceName, time) => {
    // Create calendar event URL
    const title = `${serviceName} - Kiserian Main SDA Church`;
    const details = `Join us for ${serviceName} at Kiserian Main SDA Church`;
    const location = 'Kiserian Main SDA Church, Kiserian, Kenya';
    
    // Parse time to create event date (simplified for demo)
    const today = new Date();
    const eventDate = new Date(today);
    
    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${eventDate.toISOString().split('T')[0]}/${eventDate.toISOString().split('T')[0]}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
    
    window.open(googleCalendarUrl, '_blank');
  };

  const openMap = () => {
    // Open Google Maps with the church location
    const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Kiserian+Main+SDA+Church+Kiserian+Kenya';
    window.open(mapUrl, '_blank');
  };

  return (
    <section className="py-20 bg-[var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[var(--color-text)] mb-4">Service Times</h2>
          <p className="text-[var(--color-textSecondary)] max-w-2xl mx-auto">
            Join us for worship, fellowship, and spiritual growth. All are welcome!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {serviceTimes.map((service, index) => {
            const Icon = service.icon;
            return (
              <div 
                key={index} 
                className={`group relative p-8 rounded-2xl transition-all duration-300 cursor-pointer ${
                  service.highlight 
                    ? 'bg-gradient-to-br from-[var(--color-primary)]-800 to-[var(--color-primary)]-900 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1' 
                    : 'bg-[var(--color-background)] hover:bg-[var(--color-surface)] border border-[var(--color-border)]'
                }`}
                onClick={() => addToCalendar(service.day, service.time)}
                role="button"
                aria-label={`Add ${service.day} to calendar`}
              >
                {service.highlight && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                )}
                
                <div className={`mb-4 ${service.highlight ? 'text-white/90' : 'text-[var(--color-primary)]-800'}`}>
                  <Icon className="h-10 w-10" aria-hidden="true" />
                </div>
                
                <h3 className={`font-bold text-xl mb-2 ${service.highlight ? 'text-white' : 'text-[var(--color-text)]'}`}>
                  {service.day}
                </h3>
                
                <p className={`text-lg mb-3 ${service.highlight ? 'text-white/90' : 'text-[var(--color-text)]'}`}>
                  {service.time}
                </p>
                
                <p className={`text-sm ${service.highlight ? 'text-white/70' : 'text-[var(--color-textSecondary)]'}`}>
                  {service.description}
                </p>

                {service.highlight && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>Main Sanctuary</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <button
            onClick={openMap}
            className="inline-flex items-center gap-2 bg-[var(--color-primary)]-50 text-[var(--color-primary)]-800 px-6 py-3 rounded-full hover:bg-[var(--color-primary)]-100 transition-colors cursor-pointer"
            aria-label="Open map location"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium">Kiserian Main SDA Church, Kiserian, Kenya</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServiceTimes;
