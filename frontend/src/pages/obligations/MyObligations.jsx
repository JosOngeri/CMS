import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, CheckCircle, Clock, Building2, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Breadcrumb from '../../components/common/Breadcrumb';

const statusChip = (status) => {
  const map = {
    fulfilled: 'bg-green-100 text-green-700',
    partial: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-red-100 text-red-700',
    waived: 'bg-gray-100 text-gray-500',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

const MyObligations = () => {
  const { user, api } = useAuth();
  const toast = useToast();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null); // obligation being paid
  const [payForm, setPayForm] = useState({ phoneNumber: '', amount: '' });
  const [payBusy, setPayBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/departments/me/obligations');
      setObligations(r.data.data?.obligations || []);
    } catch {
      toast.error('Failed to load obligations');
    } finally {
      setLoading(false);
    }
  }, [api, toast]);

  useEffect(() => { load(); }, [load]);

  const openPay = (o) => {
    const phone = (user?.phone_number || user?.phone || '').replace(/^0/, '254');
    setPayForm({ phoneNumber: phone, amount: String(Math.max(0, o.amount - o.paid_amount)) });
    setPaying(o);
  };

  const submitPay = async () => {
    setPayBusy(true);
    try {
      await api.post('/payment/initiate', {
        amount: parseFloat(payForm.amount),
        phoneNumber: payForm.phoneNumber,
        category: `${paying.department_name} contribution`,
        description: paying.purpose || `${paying.department_name} obligation`,
        obligationId: paying.id,
      });
      toast.success('M-Pesa prompt sent to your phone');
      setPaying(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Payment failed');
    } finally { setPayBusy(false); }
  };

  const outstanding = obligations.filter((o) => o.status !== 'fulfilled');
  const totalDue = outstanding
    .filter((o) => o.obligation_type === 'target')
    .reduce((s, o) => s + (Number(o.amount) - Number(o.paid_amount)), 0);

  if (loading) return <div className="flex justify-center py-16"><Loader className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>;

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">My Obligations</h1>
        <p className="text-sm text-[var(--color-textSecondary)]">Department contributions assigned to you</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-4">
          <p className="text-xs text-[var(--color-textSecondary)]">Outstanding (required)</p>
          <p className="text-xl font-bold text-red-600">KES {totalDue.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-4">
          <p className="text-xs text-[var(--color-textSecondary)]">Open obligations</p>
          <p className="text-xl font-bold text-[var(--color-text)]">{outstanding.length}</p>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-[var(--color-textSecondary)]">Fulfilled</p>
          <p className="text-xl font-bold text-green-600">{obligations.filter((o) => o.status === 'fulfilled').length}</p>
        </div>
      </div>

      {obligations.length === 0 ? (
        <div className="bg-[var(--color-surface)] rounded-lg shadow p-10 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
          <p className="text-[var(--color-text)] font-medium">No obligations</p>
          <p className="text-sm text-[var(--color-textSecondary)]">When a department allocates a budget to you, it appears here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {obligations.map((o) => {
            const pct = o.amount > 0 ? Math.min(100, Math.round((o.paid_amount / o.amount) * 100)) : 0;
            return (
              <div key={o.id} className="bg-[var(--color-surface)] rounded-lg shadow p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-[var(--color-textSecondary)] flex-shrink-0" />
                      <p className="font-medium text-[var(--color-text)]">{o.department_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusChip(o.status)}`}>{o.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.obligation_type === 'target' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        {o.obligation_type === 'target' ? 'Required' : 'Voluntary'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-textSecondary)] mt-1">{o.purpose || 'Department budget'}</p>
                    {o.due_date && (
                      <p className="text-xs text-[var(--color-textSecondary)] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {new Date(o.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-[var(--color-text)]">
                      KES {Number(o.paid_amount).toLocaleString()}
                      <span className="text-[var(--color-textSecondary)] font-normal"> / {Number(o.amount).toLocaleString()}</span>
                    </p>
                    {o.status !== 'fulfilled' && (
                      <button
                        onClick={() => openPay(o)}
                        className="mt-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white">
                        Pay
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 h-2 bg-[var(--color-background)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-[var(--color-primary)]'}`}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {outstanding.some((o) => o.obligation_type === 'target') && (
        <div className="flex items-start gap-2 text-sm text-[var(--color-textSecondary)] bg-[var(--color-surface)] rounded-lg p-4">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Required obligations are tracked by your department head. Pay via M-Pesa or hand cash to your
          department's designated collector who can reconcile the payment for you.
        </div>
      )}

      {/* Pay sheet — bottom sheet on mobile */}
      {paying && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setPaying(null)}>
          <div className="bg-[var(--color-surface)] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-[var(--color-text)]">Pay — {paying.department_name}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">{paying.purpose || 'Department obligation'}</p>
            <div>
              <label className="text-xs text-[var(--color-textSecondary)]">M-Pesa phone (254…)</label>
              <input value={payForm.phoneNumber} onChange={(e) => setPayForm({ ...payForm, phoneNumber: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            </div>
            <div>
              <label className="text-xs text-[var(--color-textSecondary)]">Amount (KES)</label>
              <input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPaying(null)} className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm">Cancel</button>
              <button onClick={submitPay} disabled={payBusy || !payForm.phoneNumber || !(payForm.amount > 0)}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-50">
                {payBusy ? 'Sending…' : 'Send M-Pesa Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyObligations;
