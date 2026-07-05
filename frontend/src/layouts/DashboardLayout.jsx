import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Header from '../components/common/Header';
import SkipNavigation from '../components/accessibility/SkipNavigation';

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile-first: closed by default

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]  transition-colors">
      <SkipNavigation />
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto" tabIndex="-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
