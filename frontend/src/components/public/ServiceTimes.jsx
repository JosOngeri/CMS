/**
 * Service Times Component
 * Displays church service times from public settings (with sensible defaults).
 */

import { Clock, Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';

const defaultServiceTimes = [
  {
    day: 'Sabbath School',
    time: '9:00 AM - 10:00 AM',
    weekday: 6, // Saturday
    icon: Calendar,
    description: 'Bible study for all ages',
    highlight: true,
    link: '/announcements'
  },
  {
    day: 'Main Service',
    time: '10:30 AM - 12:30 PM',
    weekday: 6,
    icon: Clock,
    description: 'Worship service with sermon',
    highlight: true,
    link: '/announcements'
  },
  {
    day: 'Afternoon Service',
    time: '2:30 PM - 4:00 PM',
    weekday: 6,
    icon: Clock,
    description: 'Afternoon fellowship',
    highlight: false,
    link: '/announcements'
  },
  {
    day: 'Prayer Meeting',
    time: '6:00 PM - 7:30 PM',
    weekday: 3, // Wednesday
    icon: Calendar,
    description: 'Mid-week prayer & study',
    highlight: false,
    link: '/announcements'
  }
];

// Guess the service weekday from its name when the setting doesn't carry one.
// Returns JS day-of-week (0=Sun … 6=Sat); Sabbath services are Saturday.
const inferWeekday = (service) => {
  if (Number.isInteger(service.weekday)) return service.weekday;
  const day = (service.day || '').toLowerCase();
  const names = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sabbath: 6 };
  for (const [name, dow] of Object.entries(names)) {
    if (day.includes(name)) return dow;
  }
  return 6; // default: Sabbath
};

// Next calendar date (inclusive of today) matching the service weekday.
const nextOccurrence = (weekday) => {
  const d = new Date();
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
};

// Parse "9:00 AM - 10:00 AM" into [startHours, startMin, endHours, endMin].
const parseTimeRange = (time) => {
  const parts = (time || '').split('-').map(s => s.trim());
  const parse = (t) => {
    const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return [h, parseInt(m[2], 10)];
  };
  const start = parse(parts[0]);
  const end = parts[1] ? parse(parts[1]) : null;
  if (!start) return null;
  return [start, end];
};

const pad = (n) => String(n).padStart(2, '0');
const gcalStamp = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const ServiceTimes = () => {
  const { getSetting } = useSettings();

  const serviceTimes = getSetting('service_times') || defaultServiceTimes;
  const churchName = getSetting('church_name') || 'Msabato';
  const churchLocation = getSetting('church_location') || `${churchName}, Kenya`;

  const addToCalendar = (service) => {
    const title = `${service.day} - ${churchName}`;
    const details = `Join us for ${service.day} at ${churchName}`;

    // Next occurrence of the service's weekday, at the service's start time.
    const start = nextOccurrence(inferWeekday(service));
    const range = parseTimeRange(service.time);
    let dates;
    if (range) {
      const [[sh, sm], end] = range;
      start.setHours(sh, sm, 0, 0);
      const endDate = new Date(start);
      if (end) {
        endDate.setHours(end[0], end[1], 0, 0);
      } else {
        endDate.setHours(start.getHours() + 1);
      }
      dates = `${gcalStamp(start)}/${gcalStamp(endDate)}`;
    } else {
      // Unparseable time → all-day event on the next occurrence.
      const ymd = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
      const next = new Date(start);
      next.setDate(next.getDate() + 1);
      dates = `${ymd(start)}/${ymd(next)}`;
    }

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(churchLocation)}&sf=true&output=xml`;

    window.open(googleCalendarUrl, '_blank');
  };

  const openMap = () => {
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(churchLocation)}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <section className="py-20 bg-[var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-[var(--color-text)] mb-4">Service Times</h2>
          <p className="text-[var(--color-textSecondary)] max-w-2xl mx-auto">
            Join us for worship, fellowship, and spiritual growth. All are welcome!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {serviceTimes.map((service, index) => {
            const Icon = service.icon || (service.day?.toLowerCase().includes('prayer') ? Clock : Calendar);
            return (
              <div
                key={index}
                className={`group relative p-8 rounded-2xl transition-all duration-300 cursor-pointer ${
                  service.highlight
                    ? 'bg-gradient-to-br from-[var(--color-primary-strong)] to-[var(--color-primary-variant)] text-[var(--color-on-solid)] shadow-xl hover:shadow-2xl hover:-translate-y-1'
                    : 'bg-[var(--color-surface)] hover:shadow-lg border border-[var(--color-border)] shadow-sm'
                }`}
                onClick={() => addToCalendar(service)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToCalendar(service); } }}
                role="button"
                tabIndex={0}
                aria-label={`Add ${service.day} to calendar`}
              >
                {service.highlight && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse"></div>
                  </div>
                )}

                <div className={`mb-4 ${service.highlight ? 'text-[var(--color-on-solid-80)]' : 'text-[var(--color-primary)]'}`}>
                  <Icon className="h-10 w-10" aria-hidden="true" />
                </div>

                <h3 className={`font-bold text-xl mb-2 ${service.highlight ? 'text-[var(--color-on-solid)]' : 'text-[var(--color-text)]'}`}>
                  {service.day}
                </h3>

                <p className={`text-lg mb-3 ${service.highlight ? 'text-[var(--color-on-solid-80)]' : 'text-[var(--color-text)]'}`}>
                  {service.time}
                </p>

                <p className={`text-sm ${service.highlight ? 'text-[var(--color-on-solid-80)]' : 'text-[var(--color-textSecondary)]'}`}>
                  {service.description}
                </p>

                {service.highlight && (
                  <div className="mt-6 pt-6 border-t border-[var(--color-on-solid-20)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-on-solid-80)]">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      <span>Main Sanctuary</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={openMap}
            className="inline-flex items-center gap-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] px-6 py-3 rounded-full hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer"
            aria-label="Open map location"
          >
            <MapPin className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium">{churchLocation}</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ServiceTimes;
