// Monitoring — system health and security overview for Super Admins.
// Data: GET /api/dashboard/system-health and GET /api/security/analytics.
import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Cpu, Database, HardDrive, RefreshCw, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-[var(--color-primary-light)]">
        <Icon className="w-5 h-5 text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-xs text-[var(--color-textSecondary)]">{label}</p>
        <p className="text-lg font-semibold text-[var(--color-text)]">{value}</p>
        {hint && <p className="text-xs text-[var(--color-textTertiary)]">{hint}</p>}
      </div>
    </div>
  </div>
);

const Monitoring = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [security, setSecurity] = useState({ analytics: null, events: [] });
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, secRes] = await Promise.all([
        api.get('/dashboard/system-health').catch(() => null),
        api.get('/security/analytics').catch(() => null),
      ]);
      if (healthRes?.data?.data) setHealth(healthRes.data.data);
      if (secRes?.data?.data) {
        setSecurity({
          analytics: secRes.data.data.analytics || null,
          events: secRes.data.data.recentEvents || [],
        });
      }
      setRefreshedAt(new Date());
    } catch {
      toast.error('Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const m = health?.metrics || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">System Monitoring</h1>
          <p className="text-[var(--color-textSecondary)]">Live server health and security activity</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-primary-light)]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Database"
          value={health?.database || (loading ? '…' : 'unknown')}
          hint={m.dbLatencyMs != null ? `${m.dbLatencyMs} ms` : undefined}
        />
        <StatCard icon={Cpu} label="CPU load" value={m.cpuLoad != null ? `${m.cpuLoad}%` : '—'} />
        <StatCard icon={HardDrive} label="Memory" value={m.memoryUsage != null ? `${m.memoryUsage}%` : '—'} />
        <StatCard
          icon={Users}
          label="Active users (30 min)"
          value={health?.activeUsers ?? '—'}
          hint={m.uptimeHours != null ? `uptime ${m.uptimeHours}h` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-primary)]" /> Service status
          </h2>
          <dl className="text-sm space-y-2 text-[var(--color-textSecondary)]">
            <div className="flex justify-between"><dt>API</dt><dd className="text-[var(--color-success)]">{health?.api || '—'}</dd></div>
            <div className="flex justify-between"><dt>Last write activity</dt><dd>{health?.lastSync ? new Date(health.lastSync).toLocaleString() : '—'}</dd></div>
            <div className="flex justify-between"><dt>Refreshed</dt><dd>{refreshedAt ? refreshedAt.toLocaleTimeString() : '—'}</dd></div>
          </dl>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--color-warning)]" /> Security (last 30 days)
          </h2>
          {security.analytics ? (
            <dl className="text-sm space-y-2 text-[var(--color-textSecondary)]">
              <div className="flex justify-between"><dt>Total events</dt><dd className="text-[var(--color-text)]">{security.analytics.total_events ?? 0}</dd></div>
              <div className="flex justify-between"><dt>Blocked attempts</dt><dd className="text-[var(--color-error)]">{security.analytics.blocked_attempts ?? 0}</dd></div>
              <div className="flex justify-between"><dt>Suspicious activity</dt><dd className="text-[var(--color-warning)]">{security.analytics.suspicious_activity ?? 0}</dd></div>
              <div className="flex justify-between"><dt>Compliance score</dt><dd className="text-[var(--color-text)]">{security.analytics.compliance_score ?? '—'}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-textSecondary)]">Security analytics require Super Admin access.</p>
          )}
        </div>
      </div>

      {security.events.length > 0 && (
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-semibold text-[var(--color-text)] mb-3">Recent security events</h2>
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {security.events.slice(0, 10).map((e, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-4">
                <span className="text-[var(--color-text)]">{e.description || e.type}</span>
                <span className="text-xs text-[var(--color-textTertiary)] shrink-0">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Monitoring;
