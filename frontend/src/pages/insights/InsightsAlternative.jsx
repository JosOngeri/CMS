import React, { useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Building,
  TrendingUp,
  Plus,
  MoreVertical,
  X,
  GripVertical,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const InsightsAlternative = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [dateRange, setDateRange] = useState('30');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [widgets, setWidgets] = useState([
    { id: 1, type: 'member-growth', title: 'Member Growth', icon: Users, size: 'large' },
    { id: 2, type: 'attendance', title: 'Attendance Heatmap', icon: Calendar, size: 'medium' },
    { id: 3, type: 'financial', title: 'Financial Summary', icon: DollarSign, size: 'medium' },
    { id: 4, type: 'activity-feed', title: 'Activity Feed', icon: Activity, size: 'large' },
    { id: 5, type: 'department-performance', title: 'Department Performance', icon: Building, size: 'medium' }
  ]);

  const handleRefresh = () => {
    toast.info('Refreshing widgets...');
  };

  const handleExport = () => {
    toast.info('Export functionality will be implemented');
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleAddWidget = () => {
    toast.info('Add widget functionality will be implemented');
  };

  const getWidgetSize = (size) => {
    switch (size) {
      case 'large': return 'col-span-2 row-span-2';
      case 'medium': return 'col-span-1 row-span-1';
      case 'wide': return 'col-span-2 row-span-1';
      default: return 'col-span-1 row-span-1';
    }
  };

  const renderWidget = (widget) => {
    const WidgetIcon = widget.icon;
    
    return (
      <div
        key={widget.id}
        className={`bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6 relative ${getWidgetSize(widget.size)}`}
      >
        {isCustomizing && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button className="p-1 hover:bg-[var(--color-surface)] rounded cursor-grab">
              <GripVertical className="w-4 h-4 text-[var(--color-textSecondary)]" />
            </button>
            <button
              onClick={() => handleRemoveWidget(widget.id)}
              className="p-1 hover:bg-red-100 rounded"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <WidgetIcon className="w-5 h-5 text-[var(--color-primary)]-600" />
            <h3 className="font-semibold text-[var(--color-text)]">{widget.title}</h3>
          </div>
          {!isCustomizing && (
            <button className="p-1 hover:bg-[var(--color-surface)] rounded">
              <MoreVertical className="w-4 h-4 text-[var(--color-textSecondary)]" />
            </button>
          )}
        </div>
        
        {widget.type === 'member-growth' && (
          <div className="h-48 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
            <div className="text-center">
              <Users className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-2" />
              <p className="text-[var(--color-textSecondary)] text-sm">Member growth chart</p>
              <p className="text-2xl font-bold text-[var(--color-text)] mt-2">0</p>
              <p className="text-xs text-green-600">+0% this month</p>
            </div>
          </div>
        )}
        
        {widget.type === 'attendance' && (
          <div className="h-32 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
            <div className="text-center">
              <Calendar className="w-8 h-8 text-[var(--color-textSecondary)] mx-auto mb-2" />
              <p className="text-[var(--color-textSecondary)] text-sm">Attendance heatmap</p>
              <p className="text-xl font-bold text-[var(--color-text)] mt-2">0%</p>
            </div>
          </div>
        )}
        
        {widget.type === 'financial' && (
          <div className="h-32 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
            <div className="text-center">
              <DollarSign className="w-8 h-8 text-[var(--color-textSecondary)] mx-auto mb-2" />
              <p className="text-[var(--color-textSecondary)] text-sm">Financial summary</p>
              <p className="text-xl font-bold text-[var(--color-text)] mt-2">$0</p>
            </div>
          </div>
        )}
        
        {widget.type === 'activity-feed' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-[var(--color-background)] rounded-lg">
              <Activity className="w-4 h-4 text-[var(--color-primary)]-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-[var(--color-text)]">No recent activities</p>
                <p className="text-xs text-[var(--color-textSecondary)]">Activity feed will be displayed here</p>
              </div>
            </div>
          </div>
        )}
        
        {widget.type === 'department-performance' && (
          <div className="h-32 flex items-center justify-center bg-[var(--color-background)] rounded-lg">
            <div className="text-center">
              <Building className="w-8 h-8 text-[var(--color-textSecondary)] mx-auto mb-2" />
              <p className="text-[var(--color-textSecondary)] text-sm">Department performance</p>
              <p className="text-xl font-bold text-[var(--color-text)] mt-2">0 depts</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full">
      <Breadcrumb />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Insights Dashboard</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Customizable widget dashboard for analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]-500 focus:border-transparent text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={handleRefresh}
            className="p-2 text-[var(--color-textSecondary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isCustomizing ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-[var(--color-border)] hover:bg-[var(--color-background)]'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isCustomizing ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {isCustomizing && (
        <div className="mb-4 p-4 bg-[var(--color-primary)]-50 border border-[var(--color-primary)]-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--color-primary)]-600" />
            <span className="text-sm text-[var(--color-primary)]-800">Customization mode active - drag widgets to rearrange or click X to remove</span>
          </div>
          <button
            onClick={handleAddWidget}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-primary)]-600 text-white rounded hover:bg-[var(--color-primary)]-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Widget
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 auto-rows-[200px]">
        {widgets.map(renderWidget)}
      </div>

      {widgets.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8 inline-block">
            <Activity className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)] mb-4">No widgets added</p>
            <button
              onClick={handleAddWidget}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Widget
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsAlternative;
