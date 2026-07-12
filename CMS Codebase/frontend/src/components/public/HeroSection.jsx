/**
 * Hero Section Component
 * Main hero section for the public home page
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Play, Calendar, Users } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="church-gradient text-white relative overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--color-surface)] rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--color-surface)] rounded-full translate-x-1/2 translate-y-1/2 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            {/* Logo and Text */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-6 mb-8 animate-fade-in">
                <img 
                  src="/logo.png" 
                  alt="SDA Church Logo" 
                  className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse-slow"
                  loading="lazy"
                />
                <div className="text-left">
                  <h1 className="text-3xl md:text-5xl font-light text-white/90">Welcome to</h1>
                  <h2 className="text-4xl md:text-6xl font-bold text-white">Kiserian Main</h2>
                  <p className="text-xl md:text-2xl text-white/80 font-medium">Seventh-day Adventist Church</p>
                </div>
              </div>

              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto lg:mx-0">
                Join us for worship, fellowship, and spiritual growth. A place where faith comes alive and community thrives.
              </p>

              {/* Quick Info Cards */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mb-8">
                <div className="flex items-center gap-2 bg-[var(--color-surface)]/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Sabbath Services</span>
                </div>
                <div className="flex items-center gap-2 bg-[var(--color-surface)]/10 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">All Welcome</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/announcements"
                  className="btn btn-lg bg-[var(--color-surface)] text-[var(--color-primary)]-900 hover:bg-[var(--color-surface)] shadow-xl hover:shadow-2xl transition-all duration-300 group"
                  aria-label="View announcements"
                >
                  <span>View Announcements</span>
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  to="/auth/login"
                  className="btn btn-lg bg-transparent border-2 border-white text-white hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]-900 transition-all duration-300"
                  aria-label="Access member portal"
                >
                  Member Portal
                </Link>
              </div>
            </div>

            {/* Right Side - Live Stream Preview */}
            <div className="flex-1 hidden lg:block">
              <div className="relative">
                <div className="bg-[var(--color-surface)]/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center mb-4">
                    <div className="text-center">
                      <Play className="h-16 w-16 mx-auto mb-4 text-white/80" aria-hidden="true" />
                      <p className="text-white/80">Live Stream</p>
                      <p className="text-white/60 text-sm">Saturdays 10:30 AM</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold mb-2">Watch Live</h3>
                    <p className="text-white/80 text-sm">Join our Sabbath services online</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="var(--color-background)"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
