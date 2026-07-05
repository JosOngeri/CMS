import { Bell, Search, User, Menu, Sparkles, Moon, Sun, ChevronDown, LogOut, Settings, LayoutGrid, Image } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import { useToast } from '../../contexts/ToastContext';
import { useAlternativeTabStructure, setUserTabPreference } from '../../hooks/useFeatureFlag';

function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { isDark, toggleDarkMode } = useColorPalette();
  const toast = useToast();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const useAlternative = useAlternativeTabStructure();

  const handleTabStructureToggle = () => {
    const newValue = !useAlternative;
    setUserTabPreference(newValue);
    toast.success(newValue ? 'Alternative tab structure enabled' : 'Original tab structure enabled');
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    toast.success(!isDark ? 'Dark mode enabled' : 'Light mode enabled');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/photo-gallery?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="bg-[var(--color-surface)] shadow-sm border-b border-[var(--color-border)] transition-colors">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center space-x-2 md:space-x-4 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-3 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="relative flex-1 max-w-md">
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--color-textSecondary)]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
                aria-label="Search"
              />
            </form>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 ml-2 md:ml-4">
          <Link
            to="/photo-gallery"
            className="p-3 md:p-2.5 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Photo Gallery"
            title="Photo Gallery"
          >
            <Image className="h-6 w-6" />
          </Link>
          <button
            onClick={handleTabStructureToggle}
            className="p-3 md:p-2.5 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={useAlternative ? 'Switch to original tab structure' : 'Switch to alternative tab structure'}
            title={useAlternative ? 'Using alternative tab structure (click to switch)' : 'Using original tab structure (click to switch)'}
          >
            <LayoutGrid className={`h-6 w-6 ${useAlternative ? 'text-[var(--color-primary)]' : ''}`} />
          </button>
          <button
            onClick={handleDarkModeToggle}
            className="p-3 md:p-2.5 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
          <button
            className="relative p-3 md:p-2.5 text-[var(--color-textSecondary)] hover:bg-[var(--color-background)] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[var(--color-surface)]"></span>
          </button>
          <div className="relative pl-2 md:pl-4 border-l border-[var(--color-border)]">
            <button
              onClick={toggleUserMenu}
              className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity"
              aria-label="User menu"
            >
              <div className="w-10 h-10 rounded-full church-gradient flex items-center justify-center shadow-md flex-shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
                <p className="text-xs text-[var(--color-textSecondary)] font-medium">
                  {user?.roles?.[0] || 'User'}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-[var(--color-textSecondary)] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-surface)] rounded-lg shadow-lg border border-[var(--color-border)] z-50">
                <Link
                  to="/dashboard/profile"
                  className="flex items-center px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] rounded-t-lg"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-3" />
                  Profile
                </Link>
                <Link
                  to="/dashboard/admin/settings"
                  className="flex items-center px-4 py-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-background)]"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-b-lg"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
