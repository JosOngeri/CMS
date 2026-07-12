import React, { useState } from 'react';
import { Settings, Activity, Megaphone, FileText, Clock, BarChart3, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Breadcrumb from '../../components/common/Breadcrumb';
import TabNavigation from '../../components/common/TabNavigation';

const Telegram = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const smsTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  React.useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Telegram/SMS...</div>;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Telegram/SMS Overview</h2>
              <p className="text-[var(--color-textSecondary)]">Overview of Telegram and SMS messaging functionality.</p>
            </div>
          </div>
        );

      case 'campaigns':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">SMS Campaigns</h2>
              <p className="text-[var(--color-textSecondary)]">Create and manage SMS campaigns.</p>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">SMS Templates</h2>
              <p className="text-[var(--color-textSecondary)]">Manage SMS message templates.</p>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">SMS History</h2>
              <p className="text-[var(--color-textSecondary)]">View SMS message history and logs.</p>
            </div>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--color-surface)]  rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">SMS Analytics</h2>
              <p className="text-[var(--color-textSecondary)]">View SMS campaign analytics and reports.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb />

      <h1 className="text-2xl font-bold mb-6">Telegram & SMS</h1>

      {/* Tab Navigation */}
      <TabNavigation 
        tabs={smsTabs} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        persistKey="sms-tab"
      />

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default Telegram;
