import { useState, useEffect } from 'react';
import { Users, Image as ImageIcon, FileText, DollarSign, MessageSquare, Calendar, TrendingUp, Activity, Sparkles, Church, BarChart3, TestTube, Download } from 'lucide-react';
import { useMembers } from '../../contexts/MembersContext';

function DashboardHome() {
  const { stats: memberStats, fetchStats } = useMembers();
  const [stats, setStats] = useState([
    { label: 'Total Members', value: '0', icon: Users, color: 'from-[var(--color-primary)]-800 to-[var(--color-primary)]-900', iconBg: 'bg-[var(--color-primary)]-100', iconColor: 'text-[var(--color-primary)]-800' },
    { label: 'Gallery Photos', value: '0', icon: ImageIcon, color: 'from-emerald-500 to-emerald-600', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Documents', value: '0', icon: FileText, color: 'from-violet-500 to-violet-600', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' },
    { label: 'Treasury Balance', value: 'KES 0', icon: DollarSign, color: 'from-amber-500 to-amber-600', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
  ]);

  const recentActivity = [
    { action: 'System initialized', time: 'Just now', type: 'info' },
  ];

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (memberStats && (memberStats.total || memberStats.total === 0)) {
      setStats(prev => prev.map(item =>
        item.label === 'Total Members'
          ? { ...item, value: String(memberStats.total || 0) }
          : item
      ));
    }
  }, [memberStats]);

  return (
    <div className="space-y-6">
      {/* Welcome Section with Church Gradient */}
      <div className="church-gradient rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-surface)] rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-[var(--color-surface)]/20 rounded-xl">
              <Church className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to KMainCMS</h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl">
            Kiserian Main SDA Church Management System - Overview of your church administration dashboard
          </p>
        </div>
      </div>

      {/* Stats Grid with Church-Themed Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-[var(--color-surface)] rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className={`h-2 bg-gradient-to-r ${stat.color}`}></div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)] font-medium">{stat.label}</p>
                    <p className="text-3xl font-bold text-[var(--color-text)] mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-7 w-7 ${stat.iconColor}`} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-[var(--color-textSecondary)]">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>Updated just now</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions with Church-Themed Cards */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-6 flex items-center">
          <Activity className="h-6 w-6 mr-3 text-[var(--color-primary)]-800" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]-50 to-[var(--color-primary)]-100 border border-[var(--color-primary)]-200 hover:from-[var(--color-primary)]-100 hover:to-[var(--color-primary)]-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-[var(--color-primary)]-800 shadow-md group-hover:shadow-xl transition-all">
              <Users className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-[var(--color-primary)]-800 mt-4">Add Member</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 hover:from-emerald-100 hover:to-emerald-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-emerald-600 shadow-md group-hover:shadow-xl transition-all">
              <ImageIcon className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-emerald-700 mt-4">Upload Photo</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 hover:from-violet-100 hover:to-violet-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-violet-600 shadow-md group-hover:shadow-xl transition-all">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-violet-700 mt-4">New Announcement</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 hover:from-orange-100 hover:to-orange-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-orange-600 shadow-md group-hover:shadow-xl transition-all">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-orange-700 mt-4">Send SMS</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 hover:from-pink-100 hover:to-pink-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-pink-600 shadow-md group-hover:shadow-xl transition-all">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-pink-700 mt-4">Analytics</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 hover:from-cyan-100 hover:to-cyan-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-cyan-600 shadow-md group-hover:shadow-xl transition-all">
              <TestTube className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-cyan-700 mt-4">Testing</span>
          </button>
          <button className="group flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 hover:from-indigo-100 hover:to-indigo-200 transition-all hover:scale-105 hover:shadow-lg">
            <div className="p-4 rounded-2xl bg-indigo-600 shadow-md group-hover:shadow-xl transition-all">
              <Download className="h-7 w-7 text-white" />
            </div>
            <span className="text-sm font-semibold text-indigo-700 mt-4">Reports</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-6 flex items-center">
          <Activity className="h-6 w-6 mr-3 text-[var(--color-primary)]-800" />
          Recent Activity
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-[var(--color-primary)]-50 to-transparent rounded-xl border border-[var(--color-primary)]-100">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]-800 flex items-center justify-center shadow-md">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-text)]">{activity.action}</p>
                <p className="text-xs text-[var(--color-primary)]-800 font-medium">{activity.time}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && (
            <p className="text-sm text-[var(--color-textSecondary)] text-center py-8">No recent activity</p>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-6 flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-3 animate-pulse"></div>
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Database</p>
              <p className="text-xs text-green-600 font-medium">Connected</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-[var(--color-primary)]-50 to-cyan-50 rounded-xl border border-[var(--color-primary)]-200">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]-600 flex items-center justify-center shadow-md">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">API</p>
              <p className="text-xs text-[var(--color-primary)]-600 font-medium">Running</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-text)]">Cache</p>
              <p className="text-xs text-purple-600 font-medium">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardHome;
