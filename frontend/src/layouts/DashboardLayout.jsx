/**
 * WHAT THIS FILE DOES
 * -------------------
 * The outer frame for every page inside the dashboard. It puts the sidebar on
 * the left, the header on top, the main content area in the middle, and a
 * bottom navigation bar on small screens.
 *
 * The actual page content comes from React Router's <Outlet />.
 *
 * FILES IT TALKS TO
 * -----------------
 * - components/common/Sidebar.jsx
 * - components/common/Header.jsx
 * - components/common/MobileBottomNav.jsx
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import MobileBottomNav from '../components/common/MobileBottomNav';
import SkipNavigation from '../components/accessibility/SkipNavigation';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-background)] transition-colors">
      <SkipNavigation />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header sits outside the scrolling region — it stays frozen while
            main content scrolls underneath it. */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main id="main-content" className="flex-1 min-h-0 p-4 pb-24 md:p-6 lg:pb-6 overflow-y-auto overscroll-contain" tabIndex="-1">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default DashboardLayout;
