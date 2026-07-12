import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Users,
  Image as ImageIcon,
  FileText,
  DollarSign,
  MessageSquare,
  FolderOpen,
  Calendar,
  Bell,
  Menu,
  X,
  LogOut,
  Activity,
  User,
  Building2,
  BarChart3,
  Shield,
  Heart
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { MODULE_PERMISSIONS } from '../../constants/permissions';

function Sidebar({ isOpen, setIsOpen }) {
  const { user, logout } = useAuth();
  const { canAccessModule } = usePermission();
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard/overview', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/dashboard/members', icon: Users, label: 'People' },
    { path: '/dashboard/departments', icon: Building2, label: 'Departments' },
    { path: '/dashboard/admin/documents', icon: FileText, label: 'Documents' },
    { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/dashboard/admin', icon: Shield, label: 'Administration' },
    { path: '/dashboard/treasury', icon: DollarSign, label: 'Treasury' },
    { path: '/dashboard/sms', icon: MessageSquare, label: 'Communications' },
    { path: '/dashboard/approvals', icon: Bell, label: 'Approvals' },
    { path: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
  ];

  // Filter menu items based on user permissions and roles
  const finalMenuItems = menuItems.filter(item => {
    // Super Admin should see all items
    if (user?.roles?.includes('Super Admin')) return true;

    // Check specific module permissions
    return canAccessModule(item.path);
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-[var(--color-surface)] shadow-xl z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:z-0 w-64 flex-shrink-0 border-r border-[var(--color-border)]`}>
        <div className="flex flex-col h-full">
          {/* Header with Gradient */}
          <div className="p-6 church-gradient">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface)]/20 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">K</span>
                </div>
                <h1 className="text-xl font-bold text-white">KMainCMS</h1>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden text-white/80 hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {finalMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'church-gradient text-white shadow-md'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-primary)]/10'
                      }`}
                      onClick={() => setIsOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className={`p-1.5 rounded-lg mr-3 ${isActive ? 'bg-[var(--color-surface)]/20' : 'bg-[var(--color-background)]'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Profile Summary & Logout */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]/50">
            <div className="flex items-center space-x-3 mb-4 px-2">
              <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]-100 flex items-center justify-center text-[var(--color-primary)]-700 font-bold">
                {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-[var(--color-textSecondary)] truncate">
                  {user?.roles?.[0] || 'Member'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
