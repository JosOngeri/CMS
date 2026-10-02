/**
 * WHAT THIS FILE DOES
 * -------------------
 * "My Collections" — a member's contribution history: what they gave, which
 * fund it went to, and a running total. They can add a record of a cash or
 * in-kind contribution and download a simple statement.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /api/collections/my-collections → list of contributions
 * - backend /api/collections               → add a new contribution
 * - backend /api/collections/my-statement  → statement download
 * - AuthContext.jsx                        → current user + api client
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, PieChart, Plus, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const MyCollections = () => {
  const { user, api } = useAuth();
  const toast = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    fund: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections/my-collections');
      const list = response.data?.data?.collections ||
                   response.data?.collections ||
                   response.data?.data ||
                   [];
      setCollections(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/collections', formData);
      toast.success('Contribution recorded');
      setShowAddModal(false);
      setFormData({ amount: '', purpose: '', fund: '', date: new Date().toISOString().split('T')[0] });
      fetchCollections();
    } catch (error) {
      console.error('Failed to add collection:', error);
      toast.error('Could not save the contribution');
    }
  };

  const downloadStatement = async () => {
    try {
      const response = await api.get('/collections/my-statement', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${user.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Statement downloaded');
    } catch (error) {
      console.error('Failed to download statement:', error);
      toast.error('Could not download your statement');
    }
  };

  const filteredCollections = collections.filter(c => filter === 'all' || c.fund === filter);
  const totalCollected = collections.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const uniqueFunds = [...new Set(collections.map(c => c.fund).filter(Boolean))];

  useEffect(() => {
    fetchCollections();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-[var(--color-textSecondary)]">Loading your contributions...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Giving</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">Your contribution history</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Record a Gift
          </button>
          <button
            onClick={downloadStatement}
            className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Statement
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Given</p>
              <p className="text-2xl font-bold text-[var(--color-success)]">KES {totalCollected.toLocaleString()}</p>
            </div>
            <DollarSign className="w-8 h-8 text-[var(--color-success)]" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Contributions</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{collections.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Funds Given To</p>
              <p className="text-2xl font-bold text-[var(--color-text)]">{uniqueFunds.length}</p>
            </div>
            <PieChart className="w-8 h-8 text-[var(--color-secondary)]" />
          </div>
        </div>
      </div>

      {/* Filter */}
      {uniqueFunds.length > 1 && (
        <div className="flex gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            <option value="all">All Funds</option>
            {uniqueFunds.map(fund => (
              <option key={fund} value={fund}>{fund}</option>
            ))}
          </select>
        </div>
      )}

      {/* List */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-text)]">History ({filteredCollections.length})</h2>
        </div>
        <div className="p-4">
          {filteredCollections.length === 0 ? (
            <p className="text-[var(--color-textSecondary)] text-center py-8">
              No contributions yet. Your gifts will appear here.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded">
                  <div className="flex-1">
                    <p className="font-medium text-[var(--color-text)]">{collection.purpose || 'Contribution'}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{collection.fund}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      {new Date(collection.date).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--color-success)]">
                    KES {Number(collection.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record-a-gift modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-surface)] rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text)]">Record a Gift</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--color-text)]">Amount (KES)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--color-text)]">What was it for?</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                  placeholder="e.g., Tithe, Offering"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--color-text)]">Fund</label>
                <select
                  value={formData.fund}
                  onChange={(e) => setFormData({ ...formData, fund: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                  required
                >
                  <option value="">Choose a fund</option>
                  <option value="tithe">Tithe</option>
                  <option value="offering">Offering</option>
                  <option value="mission">Mission</option>
                  <option value="building">Building Fund</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--color-text)]">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCollections;
