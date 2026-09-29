import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, Users, CheckCircle, TrendingUp, Smartphone,
  Link2, Sparkles, AlertCircle, X, Loader, Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

/**
 * Department Collections tab — budgets, obligations, milestone tracker,
 * SMS reconciliations ledger, and AI parser setup.
 * props: departmentId, canManage (bool), api from useAuth
 */
const DepartmentCollections = ({ departmentId, canManage }) => {
  const { api } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ budgets: [], members: null });
  const [recons, setRecons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPropose, setShowPropose] = useState(false);
  const [allocating, setAllocating] = useState(null); // budget id
  const [showParser, setShowParser] = useState(false);
  const [sampleSms, setSampleSms] = useState('');
  const [parserResult, setParserResult] = useState(null);
  const [form, setForm] = useState({ purpose: '', target_amount: '', collection_deadline: '', obligation_type: 'target' });
  const [allocForm, setAllocForm] = useState({ mode: 'equal', obligation_type: 'target', due_date: '' });
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(null); // reconciliation row
  const [assignTarget, setAssignTarget] = useState('');
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({ tx_code: '', amount: '', payer_name: '', payer_phone: '' });

  const load = useCallback(async () => {
    if (!departmentId) return;
    try {
      const [col, rec] = await Promise.all([
        api.get(`/departments/${departmentId}/collections`),
        api.get(`/departments/${departmentId}/reconciliations`).catch(() => ({ data: { data: { reconciliations: [] } } })),
      ]);
      setData(col.data.data || { budgets: [] });
      setRecons(rec.data.data?.reconciliations || []);
    } catch {
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [api, departmentId, toast]);

  useEffect(() => { load(); }, [load]);

  const proposeBudget = async () => {
    setBusy(true);
    try {
      await api.post(`/departments/${departmentId}/budgets`, {
        ...form, target_amount: parseFloat(form.target_amount),
      });
      toast.success('Budget submitted for approval');
      setShowPropose(false);
      setForm({ purpose: '', target_amount: '', collection_deadline: '', obligation_type: 'target' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to propose budget');
    } finally { setBusy(false); }
  };

  const allocate = async (budgetId) => {
    setBusy(true);
    try {
      await api.post(`/departments/${departmentId}/budgets/${budgetId}/allocate`, allocForm);
      toast.success(allocForm.mode === 'voluntary' ? 'Voluntary pool opened' : 'Obligations created — members notified');
      setAllocating(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Allocation failed');
    } finally { setBusy(false); }
  };

  const waive = async (oid) => {
    try {
      await api.put(`/departments/${departmentId}/obligations/${oid}/waive`);
      toast.success('Obligation waived');
      load();
    } catch { toast.error('Failed to waive'); }
  };

  const calibrate = async () => {
    setBusy(true);
    setParserResult(null);
    try {
      const r = await api.post(`/departments/${departmentId}/parser/calibrate`, { sample_sms: sampleSms });
      setParserResult(r.data.data);
      toast.success('Parser calibrated — review the extraction below');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Calibration failed');
    } finally { setBusy(false); }
  };

  const activateProfile = async (pid) => {
    try {
      await api.post(`/departments/${departmentId}/parser/profiles/${pid}/activate`);
      toast.success('Parser profile activated');
    } catch { toast.error('Activation failed'); }
  };

  const assignRecon = async () => {
    if (!assignTarget) return;
    setBusy(true);
    try {
      const body = assignTarget.startsWith('budget:')
        ? { budget_id: assignTarget.slice(7) }
        : { obligation_id: assignTarget };
      await api.put(`/departments/${departmentId}/reconciliations/${assigning.id}/assign`, body);
      toast.success('Transaction assigned');
      setAssigning(null);
      setAssignTarget('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to assign');
    } finally { setBusy(false); }
  };

  const addTransaction = async () => {
    setBusy(true);
    try {
      await api.post(`/departments/${departmentId}/reconciliations`, {
        tx_code: txForm.tx_code.trim(),
        amount: parseFloat(txForm.amount),
        payer_name: txForm.payer_name.trim() || null,
        payer_phone: txForm.payer_phone.trim() || null,
      });
      toast.success('Transaction recorded — assign it to an obligation below');
      setShowAddTx(false);
      setTxForm({ tx_code: '', amount: '', payer_name: '', payer_phone: '' });
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to record transaction');
    } finally { setBusy(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>;

  const budgets = data.budgets || [];
  const unassigned = recons.filter((r) => r.status === 'unassigned');
  const reconciled = recons.filter((r) => r.status !== 'unassigned');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Collections & Budgets</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">Department budgets, member obligations, and M-Pesa reconciliation</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowParser(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]">
              <Sparkles className="w-4 h-4" /> Parser Setup
            </button>
            <button onClick={() => setShowPropose(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm">
              <Plus className="w-4 h-4" /> Propose Budget
            </button>
          </div>
        )}
      </div>

      {/* Budget cards with milestones */}
      {budgets.length === 0 && (
        <div className="bg-[var(--color-surface)] rounded-lg p-8 text-center text-[var(--color-textSecondary)]">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-50" />
          No budgets yet{canManage && ' — propose one to start collecting'}.
        </div>
      )}
      {budgets.map((b) => (
        <div key={b.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[var(--color-text)]">{b.purpose || 'Department Budget'}</h3>
              <p className="text-xs text-[var(--color-textSecondary)]">
                {b.obligation_type === 'target' ? 'Required obligations' : 'Voluntary contributions'}
                {b.collection_deadline && ` · due ${b.collection_deadline}`}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${b.status === 'active' ? 'bg-green-100 text-green-700' : b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
              {b.status}
            </span>
          </div>

          {/* Progress + milestones */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-[var(--color-text)]">KES {Number(b.collected).toLocaleString()}</span>
              <span className="text-[var(--color-textSecondary)]">of KES {Number(b.target_amount || 0).toLocaleString()} ({b.percent}%)</span>
            </div>
            <div className="h-3 bg-[var(--color-background)] rounded-full overflow-hidden relative">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${b.percent}%` }} />
              {[25, 50, 75].map((m) => (
                <div key={m} className="absolute top-0 bottom-0 w-px bg-[var(--color-surface)]" style={{ left: `${m}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {b.milestones.map((m) => (
                <span key={m.percent} className={`text-xs flex items-center gap-1 ${m.reached ? 'text-green-600 font-medium' : 'text-[var(--color-textSecondary)]'}`}>
                  {m.reached && <CheckCircle className="w-3 h-3" />}{m.percent}%
                </span>
              ))}
            </div>
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">
              {b.fulfilled_count || 0}/{b.member_count || 0} members fulfilled
            </p>
          </div>

          {/* Allocate */}
          {canManage && b.status === 'active' && (
            <div>
              {allocating === b.id ? (
                <div className="border border-[var(--color-border)] rounded-lg p-4 space-y-3 bg-[var(--color-background)]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-[var(--color-text)]">Allocate to members</h4>
                    <button onClick={() => setAllocating(null)}><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select value={allocForm.mode} onChange={(e) => setAllocForm({ ...allocForm, mode: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]">
                      <option value="equal">Equal split (all members)</option>
                      <option value="voluntary">Voluntary pool (no per-member)</option>
                    </select>
                    <select value={allocForm.obligation_type} onChange={(e) => setAllocForm({ ...allocForm, obligation_type: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]">
                      <option value="target">Target (required)</option>
                      <option value="voluntary">Voluntary (suggested)</option>
                    </select>
                    <input type="date" value={allocForm.due_date} onChange={(e) => setAllocForm({ ...allocForm, due_date: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]" />
                  </div>
                  <button onClick={() => allocate(b.id)} disabled={busy}
                    className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
                    {busy ? 'Allocating…' : 'Allocate & Notify Members'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setAllocating(b.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]">
                  <Users className="w-4 h-4" /> Allocate to Members
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Per-member breakdown (leaders) */}
      {data.members && (
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 sm:p-6">
          <h3 className="font-semibold text-[var(--color-text)] mb-3">Member Obligations</h3>
          <div className="divide-y divide-[var(--color-border)]">
            {data.members.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">{m.first_name} {m.last_name}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{m.obligation_type}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[var(--color-text)]">KES {Number(m.paid_amount).toLocaleString()} / {Number(m.amount).toLocaleString()}</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      m.status === 'fulfilled' ? 'bg-green-100 text-green-700'
                      : m.status === 'partial' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                    {m.status !== 'fulfilled' && m.status !== 'waived' && (
                      <button onClick={() => waive(m.id)} className="text-xs text-red-500 hover:underline">waive</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reconciliations ledger + unassigned queue */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> M-Pesa Reconciliations
          </h3>
          {canManage && (
            <button onClick={() => setShowAddTx(true)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surfaceHover)]">
              <Plus className="w-3 h-3" /> Record Transaction
            </button>
          )}
        </div>

        {/* Unassigned queue — needs a treasurer/head to assign */}
        {unassigned.length > 0 && (
          <div className="mb-4 border border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-400 flex items-center gap-1 mb-2">
              <Inbox className="w-3.5 h-3.5" /> {unassigned.length} unassigned — pick which obligation each pays
            </p>
            <div className="divide-y divide-yellow-200/60">
              {unassigned.map((r) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-mono text-[var(--color-text)]">{r.tx_code}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">
                      {r.payer_name || 'Unknown payer'}{r.payer_phone ? ` · ${r.payer_phone}` : ''} · via {r.reconciled_by_name || 'collector'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-medium text-[var(--color-text)]">KES {Number(r.amount).toLocaleString()}</p>
                    {canManage && (
                      <button onClick={() => { setAssigning(r); setAssignTarget(''); }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[var(--color-primary)] text-white">
                        Assign
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reconciled.length === 0 && unassigned.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No reconciled payments yet.</p>
        ) : reconciled.length > 0 && (
          <div className="divide-y divide-[var(--color-border)]">
            {reconciled.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-mono text-[var(--color-text)]">{r.tx_code}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {r.payer_name || 'Unknown payer'} · via {r.reconciled_by_name || 'collector'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-[var(--color-text)]">KES {Number(r.amount).toLocaleString()}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">reconciled</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign reconciliation modal */}
      {assigning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setAssigning(null)}>
          <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[var(--color-text)]">Assign KES {Number(assigning.amount).toLocaleString()} — {assigning.tx_code}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">
              {assigning.payer_name || 'Unknown payer'} · pick the obligation this payment settles, or add it to a budget pool.
            </p>
            <select value={assignTarget} onChange={(e) => setAssignTarget(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)]">
              <option value="">Select obligation or budget…</option>
              {(data.members || [])
                .filter((m) => m.status !== 'fulfilled' && m.status !== 'waived')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name} — balance KES {Number(m.amount - m.paid_amount).toLocaleString()}
                  </option>
                ))}
              {budgets.filter((b) => b.status === 'active').map((b) => (
                <option key={b.id} value={`budget:${b.id}`}>
                  Pool → {b.purpose || 'Budget'} (KES {Number(b.target_amount).toLocaleString()} target)
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAssigning(null)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm">Cancel</button>
              <button onClick={assignRecon} disabled={busy || !assignTarget}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
                {busy ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual transaction entry modal (bank deposit / cash transfer records) */}
      {showAddTx && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowAddTx(false)}>
          <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[var(--color-text)]">Record Transaction</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Manually log a bank deposit or M-Pesa payment. The transaction code must be unique — it prevents double-counting.
            </p>
            <input placeholder="Transaction code (e.g. QGH7X2K4LM)" value={txForm.tx_code}
              onChange={(e) => setTxForm({ ...txForm, tx_code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] font-mono" />
            <input placeholder="Amount (KES)" type="number" value={txForm.amount}
              onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <input placeholder="Payer name (optional)" value={txForm.payer_name}
              onChange={(e) => setTxForm({ ...txForm, payer_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <input placeholder="Payer phone (optional)" value={txForm.payer_phone}
              onChange={(e) => setTxForm({ ...txForm, payer_phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAddTx(false)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm">Cancel</button>
              <button onClick={addTransaction} disabled={busy || !txForm.tx_code || !txForm.amount}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
                {busy ? 'Recording…' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propose budget modal */}
      {showPropose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowPropose(false)}>
          <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[var(--color-text)]">Propose Department Budget</h3>
            <input placeholder="Purpose (e.g. Camp meeting funds)" value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <input placeholder="Target amount (KES)" type="number" value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <input type="date" value={form.collection_deadline}
              onChange={(e) => setForm({ ...form, collection_deadline: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            <select value={form.obligation_type} onChange={(e) => setForm({ ...form, obligation_type: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]">
              <option value="target">Target — members have required obligations</option>
              <option value="voluntary">Voluntary — suggested contributions</option>
            </select>
            <p className="text-xs text-[var(--color-textSecondary)]">Submits for approval — Pastor/First Elder/Treasurer approves before it activates.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPropose(false)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm">Cancel</button>
              <button onClick={proposeBudget} disabled={busy || !form.target_amount}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
                {busy ? 'Submitting…' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parser setup modal */}
      {showParser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowParser(false)}>
          <div className="bg-[var(--color-surface)] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              <h3 className="font-semibold text-[var(--color-text)]">M-Pesa Parser Setup</h3>
            </div>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Paste one real payment SMS. AI builds a parsing ruleset for this department's collections —
              names and numbers are masked before leaving the server.
            </p>
            <textarea rows={5} value={sampleSms} onChange={(e) => setSampleSms(e.target.value)}
              placeholder="e.g. QGH7X2K4LM Confirmed. You have received Ksh500.00 from …"
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] font-mono text-xs" />
            <button onClick={calibrate} disabled={busy || sampleSms.length < 20}
              className="w-full px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
              {busy ? 'Calibrating…' : 'Calibrate with AI'}
            </button>
            {parserResult && (
              <div className="border border-green-200 bg-green-50/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Extraction verified against your sample
                </p>
                <pre className="text-xs text-[var(--color-textSecondary)] overflow-x-auto">{JSON.stringify(parserResult.test_extraction, null, 2)}</pre>
                <button onClick={() => activateProfile(parserResult.profile.id)}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm">
                  Activate this parser
                </button>
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={() => setShowParser(false)} className="text-sm text-[var(--color-textSecondary)]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentCollections;
