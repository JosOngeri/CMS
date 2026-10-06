/**
 * SMS Outbox (route: /dashboard/sms/outbox).
 *
 * Per-recipient delivery ledger backed by GET /sms/deliveries — the durable
 * truth for queued/accepted/sent/delivered/failed states. Filter by status,
 * drill into a batch by clicking its batch id.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

const STATUS_STYLES = {
  queued:    'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  accepted:  'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  sent:      'bg-[var(--color-info-light,var(--color-primary-light))] text-[var(--color-info,var(--color-primary))]',
  delivered: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  failed:    'bg-[var(--color-error-light)] text-[var(--color-error)]',
};

const STATUSES = ['queued', 'accepted', 'sent', 'delivered', 'failed'];
const PAGE_SIZE = 50;

const Outbox = () => {
  const { api } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [batchId, setBatchId] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDeliveries = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (status) params.set('status', status);
      if (batchId) params.set('batchId', batchId);
      const res = await api.get(`/sms/deliveries?${params}`);
      const data = res.data?.data || res.data;
      setDeliveries(data.deliveries || []);
      setTotal(data.total || 0);
    } catch (e) {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [api, page, status, batchId]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(fetchDeliveries, 15000);
    return () => clearInterval(t);
  }, [fetchDeliveries, autoRefresh]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold">Outbox</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={e => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (15s)
        </label>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 border rounded"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <form
          onSubmit={e => { e.preventDefault(); setBatchId(batchInput.trim()); setPage(1); }}
          className="flex gap-2 flex-1"
        >
          <input
            type="text"
            placeholder="Filter by batch ID…"
            value={batchInput}
            onChange={e => setBatchInput(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
          />
          {batchId && (
            <button
              type="button"
              onClick={() => { setBatchId(''); setBatchInput(''); }}
              className="px-3 py-2 border rounded text-sm"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[var(--color-background)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Batch</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Recipient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Message</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Gateway</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Queued</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase">Delivered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {deliveries.map(d => (
              <tr key={d.id} className="hover:bg-[var(--color-background)]">
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setBatchId(d.batch_id); setBatchInput(d.batch_id); setPage(1); }}
                    className="text-xs font-mono text-[var(--color-primary)] hover:underline"
                    title={d.batch_id}
                  >
                    {String(d.batch_id).slice(0, 8)}…
                  </button>
                </td>
                <td className="px-4 py-3 text-sm">{d.recipient}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate" title={d.message_preview}>
                  {d.message_preview || '—'}
                </td>
                <td className="px-4 py-3 text-sm">{d.gateway}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_STYLES[d.status] || ''}`}>
                    {d.status}
                  </span>
                  {d.error && <p className="text-xs text-[var(--color-error)] mt-1">{d.error}</p>}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-textSecondary)]">
                  {d.queued_at ? new Date(d.queued_at).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-textSecondary)]">
                  {d.delivered_at ? new Date(d.delivered_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {!loading && deliveries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-[var(--color-textSecondary)]">
                  No deliveries{batchId ? ' in this batch' : ''}{status ? ` with status "${status}"` : ''}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-[var(--color-textSecondary)]">
          {total} deliveries — page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Outbox;
