import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, Filter, TrendingUp, PieChart, Plus, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const MyCollections = () => {
  const { user, api } = useAuth();
  const toast = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionAnalytics, setCollectionAnalytics] = useState(null);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    fund: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections/my-collections');
      // Handle different response formats
      const collections = response.data?.data?.collections || 
                          response.data?.collections || 
                          response.data?.data || 
                          [];
      setCollections(Array.isArray(collections) ? collections : []);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      // Don't show error toast on initial load, just set empty state
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      toast.loading('Adding collection...');
      await api.post('/collections', formData);
      toast.success('Collection added successfully');
      setShowAddModal(false);
      setFormData({ amount: '', purpose: '', fund: '', date: new Date().toISOString().split('T')[0] });
      fetchCollections();
    } catch (error) {
      console.error('Failed to add collection:', error);
      toast.error('Failed to add collection. Backend may not be configured yet.');
    }
  };

  const downloadStatement = async () => {
    try {
      toast.loading('Downloading statement...');
      const response = await api.get('/collections/my-statement', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${user.id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Statement downloaded successfully');
    } catch (error) {
      console.error('Failed to download statement:', error);
      toast.error('Failed to download statement. Backend may not be configured yet.');
    }
  };

  const handleViewAnalytics = async (collection) => {
    setSelectedCollection(collection);
    setShowAnalytics(true);
    try {
      const response = await api.get(`/collections/${collection.id}/analytics`);
      setCollectionAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  const handleCloseCollection = async (collection) => {
    try {
      await api.put(`/collections/${collection.id}/close`);
      toast.success('Collection closed successfully');
      fetchCollections();
    } catch (error) {
      console.error('Failed to close collection:', error)
      toast.error('Failed to close collection')
    }
  };

  const handleReopenCollection = async (collection) => {
    try {
      await api.put(`/collections/${collection.id}/reopen`);
      toast.success('Collection reopened successfully')
      fetchCollections()
    } catch (error) {
      console.error('Failed to reopen collection:', error)
      toast.error('Failed to reopen collection')
    }
  };

  const filteredCollections = collections.filter(collection => {
    if (filter === 'all') return true;
    return collection.fund === filter;
  });

  const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
  const uniqueFunds = [...new Set(collections.map(c => c.fund))];

  useEffect(() => {
    fetchCollections();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading collections...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Collections</h1>
          <p className="text-sm text-[var(--color-textSecondary)]">View your contribution history and add new collections</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Collection
          </button>
          <button
            onClick={downloadStatement}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Statement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Collected</p>
              <p className="text-2xl font-bold text-green-600">
                KES {totalCollected.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Total Contributions</p>
              <p className="text-2xl font-bold">{collections.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-[var(--color-primary)]-600" />
          </div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--color-textSecondary)]">Funds Contributed</p>
              <p className="text-2xl font-bold">{uniqueFunds.length}</p>
            </div>
            <PieChart className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Funds</option>
          {uniqueFunds.map(fund => (
            <option key={fund} value={fund}>{fund}</option>
          ))}
        </select>
      </div>

      {/* Collections List */}
      <div className="bg-[var(--color-surface)] rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Contribution History ({filteredCollections.length})</h2>
        </div>
        <div className="p-4">
          {filteredCollections.length === 0 ? (
            <p className="text-[var(--color-textSecondary)] text-center py-8">No collections found</p>
          ) : (
            <div className="space-y-2">
              {filteredCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between p-4 bg-[var(--color-background)] bg-[var(--color-surface)] rounded">
                  <div className="flex-1">
                    <p className="font-medium">{collection.purpose || 'Contribution'}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{collection.fund}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      {new Date(collection.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      KES {collection.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Collection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add Collection</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Tithe, Offering"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fund</label>
                <select
                  value={formData.fund}
                  onChange={(e) => setFormData({ ...formData, fund: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select fund</option>
                  <option value="tithe">Tithe</option>
                  <option value="offering">Offering</option>
                  <option value="mission">Mission</option>
                  <option value="building">Building Fund</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700"
                >
                  Add
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
