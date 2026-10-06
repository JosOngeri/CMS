import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * SMS Dashboard — overview of the church's SMS activity.
 * Uses the authenticated axios instance from AuthContext (cookie session +
 * CSRF interceptor), never localStorage tokens or hard-coded API URLs.
 */
const SMSDashboard = () => {
  const { api } = useAuth();
  const [stats, setStats] = useState({
    totalContacts: 0,
    totalGroups: 0,
    totalSent: 0,
    deliveryRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [gateway, setGateway] = useState(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [contactsRes, groupsRes, statsRes, recentRes] = await Promise.all([
          api.get('/sms-contacts'),
          api.get('/sms-groups'),
          api.get('/sms/stats'),
          api.get('/sms/recent')
        ]);

        const contacts = contactsRes.data?.data?.contacts || contactsRes.data?.contacts || [];
        const groups = groupsRes.data?.data?.groups || groupsRes.data?.groups || [];
        const smsStats = statsRes.data?.data?.stats || statsRes.data?.stats || {};
        const messages = recentRes.data?.data?.messages || recentRes.data?.messages || [];

        setStats({
          totalContacts: contacts.length,
          totalGroups: groups.length,
          totalSent: Number(smsStats.total_sent) || 0,
          deliveryRate: Number(smsStats.delivery_rate) || 0
        });
        setRecentActivity(messages);
      } catch (err) {
        setError('Failed to load SMS dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();

    // Gateway presence + queue depth — refreshed on a 30s cadence so the
    // banner reflects reality without a manual reload.
    const fetchGateway = async () => {
      try {
        const [gw, q] = await Promise.all([
          api.get('/sms/gateway-status'),
          api.get('/sms/deliveries?status=queued&limit=1').catch(() => null),
        ]);
        setGateway(gw.data?.data || null);
        setQueuedCount(Number(q?.data?.data?.total) || 0);
      } catch (e) {
        setGateway({ online: false, devices: [] });
      }
    };
    fetchGateway();
    const interval = setInterval(fetchGateway, 30000);
    return () => clearInterval(interval);
  }, [api]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">SMS Dashboard</h1>
      {error && <p className="mb-4 text-sm text-[var(--color-error)]">{error}</p>}

      {/* Delivery readiness banner — the honest signal about whether SMS can
          actually leave this church right now. */}
      {gateway !== null && (
        <div className={`mb-6 p-4 rounded-lg border ${gateway.online
          ? 'bg-[var(--color-success-light)] border-[var(--color-success)]'
          : 'bg-[var(--color-warning-light)] border-[var(--color-warning)]'}`}>
          {gateway.online ? (
            <p className="text-sm">
              <span className="font-semibold">SMS delivery ready</span> — JOSms
              gateway online
              {gateway.devices?.filter(d => d.is_online)[0]?.label
                ? ` (${gateway.devices.filter(d => d.is_online)[0].label})`
                : ''}.
            </p>
          ) : (
            <p className="text-sm">
              <span className="font-semibold">No SMS gateway connected.</span>{' '}
              Open the JOSms app on the church phone and sign in, or configure a
              bulk provider. New sends will fail honestly rather than fake-queue.
            </p>
          )}
        </div>
      )}

      {/* Gateway card — live socket presence + last durable heartbeat. */}
      {gateway !== null && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded-full ${gateway.online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`} />
                Gateway {gateway.online ? 'Online' : 'Offline'}
              </h2>
              <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                {gateway.liveCount} live socket(s){queuedCount > 0 ? ` · ${queuedCount} queued delivery(ies)` : ''}
              </p>
            </div>
            <Link
              to="/dashboard/sms/send"
              className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90 text-sm"
            >
              Send SMS
            </Link>
          </div>
          {gateway.devices?.length > 0 && (
            <div className="mt-4 divide-y divide-[var(--color-border)]">
              {gateway.devices.map(d => (
                <div key={d.device_id} className="py-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full ${d.is_online ? 'bg-[var(--color-success)]' : 'bg-[var(--color-textSecondary)]'}`} />
                  <span className="font-medium">{d.label || d.device_id}</span>
                  {d.app_version && <span className="text-[var(--color-textSecondary)]">v{d.app_version}</span>}
                  {typeof d.battery === 'number' && <span className="text-[var(--color-textSecondary)]">battery {d.battery}%</span>}
                  {typeof d.signal === 'number' && <span className="text-[var(--color-textSecondary)]">signal {d.signal}</span>}
                  <span className="text-[var(--color-textSecondary)]">
                    {d.last_heartbeat_at
                      ? `heartbeat ${new Date(d.last_heartbeat_at).toLocaleString()}`
                      : d.last_seen_at ? `last seen ${new Date(d.last_seen_at).toLocaleString()}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-textSecondary)] text-sm">Total Contacts</p>
              <p className="text-3xl font-bold">{stats.totalContacts}</p>
            </div>
            <div className="bg-[var(--color-primary-light)] p-3 rounded-full">
              <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-textSecondary)] text-sm">Total Groups</p>
              <p className="text-3xl font-bold">{stats.totalGroups}</p>
            </div>
            <div className="bg-[var(--color-success-light)] p-3 rounded-full">
              <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-textSecondary)] text-sm">Messages Sent</p>
              <p className="text-3xl font-bold">{stats.totalSent}</p>
            </div>
            <div className="bg-[var(--color-accent-light)] p-3 rounded-full">
              <svg className="w-6 h-6 text-[var(--color-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-textSecondary)] text-sm">Delivery Rate</p>
              <p className="text-3xl font-bold">{stats.deliveryRate}%</p>
            </div>
            <div className="bg-[var(--color-warning-light)] p-3 rounded-full">
              <svg className="w-6 h-6 text-[var(--color-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link to="/dashboard/sms/contacts" className="flex items-center p-4 bg-[var(--color-primary-light)] rounded-lg hover:bg-[var(--color-primary-light)] transition">
              <svg className="w-6 h-6 text-[var(--color-primary)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Manage Contacts</span>
            </Link>
            <Link to="/dashboard/sms/groups" className="flex items-center p-4 bg-[var(--color-success-light)] rounded-lg hover:bg-[var(--color-success-light)] transition">
              <svg className="w-6 h-6 text-[var(--color-success)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-medium">Manage Groups</span>
            </Link>
            <Link to="/dashboard/sms" className="flex items-center p-4 bg-[var(--color-accent-light)] rounded-lg hover:bg-[var(--color-accent-light)] transition">
              <svg className="w-6 h-6 text-[var(--color-accent)] mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span className="font-medium">Send Message</span>
            </Link>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Messages</h2>
          {recentActivity.length === 0 ? (
            <p className="text-[var(--color-textSecondary)]">No recent messages</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((message, index) => (
                <div key={message.id || index} className="flex items-center p-3 bg-[var(--color-background)] rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{message.recipient_phone || 'SMS'}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">
                      {message.status || 'sent'}{message.created_at ? ` — ${new Date(message.created_at).toLocaleString()}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SMSDashboard;
