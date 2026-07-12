/**
 * Ministries Carousel Component
 * Displays ministries in a horizontal carousel with enhanced design
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight,
  Shield, 
  Star, 
  DollarSign, 
  FileText, 
  Target, 
  Baby, 
  User, 
  Heart, 
  HelpCircle, 
  Home, 
  Music, 
  Mic, 
  Settings, 
  BookOpen, 
  GraduationCap, 
  Radio, 
  Compass, 
  Flag, 
  Tent, 
  Newspaper, 
  Megaphone, 
  Building, 
  Phone, 
  Flame, 
  Scale, 
  UserCheck, 
  Book,
  ArrowRight
} from 'lucide-react';

const ministries = [
  // Leadership
  { name: 'Elders', icon: 'Shield', description: 'Church Elders Council - Spiritual leadership', category: 'Leadership', slug: 'elders' },
  { name: 'Deaconry', icon: 'Star', description: 'Deacons and Deaconesses - Service ministry', category: 'Leadership', slug: 'deaconry' },
  { name: 'Treasurer', icon: 'DollarSign', description: 'Church Financial Management', category: 'Leadership', slug: 'treasurer' },
  { name: 'Church Clerk', icon: 'FileText', description: 'Church Records and Administration', category: 'Leadership', slug: 'church-clerk' },

  // Ministries
  { name: 'Youth Ministry', icon: 'Target', description: 'Engaging programs for young adults and youth - I Will Go', category: 'Ministry', slug: 'youth-ministry' },
  { name: 'Children Ministry', icon: 'Baby', description: 'Children Programs and Education', category: 'Ministry', slug: 'children-ministry' },
  { name: 'Adventist Men Ministry', icon: 'User', description: 'Men Ministry Programs', category: 'Ministry', slug: 'adventist-men-ministry' },
  { name: 'Adventist Women Ministry', icon: 'Heart', description: 'Women Ministry Programs', category: 'Ministry', slug: 'adventist-women-ministry' },
  { name: 'Adventist Possibility Ministry', icon: 'HelpCircle', description: 'Possibility Ministry Programs', category: 'Ministry', slug: 'possibility-ministry' },
  { name: 'Health Ministries', icon: 'Heart', description: 'Health education and community wellness', category: 'Ministry', slug: 'health-ministries' },
  { name: 'Family Life', icon: 'Home', description: 'Strengthening families through faith', category: 'Ministry', slug: 'family-life' },

  // Music and Worship
  { name: 'Music Ministry', icon: 'Music', description: 'Church Music and Choir coordination', category: 'Worship', slug: 'music-ministry' },
  { name: 'Choristers', icon: 'Mic', description: 'Church Choir', category: 'Worship', slug: 'choristers' },
  { name: 'Church Choir', icon: 'Music', description: 'Main Church Choir', category: 'Worship', slug: 'church-choir' },
  { name: 'Pianist', icon: 'Music', description: 'Piano and Keyboard ministry', category: 'Worship', slug: 'pianist' },
  { name: 'PA System', icon: 'Settings', description: 'Sound and Audio ministry', category: 'Worship', slug: 'pa-system' },

  // Education
  { name: 'Sabbath School', icon: 'BookOpen', description: 'Bible study and spiritual growth for all ages', category: 'Education', slug: 'sabbath-school' },
  { name: 'Education', icon: 'GraduationCap', description: 'Church Education Programs', category: 'Education', slug: 'education' },
  { name: 'V.O.P./S.O.P.', icon: 'Radio', description: 'Voice of Prophecy/School of Prophets', category: 'Education', slug: 'vop-sop' },

  // Youth Programs
  { name: 'Adventurer Club', icon: 'Compass', description: 'Adventurer Programs for younger children', category: 'Youth', slug: 'adventurer-club' },
  { name: 'Ambassadors', icon: 'Flag', description: 'Ambassador Programs for youth', category: 'Youth', slug: 'ambassadors' },
  { name: 'Pathfinder', icon: 'Compass', description: 'Pathfinder Programs', category: 'Youth', slug: 'pathfinder' },
  { name: 'VBS', icon: 'Tent', description: 'Vacation Bible School', category: 'Youth', slug: 'vbs' },

  // Support Ministries
  { name: 'Dorcas', icon: 'HelpCircle', description: 'Dorcas Ministry - Community service', category: 'Service', slug: 'dorcas' },
  { name: 'Personal Ministry', icon: 'Megaphone', description: 'Personal Evangelism', category: 'Service', slug: 'personal-ministry' },
  { name: 'Publishing', icon: 'Newspaper', description: 'Publishing and Literature ministry', category: 'Service', slug: 'publishing' },
  { name: 'Evangelism', icon: 'Megaphone', description: 'Evangelism Programs', category: 'Service', slug: 'evangelism' },
  { name: 'Stewardship', icon: 'DollarSign', description: 'Stewardship Programs', category: 'Service', slug: 'stewardship' },

  // Special Programs
  { name: 'Camp Meeting', icon: 'Tent', description: 'Camp Meeting Organization', category: 'Special', slug: 'camp-meeting' },
  { name: 'Development', icon: 'Building', description: 'Church Development Projects', category: 'Special', slug: 'development' },
  { name: 'Welfare', icon: 'HelpCircle', description: 'Church Welfare Programs', category: 'Special', slug: 'welfare' },
  { name: 'Interest Coordinator', icon: 'Phone', description: 'New Member Interests', category: 'Special', slug: 'interest-coordinator' },

  // Communication
  { name: 'Communication Secretary', icon: 'Megaphone', description: 'Church Communications', category: 'Communication', slug: 'communication-secretary' },

  // Other Ministries
  { name: 'Prayer Ministry', icon: 'Flame', description: 'Prayer Programs', category: 'Other', slug: 'prayer-ministry' },
  { name: 'Religious Liberty', icon: 'Scale', description: 'Religious Liberty Programs', category: 'Other', slug: 'religious-liberty' },
  { name: 'Nurture and Retention', icon: 'UserCheck', description: 'Member Nurturing', category: 'Other', slug: 'nurture-retention' },
  { name: 'Library', icon: 'Book', description: 'Church Library', category: 'Other', slug: 'library' },
  { name: 'School Chair', icon: 'GraduationCap', description: 'Church School Management', category: 'Other', slug: 'school-chair' }
];

// Icon mapping using imported icons
const iconMap = {
  Shield, Star, DollarSign, FileText, Target, Baby, User, Heart, HelpCircle, Home,
  Music, Mic, Settings, BookOpen, GraduationCap, Radio, Compass, Flag, Tent,
  Newspaper, Megaphone, Building, Phone, Flame, Scale, UserCheck, Book, ArrowRight
};

const categoryColors = {
  'Leadership': 'from-purple-500 to-purple-600',
  'Ministry': 'from-[var(--color-primary)]-500 to-[var(--color-primary)]-600',
  'Worship': 'from-pink-500 to-pink-600',
  'Education': 'from-green-500 to-green-600',
  'Youth': 'from-yellow-500 to-yellow-600',
  'Service': 'from-red-500 to-red-600',
  'Special': 'from-indigo-500 to-indigo-600',
  'Communication': 'from-cyan-500 to-cyan-600',
  'Other': 'from-[var(--color-textSecondary)] to-[var(--color-text)]',
};

const MinistriesCarousel = () => {
  const carouselRef = useRef(null);

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const scrollWidth = carouselRef.current.scrollWidth;
        const clientWidth = carouselRef.current.clientWidth;
        const maxScroll = scrollWidth - clientWidth;
        
        if (carouselRef.current.scrollLeft >= maxScroll) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="py-20 bg-[var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-[var(--color-text)] mb-4">Our Ministries</h2>
          <p className="text-[var(--color-textSecondary)] max-w-2xl mx-auto">
            Discover the various ministries and programs that serve our church and community
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => scrollCarousel('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-[var(--color-surface)] shadow-lg p-3 rounded-full hover:bg-[var(--color-background)] transition-colors border border-[var(--color-border)]"
            style={{ transform: 'translateY(-50%)' }}
            aria-label="Scroll ministries left"
          >
            <ChevronLeft className="h-6 w-6 text-[var(--color-text)]" aria-hidden="true" />
          </button>
          
          <div
            ref={carouselRef}
            className="flex flex-row overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scrollbar-hide px-12"
          >
            {ministries.map((ministry, index) => {
              const Icon = iconMap[ministry.icon] || HelpCircle;
              const gradient = categoryColors[ministry.category] || 'from-[var(--color-textSecondary)] to-[var(--color-text)]';
              return (
                <Link
                  key={index}
                  to={`/departments/${ministry.slug}`}
                  className="flex-shrink-0 w-72 bg-gradient-to-br from-[var(--color-background)] to-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 snap-start group block"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-lg text-[var(--color-text)] mb-2 group-hover:text-[var(--color-primary)]-800 transition-colors">{ministry.name}</h3>
                  <p className="text-[var(--color-textSecondary)] text-sm leading-relaxed">{ministry.description}</p>
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                      {ministry.category}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--color-primary)]-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
          </div>
          
          <button
            onClick={() => scrollCarousel('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[var(--color-surface)] shadow-lg p-3 rounded-full hover:bg-[var(--color-background)] transition-colors border border-[var(--color-border)]"
            style={{ transform: 'translateY(-50%)' }}
            aria-label="Scroll ministries right"
          >
            <ChevronRight className="h-6 w-6 text-[var(--color-text)]" aria-hidden="true" />
          </button>
        </div>

        {/* View All Departments Link */}
        <div className="text-center mt-12">
          <Link
            to="/departments"
            className="inline-flex items-center gap-2 text-[var(--color-primary)]-800 hover:text-[var(--color-primary)]-900 font-semibold transition-colors group"
            aria-label="View all departments"
          >
            <span>View All Departments</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MinistriesCarousel;
