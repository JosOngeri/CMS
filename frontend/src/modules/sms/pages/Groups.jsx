/**
 * WHAT THIS FILE DOES
 * -------------------
 * SMS contact groups admin page (route: /dashboard/sms/groups). Manage
 * messaging groups and view each group's members. Website-imported groups
 * are read-only.
 *
 * FILES IT TALKS TO
 * -----------------
 * - backend /sms-groups              → CRUD
 * - backend /sms-groups/:id/members  → member list
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';

const Groups = () => {
  const { api } = useAuth();
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'local'
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/sms-groups');
      setGroups(response.data.data?.groups || response.data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const response = await api.get(`/sms-groups/${groupId}/members`);
      setGroupMembers(response.data.data?.contacts || response.data.contacts || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.put(`/sms-groups/${editingGroup.id}`, formData);
      } else {
        await api.post('/sms-groups', formData);
      }
      setShowModal(false);
      setEditingGroup(null);
      setFormData({ name: '', description: '', source: 'local' });
      fetchGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error(error.response?.data?.error || 'Failed to save group');
    }
  };

  const handleEdit = (group) => {
    if (group.source === 'website') {
      toast.info('Cannot edit website-imported groups');
      return;
    }
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      source: group.source
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;
    if (group.source === 'website') {
      toast.info('Cannot delete website-imported groups');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this group?')) return;

    try {
      await api.delete(`/sms-groups/${id}`);
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleViewMembers = (group) => {
    setSelectedGroup(group);
    fetchGroupMembers(group.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contact Groups</h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded hover:bg-[var(--color-primary)]"
        >
          Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-[var(--color-surface)] rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <span className="text-sm text-[var(--color-textSecondary)] capitalize">{group.source}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewMembers(group)}
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  View
                </button>
                {group.source === 'local' && (
                  <>
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-[var(--color-success)] hover:text-[var(--color-success)]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-[var(--color-error)] hover:text-[var(--color-error)]"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-[var(--color-text)] mb-4">{group.description || 'No description'}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-textSecondary)]">
                {group.actual_contact_count || group.contact_count} contacts
              </span>
              <span className="text-xs text-[var(--color-textSecondary)]">
                {new Date(group.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingGroup ? 'Edit Group' : 'Add Group'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGroup(null);
                    setFormData({ name: '', description: '', source: 'local' });
                  }}
                  className="px-4 py-2 border rounded hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-solid)] rounded hover:bg-[var(--color-primary)]"
                >
                  {editingGroup ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] flex items-center justify-center">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedGroup.name} - Members</h2>
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupMembers([]);
                }}
                className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {groupMembers.length === 0 ? (
                <p className="text-[var(--color-textSecondary)]">No members in this group</p>
              ) : (
                groupMembers.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-[var(--color-background)] rounded">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">{member.phone}</p>
                    </div>
                    <span className="text-xs text-[var(--color-textSecondary)] capitalize">{member.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;