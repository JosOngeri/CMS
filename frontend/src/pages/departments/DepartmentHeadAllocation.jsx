/**
 * WHAT THIS FILE DOES
 * -------------------
 * Admin page (route: /dashboard/departments/head-allocation) for appointing
 * department leaders — head, acting head, assistant, secretary — either
 * permanently or temporarily (temporary grants expire on a chosen date).
 * If a position is already filled, appointing creates a handover that the
 * incoming leader must accept.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /departments                    → department list
 * - backend /users                          → people to appoint
 * - backend /departments/:id/leadership     → current holders, appoint, revoke
 * - backend /departments/:id/handovers      → pending handovers per dept
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { FullPageLoading } from '../../components/common/Loading';
import { Building, User, Search, Clock, UserPlus, XCircle } from 'lucide-react';

const POSITION_LABELS = {
  head: 'Head',
  acting_head: 'Acting Head',
  assistant: 'Assistant',
  secretary: 'Secretary',
  subcommittee_head: 'Subcommittee Head',
};

const DepartmentHeadAllocation = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [leadership, setLeadership] = useState({});   // deptId -> rows
  const [handovers, setHandovers] = useState({});     // deptId -> rows
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // drafts: deptId -> { position, user_id, allocation_type, end_date }
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [deptRes, userRes] = await Promise.all([
        api.get('/departments'),
        api.get('/users'),
      ]);
      const depts = deptRes.data.departments || [];
      setDepartments(depts);
      setUsers(userRes.data.users || []);

      const [leadershipMap, handoverMap] = [{}, {}];
      await Promise.all(depts.map(async (d) => {
        try {
          const [lr, hr] = await Promise.all([
            api.get(`/departments/${d.id}/leadership`),
            api.get(`/departments/${d.id}/handovers`),
          ]);
          leadershipMap[d.id] = lr.data.data || [];
          handoverMap[d.id] = hr.data.data || [];
        } catch {
          leadershipMap[d.id] = [];
          handoverMap[d.id] = [];
        }
      }));
      setLeadership(leadershipMap);
      setHandovers(handoverMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const setDraft = (deptId, patch) =>
    setDrafts((prev) => ({
      ...prev,
      [deptId]: { position: 'head', user_id: '', allocation_type: 'permanent', end_date: '', ...prev[deptId], ...patch },
    }));

  const handleAppoint = async (departmentId) => {
    const draft = drafts[departmentId] || {};
    if (!draft.user_id) {
      toast.error('Pick a person first');
      return;
    }
    try {
      const res = await api.post(`/departments/${departmentId}/leadership`, {
        user_id: draft.user_id,
        position: draft.position || 'head',
        allocation_type: draft.allocation_type || 'permanent',
        end_date: draft.allocation_type === 'temporary' ? (draft.end_date || null) : null,
      });
      if (res.data.handover) {
        toast.success('Handover created — the incoming leader must accept it');
      } else {
        toast.success('Leader appointed');
      }
      setDrafts((prev) => ({ ...prev, [departmentId]: { position: draft.position, user_id: '', allocation_type: 'permanent', end_date: '' } }));
      loadData();
    } catch (error) {
      console.error('Error appointing leader:', error);
      toast.error(error.response?.data?.error || 'Failed to appoint leader');
    }
  };

  const handleRevoke = async (departmentId, leadershipId) => {
    if (!window.confirm('Revoke this appointment?')) return;
    try {
      await api.delete(`/departments/${departmentId}/leadership/${leadershipId}`);
      toast.success('Appointment revoked');
      loadData();
    } catch (error) {
      toast.error('Failed to revoke appointment');
    }
  };

  const filteredUsers = users.filter((u) =>
    `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingHandover = (deptId) =>
    (handovers[deptId] || []).find((h) => h.status === 'pending' || h.status === 'accepted');

  const activeFor = (deptId, position) =>
    (leadership[deptId] || []).filter((l) => l.is_active && l.position === position && !l.subcommittee_id);

  if (loading) {
    return <FullPageLoading message="Loading department leadership..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Department Leadership</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Appoint heads, assistants and secretaries — permanent or temporary
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-textSecondary)]" />
            <input
              type="text"
              placeholder="Search users by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          {departments.map((department) => {
            const draft = drafts[department.id] || { position: 'head', user_id: '', allocation_type: 'permanent', end_date: '' };
            const pending = pendingHandover(department.id);
            const heads = [
              ...activeFor(department.id, 'head'),
              ...activeFor(department.id, 'acting_head'),
            ];
            const others = ['assistant', 'secretary'].flatMap((p) => activeFor(department.id, p));

            return (
              <div key={department.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-[var(--color-primary-light)] shrink-0">
                    <Building className="w-6 h-6 text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--color-text)]">{department.name}</h3>
                        <p className="text-sm text-[var(--color-textSecondary)]">{department.category || 'Uncategorized'}</p>
                      </div>
                      {pending && (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[var(--color-warning-light)] text-[var(--color-warning)]">
                          <Clock className="w-3 h-3" />
                          Handover {pending.status}: {pending.incoming_name}
                        </span>
                      )}
                    </div>

                    {/* Current holders */}
                    <div className="space-y-1">
                      {[...heads, ...others].length === 0 && (
                        <p className="text-sm text-[var(--color-textSecondary)]">No leaders appointed</p>
                      )}
                      {[...heads, ...others].map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-[var(--color-text)]">
                            <User className="w-4 h-4 text-[var(--color-textSecondary)]" />
                            {l.user_name}
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-background)] text-[var(--color-textSecondary)]">
                              {POSITION_LABELS[l.position] || l.position}
                              {l.end_date ? ` · until ${new Date(l.end_date).toLocaleDateString()}` : ''}
                            </span>
                          </span>
                          <button
                            onClick={() => handleRevoke(department.id, l.id)}
                            className="text-[var(--color-error)] hover:text-[var(--color-error)]"
                            title="Revoke"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Appointment row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1">
                      <select
                        value={draft.position}
                        onChange={(e) => setDraft(department.id, { position: e.target.value })}
                        className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                      >
                        <option value="head">Head</option>
                        <option value="acting_head">Acting Head</option>
                        <option value="assistant">Assistant</option>
                        <option value="secretary">Secretary</option>
                      </select>
                      <select
                        value={draft.user_id}
                        onChange={(e) => setDraft(department.id, { user_id: e.target.value })}
                        className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm sm:col-span-2"
                      >
                        <option value="">Select person…</option>
                        {filteredUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.username || u.email})
                          </option>
                        ))}
                      </select>
                      <select
                        value={draft.allocation_type}
                        onChange={(e) => setDraft(department.id, { allocation_type: e.target.value })}
                        className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                      >
                        <option value="permanent">Permanent</option>
                        <option value="temporary">Temporary</option>
                      </select>
                      <div className="flex gap-2">
                        {draft.allocation_type === 'temporary' && (
                          <input
                            type="date"
                            value={draft.end_date}
                            onChange={(e) => setDraft(department.id, { end_date: e.target.value })}
                            className="px-2 py-2 border border-[var(--color-border)] rounded-lg text-sm flex-1"
                          />
                        )}
                        <button
                          onClick={() => handleAppoint(department.id)}
                          className="flex items-center gap-1 px-3 py-2 text-sm bg-[var(--color-success)] text-white rounded-lg hover:opacity-90"
                        >
                          <UserPlus className="w-4 h-4" />
                          Appoint
                        </button>
                      </div>
                    </div>
                    {draft.allocation_type === 'temporary' && (
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Temporary access expires automatically on the chosen date.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {departments.length === 0 && (
          <div className="p-12 text-center">
            <Building className="w-12 h-12 text-[var(--color-textSecondary)] mx-auto mb-4" />
            <p className="text-[var(--color-textSecondary)]">No departments found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentHeadAllocation;
