/**
 * WHAT THIS FILE DOES
 * -------------------
 * SMS contacts admin page (route: /dashboard/sms/contacts). Lists contacts
 * with search/source/group filters, add/edit/delete, and CSV export.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /sms-contacts        → CRUD + /export (CSV blob)
 * - backend /sms-groups          → group picklist
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import ConfirmDialog from '../../../components/common/ConfirmDialog';

const Contacts = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  // L633: debounced value actually sent to the API — raw searchTerm refetches per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    group_id: '',
    source: 'manual',
    status: 'active'
  });

  useEffect(() => {
    fetchContacts();
  }, [sourceFilter, groupFilter, debouncedSearch]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchContacts = async () => {
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (groupFilter) params.set('group_id', groupFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await api.get(`/sms-contacts?${params.toString()}`);
      setContacts(response.data.data?.contacts || response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/sms-groups');
      setGroups(response.data.data?.groups || response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await api.put(`/sms-contacts/${editingContact.id}`, formData);
      } else {
        await api.post('/sms-contacts', formData);
      }
      setShowModal(false);
      setEditingContact(null);
      setFormData({ name: '', phone: '', email: '', group_id: '', source: 'manual', status: 'active' });
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(error.response?.data?.error || 'Failed to save contact');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      group_id: contact.group_id || '',
      source: contact.source,
      status: contact.status
    });
    setShowModal(true);
  };

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await api.delete(`/sms-contacts/${id}`);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Failed to delete contact');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/sms-contacts/export', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast.error('Failed to export contacts');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-[var(--color-success)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90"
          >
            Add Contact
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="all">All Sources</option>
          <option value="manual">Manual</option>
          <option value="phone">Phone</option>
          <option value="website">Website</option>
        </select>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Groups</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--color-surface)] rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[var(--color-background)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)] divide-y divide-[var(--color-border)]">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-6 py-4 whitespace-nowrap">{contact.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{contact.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">{contact.email || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{(contact.group_name ?? (groups.find(g => g.id === contact.group_id)?.name)) || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{contact.source}</td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{contact.status}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="text-[var(--color-primary)] hover:underline mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="text-[var(--color-error)] hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Phone</label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="+254712345678"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Email</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Group</label>
                <select
                  value={formData.group_id}
                  onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">No Group</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingContact(null);
                    setFormData({ name: '', phone: '', email: '', group_id: '', source: 'manual', status: 'active' });
                  }}
                  className="px-4 py-2 border rounded hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded-lg hover:opacity-90"
                >
                  {editingContact ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        show={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
};

export default Contacts;