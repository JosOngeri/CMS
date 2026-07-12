import { Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, Sun, Moon, Phone, Mail, MapPin, MessageCircle, Video, Share2, Globe, AtSign } from 'lucide-react'
import { useColorPalette } from '../contexts/ColorPaletteContext'

const PublicLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isDark, toggleDarkMode } = useColorPalette()

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <header className="church-gradient text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 bg-[var(--color-surface)] rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <img src="/logo.png" alt="SDA Church Logo" className="w-8 h-8 object-contain" loading="lazy" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl">SDA Kiserian Main</span>
                <p className="text-xs text-white/80">Seventh-day Adventist Church</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link to="/" className="text-white/90 hover:text-white font-medium transition-colors relative group">
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--color-surface)] group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="/announcements" className="text-white/90 hover:text-white font-medium transition-colors relative group">
                Announcements
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--color-surface)] group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="/gallery" className="text-white/90 hover:text-white font-medium transition-colors relative group">
                Gallery
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[var(--color-surface)] group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link to="/auth/login" className="bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 px-4 py-2 rounded-lg font-medium transition-colors">
                Member Login
              </Link>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-[var(--color-surface)]/10 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-surface)]/10 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="lg:hidden py-4 border-t border-white/20 animate-fade-in">
              <nav className="flex flex-col space-y-4">
                <Link 
                  to="/" 
                  className="text-white/90 hover:text-white font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  to="/announcements" 
                  className="text-white/90 hover:text-white font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Announcements
                </Link>
                <Link 
                  to="/gallery" 
                  className="text-white/90 hover:text-white font-medium transition-colors py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Gallery
                </Link>
                <Link 
                  to="/auth/login" 
                  className="bg-[var(--color-surface)]/10 hover:bg-[var(--color-surface)]/20 px-4 py-2 rounded-lg font-medium transition-colors text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Member Login
                </Link>
                <button
                  onClick={() => {
                    toggleDarkMode()
                    setIsMenuOpen(false)
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-[var(--color-surface)]/10 transition-colors w-fit"
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-surface)] text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Church Info */}
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-[var(--color-surface)] rounded-xl flex items-center justify-center">
                  <img src="/logo.png" alt="SDA Church Logo" className="w-8 h-8 object-contain" loading="lazy" />
                </div>
                <div>
                  <span className="font-bold text-lg">SDA Kiserian Main</span>
                  <p className="text-xs text-[var(--color-textSecondary)]">Seventh-day Adventist</p>
                </div>
              </div>
              <p className="text-[var(--color-textSecondary)] text-sm leading-relaxed mb-6">
                Serving the Kiserian community with love, faith, and fellowship. A place where everyone is welcome.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]-800 rounded-lg flex items-center justify-center transition-colors" title="Facebook">
                  <Share2 className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-[var(--color-surface)] hover:bg-pink-600 rounded-lg flex items-center justify-center transition-colors" title="Instagram">
                  <AtSign className="h-5 w-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-[var(--color-surface)] hover:bg-[var(--color-primary)]-400 rounded-lg flex items-center justify-center transition-colors" title="Twitter / X">
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-bold text-lg mb-6">Contact Us</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-[var(--color-primary)]-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Phone</p>
                    <p className="text-[var(--color-textSecondary)] text-sm">+254 700 000 000</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[var(--color-primary)]-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Email</p>
                    <p className="text-[var(--color-textSecondary)] text-sm">info@sda-kiserian.org</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[var(--color-primary)]-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Location</p>
                    <p className="text-[var(--color-textSecondary)] text-sm">Kiserian, Kenya</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-6">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/announcements" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Announcements
                </Link>
                <Link to="/gallery" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Photo Gallery
                </Link>
                <Link to="/auth/login" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Member Portal
                </Link>
                <Link to="/#live-stream" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Live Stream
                </Link>
                <Link to="/terms" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Terms of Use
                </Link>
                <Link to="/privacy" className="block text-[var(--color-textSecondary)] hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>

            {/* Service Times */}
            <div>
              <h3 className="font-bold text-lg mb-6">Service Times</h3>
              <div className="space-y-3">
                <div className="bg-[var(--color-surface)] rounded-lg p-4">
                  <p className="text-white font-medium">Sabbath School</p>
                  <p className="text-[var(--color-textSecondary)] text-sm">9:00 AM - 10:00 AM</p>
                </div>
                <div className="bg-[var(--color-surface)] rounded-lg p-4">
                  <p className="text-white font-medium">Main Service</p>
                  <p className="text-[var(--color-textSecondary)] text-sm">10:30 AM - 12:30 PM</p>
                </div>
                <div className="bg-[var(--color-surface)] rounded-lg p-4">
                  <p className="text-white font-medium">Prayer Meeting</p>
                  <p className="text-[var(--color-textSecondary)] text-sm">Wednesday 6:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-[var(--color-border)] mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[var(--color-textSecondary)] text-sm">
                © {new Date().getFullYear()} SDA Kiserian Main. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer" className="text-[var(--color-textSecondary)] hover:text-green-400 transition-colors">
                  <MessageCircle className="h-5 w-5" />
                </a>
                <a href="mailto:info@sda-kiserian.org" className="text-[var(--color-textSecondary)] hover:text-[var(--color-primary)]-400 transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
                <a href="https://www.youtube.com/results?search_query=Seventh-day+Adventist+sermon" target="_blank" rel="noopener noreferrer" className="text-[var(--color-textSecondary)] hover:text-red-500 transition-colors">
                  <Video className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
