import { useState } from 'react';
import { Smartphone, Users, Calendar, DollarSign, FileText, Settings, Home } from 'lucide-react';

const MobileApp = () => {
  const [activeTab, setActiveTab] = useState('home');

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'giving', icon: DollarSign, label: 'Giving' },
    { id: 'documents', icon: FileText, label: 'Documents' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <div className="max-w-md mx-auto bg-[var(--color-surface)] min-h-screen">
      {/* Mobile Header */}
      <div className="bg-[var(--color-primary)]-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">KMainCMS</h1>
          <Smartphone size={24} />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4">
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
              <h2 className="font-semibold mb-2">Welcome to Kiserian SDA</h2>
              <p className="text-[var(--color-textSecondary)]">Access church services on the go</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
                <Users className="text-[var(--color-primary)]-600 mb-2" size={24} />
                <div className="font-semibold">Members</div>
                <div className="text-sm text-[var(--color-textSecondary)]">View directory</div>
              </div>
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
                <Calendar className="text-green-600 mb-2" size={24} />
                <div className="font-semibold">Events</div>
                <div className="text-sm text-[var(--color-textSecondary)]">Upcoming</div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'members' && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-4">Member Directory</h2>
            <p className="text-[var(--color-textSecondary)]">Member directory coming soon...</p>
          </div>
        )}
        {activeTab === 'events' && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-4">Events</h2>
            <p className="text-[var(--color-textSecondary)]">Events coming soon...</p>
          </div>
        )}
        {activeTab === 'giving' && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-4">Giving</h2>
            <p className="text-[var(--color-textSecondary)]">Giving coming soon...</p>
          </div>
        )}
        {activeTab === 'documents' && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-4">Documents</h2>
            <p className="text-[var(--color-textSecondary)]">Documents coming soon...</p>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow">
            <h2 className="font-semibold mb-4">Settings</h2>
            <p className="text-[var(--color-textSecondary)]">Settings coming soon...</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t max-w-md mx-auto">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center p-2 ${
                  activeTab === tab.id ? 'text-[var(--color-primary)]-600' : 'text-[var(--color-textSecondary)]'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MobileApp;
