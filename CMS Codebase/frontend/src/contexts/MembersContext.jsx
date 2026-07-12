import { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';

const MembersContext = createContext(null);

export const useMembers = () => {
  const context = useContext(MembersContext);
  if (!context) {
    console.error('useMembers must be used within a MembersProvider');
    // Return a safe default to prevent crashes
    return {
      members: [],
      loading: false,
      stats: { total: 0, active: 0, new: 0 },
      fetchMembers: async () => {},
      fetchMember: async () => {},
      createMember: async () => {},
      updateMember: async () => {},
      deleteMember: async () => {},
      fetchStats: async () => {},
    };
  }
  return context;
};

export const MembersProvider = ({ children }) => {
  const { api } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, new: 0 });

  const fetchMembers = async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/members', { params });
      setMembers(response.data.data);
      return response.data;
    } catch (error) {
      console.error('Fetch members error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to fetch members' };
    } finally {
      setLoading(false);
    }
  };

  const fetchMember = async (id) => {
    try {
      const response = await api.get(`/members/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Fetch member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to fetch member' };
    }
  };

  const createMember = async (memberData) => {
    try {
      const response = await api.post('/members', memberData);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Create member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to create member' };
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      const response = await api.put(`/members/${id}`, memberData);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Update member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to update member' };
    }
  };

  const deleteMember = async (id) => {
    try {
      const response = await api.delete(`/members/${id}`);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Delete member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to delete member' };
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/members/stats');
      setStats(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching stats:', error.response?.data || error.message);
      // Set default stats if API fails
      setStats({ total: 0, active: 0, new: 0 });
    }
  };

  return (
    <MembersContext.Provider
      value={{
        members,
        loading,
        stats,
        fetchMembers,
        fetchMember,
        createMember,
        updateMember,
        deleteMember,
        fetchStats,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
};
