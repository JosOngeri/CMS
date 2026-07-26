import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import axios from 'axios';

const Groups = () => {
  const { user } = useAuth();
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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/sms-groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/sms-groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroupMembers(response.data.contacts);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingGroup) {
        await axios.put(`${API_URL}/api/sms-groups/${editingGroup.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_URL}/api/sms-groups`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingGroup(null);
      setFormData({ name: '', description: '', source: 'local' });
      fetchGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Failed to save group');
    }
  };

  const handleEdit = (group) => {
    if (group.source === 'website') {
      alert('Cannot edit website-imported groups');
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
    if (group.source === 'website') {
      alert('Cannot delete website-imported groups');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/sms-groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Failed to delete group');
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{group.name}</h3>
                <span className="text-sm text-gray-500 capitalize">{group.source}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewMembers(group)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  View
                </button>
                {group.source === 'local' && (
                  <>
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
            <p className="text-gray-600 mb-4">{group.description || 'No description'}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {group.actual_contact_count || group.contact_count} contacts
              </span>
              <span className="text-xs text-gray-400">
                {new Date(group.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingGroup ? 'Edit Group' : 'Add Group'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
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
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingGroup ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedGroup.name} - Members</h2>
              <button
                onClick={() => {
                  setSelectedGroup(null);
                  setGroupMembers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              {groupMembers.length === 0 ? (
                <p className="text-gray-500">No members in this group</p>
              ) : (
                groupMembers.map((member) => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.phone}</p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{member.status}</span>
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