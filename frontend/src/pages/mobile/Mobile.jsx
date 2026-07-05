import React, { useState } from 'react';
import { Settings, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Mobile = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Mobile...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mobile</h1>
      <div className="bg-[var(--color-surface)] bg-[var(--color-surface)] rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Settings className="w-8 h-8 text-[var(--color-primary)]-600" />
          <div>
            <h2 className="font-semibold">Configuration</h2>
            <p className="text-sm text-[var(--color-textSecondary)]">Configure Mobile settings</p>
          </div>
        </div>
        <p className="text-[var(--color-textSecondary)]">This module is ready for configuration. Add your Mobile settings here.</p>
      </div>
    </div>
  );
};

export default Mobile;
