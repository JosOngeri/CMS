/**
 * Unified SMS send screen (route: /dashboard/sms/send).
 *
 * Recipients can come from three sources — individual contacts, groups, or
 * pasted numbers — merged and deduplicated before a single POST /sms/send.
 * The gateway card at top reflects live relay presence so the sender knows
 * whether the message will ride the JOSms phone or the bulk fallback.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

const E164 = /^\+[1-9]\d{1,14}$/;
const MAX_LEN = 160;

// Best-effort Kenyan normalization for pasted numbers — lets a user paste
// "0712…" or "712…" lists without editing each line.
const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return E164.test(digits) ? digits : null;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.length === 9) return `+254${digits}`;
  return digits.length >= 10 ? `+${digits}` : null;
};

const Send = () => {
  const { api } = useAuth();
  const toast = useToast();

  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [gateway, setGateway] = useState(null);

  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [pasted, setPasted] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const [message, setMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [groupPhones, setGroupPhones] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [c, g, t, gw] = await Promise.all([
          api.get('/sms-contacts'),
          api.get('/sms-groups'),
          api.get('/sms/templates'),
          api.get('/sms/gateway-status').catch(() => null),
        ]);
        setContacts(c.data?.data?.contacts || c.data?.contacts || []);
        setGroups(g.data?.data?.groups || g.data?.groups || []);
        setTemplates(t.data?.data?.templates || t.data?.templates || []);
        setGateway(gw?.data?.data || null);
      } catch (e) {
        toast.error('Failed to load send form data');
      }
    };
    load();
  }, [api]);

  // Resolve group selections to phone numbers lazily.
  useEffect(() => {
    const fetchMembers = async () => {
      if (selectedGroups.size === 0) { setGroupPhones([]); return; }
      const all = [];
      for (const gid of selectedGroups) {
        try {
          const res = await api.get(`/sms-groups/${gid}/members`);
          const members = res.data?.data?.contacts || res.data?.contacts || [];
          members.forEach(m => m.phone && all.push(m.phone));
        } catch (e) { /* group may be empty */ }
      }
      setGroupPhones(all);
    };
    fetchMembers();
  }, [selectedGroups, api]);

  const pastedPhones = useMemo(
    () => pasted.split(/[\n,;]+/).map(normalizePhone).filter(Boolean),
    [pasted]
  );
  const invalidPasted = useMemo(
    () => pasted.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
      .filter(s => !normalizePhone(s)),
    [pasted]
  );

  const allRecipients = useMemo(() => {
    const set = new Set([
      ...contacts.filter(c => selectedContacts.has(c.id)).map(c => normalizePhone(c.phone)).filter(Boolean),
      ...groupPhones.map(normalizePhone).filter(Boolean),
      ...pastedPhones,
    ]);
    return Array.from(set);
  }, [contacts, selectedContacts, groupPhones, pastedPhones]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q)
    );
  }, [contacts, contactSearch]);

  const canSend = allRecipients.length > 0 && message.length > 0 && message.length <= MAX_LEN;

  const toggle = (set, setter, id) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const doSend = async () => {
    setConfirming(false);
    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/sms/send', {
        recipients: allRecipients,
        message,
        scheduleDate: scheduleDate || undefined,
        scheduleTime: scheduleTime || undefined,
      });
      const data = res.data?.data || res.data;
      setResult(data);
      toast.success(
        data.status === 'scheduled'
          ? `Scheduled to ${data.totalRecipients} recipients`
          : `Dispatched ${data.totalRecipients} recipients in ${data.batchCount} batch(es)`
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const gatewayOnline = gateway?.online === true;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Send SMS</h1>

      {/* Readiness banner */}
      <div className={`mb-6 p-4 rounded-lg border ${gatewayOnline
        ? 'bg-[var(--color-success-light)] border-[var(--color-success)]'
        : 'bg-[var(--color-warning-light)] border-[var(--color-warning)]'}`}>
        {gateway === null ? (
          <p className="text-sm">Checking gateway…</p>
        ) : gatewayOnline ? (
          <p className="text-sm">
            <span className="font-semibold">JOSms gateway online</span>
            {gateway.devices?.[0]?.label ? ` — ${gateway.devices[0].label}` : ''}
            {typeof gateway.devices?.[0]?.battery === 'number' ? ` (${gateway.devices[0].battery}% battery)` : ''}
            . Messages will send through the church phone.
          </p>
        ) : (
          <p className="text-sm">
            <span className="font-semibold">No phone gateway connected.</span>{' '}
            Sends will fall back to a bulk provider if one is configured —
            otherwise they will fail rather than pretend to queue.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipients */}
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold">Recipients</h2>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Contacts ({selectedContacts.size} selected)</label>
              <input
                type="text"
                placeholder="Search…"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="px-2 py-1 text-sm border rounded w-40"
              />
            </div>
            <div className="max-h-40 overflow-y-auto border rounded divide-y divide-[var(--color-border)]">
              {filteredContacts.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--color-background)]">
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(c.id)}
                    onChange={() => toggle(selectedContacts, setSelectedContacts, c.id)}
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-[var(--color-textSecondary)]">{c.phone}</span>
                </label>
              ))}
              {filteredContacts.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-textSecondary)]">No contacts</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Groups ({selectedGroups.size} selected)</label>
            <div className="max-h-32 overflow-y-auto border rounded divide-y divide-[var(--color-border)]">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[var(--color-background)]">
                  <input
                    type="checkbox"
                    checked={selectedGroups.has(g.id)}
                    onChange={() => toggle(selectedGroups, setSelectedGroups, g.id)}
                  />
                  {g.name}
                </label>
              ))}
              {groups.length === 0 && (
                <p className="px-3 py-2 text-sm text-[var(--color-textSecondary)]">No groups</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Paste numbers (one per line, or comma separated)</label>
            <textarea
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              rows={3}
              placeholder="0712345678&#10;+254798765432"
              className="w-full px-3 py-2 border rounded text-sm font-mono"
            />
            {invalidPasted.length > 0 && (
              <p className="text-xs text-[var(--color-warning)] mt-1">
                {invalidPasted.length} line(s) skipped — not valid phone numbers
              </p>
            )}
          </div>

          <p className="text-sm font-medium">
            Total recipients: {allRecipients.length}
          </p>
        </div>

        {/* Message */}
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-6 space-y-5">
          <h2 className="text-lg font-semibold">Message</h2>

          {templates.length > 0 && (
            <select
              className="w-full px-3 py-2 border rounded text-sm"
              defaultValue=""
              onChange={e => {
                const t = templates.find(t => String(t.id) === e.target.value);
                if (t) setMessage(t.content || '');
              }}
            >
              <option value="">Start from a template…</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}

          <div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              maxLength={MAX_LEN}
              placeholder="Type your message…"
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex justify-between text-xs text-[var(--color-textSecondary)] mt-1">
              <span>{message.length}/{MAX_LEN} characters</span>
              <span>1 SMS segment</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Schedule date (optional)</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Schedule time</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>
          </div>

          {result && (
            <div className="p-3 rounded bg-[var(--color-background)] text-sm space-y-1">
              <p className="font-medium">Result: {result.status}</p>
              {result.batches?.map((b, i) => (
                <p key={i}>
                  Batch {i + 1}: {b.recipientCount} recipients — {b.status}
                  {b.gateway ? ` via ${b.gateway}` : ''}{b.error ? ` (${b.error})` : ''}
                </p>
              ))}
              {result.optedOutCount > 0 && (
                <p className="text-[var(--color-warning)]">{result.optedOutCount} recipient(s) skipped (opted out)</p>
              )}
            </div>
          )}

          <button
            onClick={() => setConfirming(true)}
            disabled={!canSend || sending}
            className="w-full px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : `Send to ${allRecipients.length} recipient(s)`}
          </button>
          <p className="text-xs text-[var(--color-textSecondary)]">
            View delivery progress in <Link to="/dashboard/sms/outbox" className="text-[var(--color-primary)] underline">Outbox</Link>.
          </p>
        </div>
      </div>

      {/* Confirm dialog */}
      {confirming && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm send</h2>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="font-medium">Recipients:</span> {allRecipients.length}</p>
              <p><span className="font-medium">Message:</span> {message.length} chars</p>
              <p><span className="font-medium">Route:</span> {gatewayOnline ? 'JOSms phone gateway' : 'bulk provider fallback'}</p>
              {scheduleDate && <p><span className="font-medium">Scheduled:</span> {scheduleDate} {scheduleTime}</p>}
              <p className="text-[var(--color-textSecondary)] border-t border-[var(--color-border)] pt-2 mt-2">
                {message}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 border rounded hover:bg-[var(--color-background)]"
              >
                Cancel
              </button>
              <button
                onClick={doSend}
                className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90"
              >
                Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Send;
