import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Calendar, Megaphone, User } from 'lucide-react';

/**
 * MobileBottomNav — bottom navigation bar mirroring the Flutter app's
 * NavigationBar: Home, Payments, Events, News, Profile.
 * Only visible below the lg breakpoint (desktop keeps the sidebar).
 */
const destinations = [
  { to: '/dashboard/overview', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/dashboard/payments/my', label: 'Payments', icon: CreditCard },
  { to: '/dashboard/events', label: 'Events', icon: Calendar },
  { to: '/dashboard/announcements', label: 'News', icon: Megaphone },
  { to: '/dashboard/profile', label: 'Profile', icon: User },
];

const MobileBottomNav = () => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around">
        {destinations.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px] transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`px-4 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-[var(--color-primary-light)]' : ''
                  }`}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={isActive ? 2.4 : 1.8}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
