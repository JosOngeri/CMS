/**
 * WHAT THIS FILE DOES
 * -------------------
 * Leadership handover page (route: /dashboard/departments/handovers).
 * Incoming leaders accept or decline a role; outgoing leaders complete a
 * checklist before the handover finishes. Managers also see temporary
 * access grants expiring soon, and can assign subcommittee leads.
 * Subcommittee leads can request budget spend approval here.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /departments/handovers/mine            → handovers involving me
 * - backend /departments/leadership/expiring       → expiring temp grants
 * - backend /departments/:id/subcommittees         → sub list + lead assign
 * - backend /departments/:id/subcommittees/:sid/spend → spend requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { ArrowRightLeft, CheckCircle2, XCircle, Clock, Users, Wallet, Send } from 'lucide-react';

const CHECKLIST_LABELS = {
  records: 'Records handed over',
  funds_assets: 'Funds & assets accounted for',
  pending_programs: 'Pending programs reviewed',
  keys_logins: 'Keys & logins transferred',
  member_roster: 'Member roster updated',
};

const DepartmentHandover = () => {
  const { api, user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subsByDept, setSubsByDept] = useState({});
  const [checklistDrafts, setChecklistDrafts] = useState({});
  const [spendDrafts, setSpendDrafts] = useState({}); // subId -> {amount, description}

  const isManager = (user?.roles || []).some((r) =>
    ['Super Admin', 'Pastor', 'First Elder'].includes(r)
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [mineRes, deptRes] = await Promise.all([
        api.get('/departments/handovers/mine'),
        api.get('/departments'),
      ]);
      setMine(mineRes.data.data || []);
      const depts = deptRes.data.departments || [];
      setDepartments(depts);

      if (isManager) {
        const ex = await api.get('/departments/leadership/expiring').catch(() => ({ data: { data: [] } }));
        setExpiring(ex.data.data || []);
      }

      const subs = {};
      await Promise.all(depts.map(async (d) => {
        try {
          const r = await api.get(`/departments/${d.id}/subcommittees`);
          subs[d.id] = r.data.data || [];
        } catch { subs[d.id] = []; }
      }));
      setSubsByDept(subs);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load handovers');
    } finally {
      setLoading(false);
    }
  }, [api, isManager, toast]);

  useEffect(() => { load(); }, [load]);

  const act = async (handoverId, action, body = {}) => {
    try {
      const res = await api.put(`/departments/handovers/${handoverId}/${action}`, body);
      if (res.data.checklist) {
        toast.error(res.data.error || 'Checklist incomplete');
      } else {
        toast.success(`Handover ${action === 'complete' ? 'completed' : action + 'ed'}`);
      }
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || `Failed to ${action} handover`);
    }
  };

  const submitSpend = async (deptId, subId) => {
    const d = spendDrafts[subId] || {};
    if (!d.amount || parseFloat(d.amount) <= 0) {
      toast.error('Enter an amount');
      return;
    }
    try {
      await api.post(`/departments/${deptId}/subcommittees/${subId}/spend`, d);
      toast.success('Spend request sent to the department head for approval');
      setSpendDrafts((p) => ({ ...p, [subId]: { amount: '', description: '' } }));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to submit spend request');
    }
  };

  const setLead = async (deptId, subId, userId) => {
    if (!userId) return;
    try {
      const res = await api.put(`/departments/${deptId}/subcommittees/${subId}`, { lead_user_id: userId });
      if (res.data.handover) {
        toast.success('Subcommittee handover created — incoming lead must accept');
      } else {
        toast.success('Subcommittee lead assigned');
      }
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to set lead');
    }
  };

  if (loading) return <FullPageLoading message="Loading handovers..." />;

  const deptHasSubs = departments.filter((d) => (subsByDept[d.id] || []).length > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Leadership Handovers</h1>
        <p className="text-sm text-[var(--color-textSecondary)]">
          Accept incoming roles, complete outgoing checklists, and manage subcommittee leads
        </p>
      </div>

      {/* My handovers */}
      <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="font-semibold text-[var(--color-text)]">My Handovers</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {mine.length === 0 && (
            <p className="p-6 text-sm text-[var(--color-textSecondary)]">No pending handovers involve you.</p>
          )}
          {mine.map((h) => {
            const isIncoming = h.incoming_user_id === user?.id;
            const isOutgoing = h.outgoing_user_id === user?.id;
            const checklist = { ...CHECKLIST_LABELS, ...(h.checklist || {}) };
            const draft = checklistDrafts[h.id] || {};
            return (
              <div key={h.id} className="p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {h.department_name}
                      {h.subcommittee_name ? ` — ${h.subcommittee_name}` : ''}
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)]">{h.status}</span>
                    </p>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      {h.outgoing_name || 'Vacant'} → {h.incoming_name} · {h.position.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isIncoming && h.status === 'pending' && (
                      <>
                        <button onClick={() => act(h.id, 'accept')} className="btn btn-primary btn-sm">Accept</button>
                        <button onClick={() => act(h.id, 'decline')} className="btn btn-secondary btn-sm">Decline</button>
                      </>
                    )}
                    {isManager && ['pending', 'accepted'].includes(h.status) && (
                      <button onClick={() => act(h.id, 'cancel')} className="btn btn-secondary btn-sm">Cancel</button>
                    )}
                  </div>
                </div>

                {/* Checklist — shown once accepted, for the outgoing leader */}
                {h.status === 'accepted' && (
                  <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">Handover checklist</p>
                    {Object.keys(CHECKLIST_LABELS).map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                        <input
                          type="checkbox"
                          disabled={!isOutgoing && !isManager}
                          checked={!!(draft[key] ?? h.checklist?.[key])}
                          onChange={(e) =>
                            setChecklistDrafts((p) => ({ ...p, [h.id]: { ...draft, ...h.checklist, [key]: e.target.checked } }))
                          }
                          className="rounded"
                        />
                        {CHECKLIST_LABELS[key]}
                      </label>
                    ))}
                    {(isOutgoing || isManager) && (
                      <button
                        onClick={() => act(h.id, 'complete', { checklist: { ...h.checklist, ...draft } })}
                        className="btn btn-primary btn-sm mt-2"
                      >
                        Complete handover
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Expiring temporary grants (managers) */}
      {isManager && (
        <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="font-semibold text-[var(--color-text)]">Temporary Access Expiring (30 days)</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {expiring.length === 0 && (
              <p className="p-6 text-sm text-[var(--color-textSecondary)]">No temporary grants expiring soon.</p>
            )}
            {expiring.map((l) => (
              <div key={l.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{l.user_name} — {l.position.replace('_', ' ')}</p>
                  <p className="text-xs text-[var(--color-textSecondary)]">{l.department_name}</p>
                </div>
                <span className="text-xs text-[var(--color-warning)]">{new Date(l.end_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Subcommittees — lead assignment + spend requests */}
      <section className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
        <div className="p-5 border-b border-[var(--color-border)] flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="font-semibold text-[var(--color-text)]">Subcommittees</h2>
        </div>
        {deptHasSubs.length === 0 && (
          <p className="p-6 text-sm text-[var(--color-textSecondary)]">No subcommittees yet.</p>
        )}
        {deptHasSubs.map((dept) => (
          <div key={dept.id} className="p-5 border-b border-[var(--color-border)] last:border-0">
            <p className="text-sm font-semibold text-[var(--color-text)] mb-3">{dept.name}</p>
            <div className="space-y-4">
              {subsByDept[dept.id].map((s) => {
                const spend = spendDrafts[s.id] || { amount: '', description: '' };
                const isSubLead = s.lead_user_id === user?.id;
                return (
                  <div key={s.id} className="rounded-lg border border-[var(--color-border)] p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-text)]">{s.name}</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Lead: {s.lead_name || 'Unassigned'} · {s.member_count} member{s.member_count === 1 ? '' : 's'}
                        </p>
                      </div>
                      {isManager && (
                        <LeadPicker
                          departmentId={dept.id}
                          api={api}
                          onPick={(uid) => setLead(dept.id, s.id, uid)}
                          current={s.lead_user_id}
                        />
                      )}
                    </div>

                    {/* Spend request — sub leads and dept managers */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Wallet className="w-4 h-4 text-[var(--color-textSecondary)]" />
                      <input
                        type="number" min="1" placeholder="Amount (KES)"
                        value={spend.amount}
                        onChange={(e) => setSpendDrafts((p) => ({ ...p, [s.id]: { ...spend, amount: e.target.value } }))}
                        className="w-32 px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
                      />
                      <input
                        type="text" placeholder="What for?"
                        value={spend.description}
                        onChange={(e) => setSpendDrafts((p) => ({ ...p, [s.id]: { ...spend, description: e.target.value } }))}
                        className="flex-1 min-w-[140px] px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
                      />
                      <button
                        onClick={() => submitSpend(dept.id, s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:opacity-90"
                      >
                        <Send className="w-3.5 h-3.5" /> Request approval
                      </button>
                    </div>
                    {(isSubLead || isManager) && (
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Spend posts to the subcommittee budget only after the department head approves.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

const LeadPicker = ({ departmentId, api, onPick, current }) => {
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    api.get(`/departments/${departmentId}/members`)
      .then((r) => setMembers(r.data.members || r.data.data || []))
      .catch(() => setMembers([]));
  }, [open, api, departmentId]);
  return (
    <div className="flex items-center gap-2">
      {open ? (
        <select
          autoFocus
          onChange={(e) => { onPick(e.target.value); setOpen(false); }}
          onBlur={() => setOpen(false)}
          className="px-2 py-1.5 border border-[var(--color-border)] rounded text-sm"
          defaultValue=""
        >
          <option value="">Pick lead…</option>
          {members.filter((m) => m.id !== current).map((m) => (
            <option key={m.id} value={m.id}>
              {`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || m.email}
            </option>
          ))}
        </select>
      ) : (
        <button onClick={() => setOpen(true)} className="btn btn-secondary btn-sm">
          {current ? 'Replace lead' : 'Assign lead'}
        </button>
      )}
    </div>
  );
};

export default DepartmentHandover;
