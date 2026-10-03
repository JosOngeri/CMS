import { createContext, useContext, useState, useMemo, useCallback } from 'react';
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

  // Normalize the {success, data, error} envelope used across the API.
  const unwrap = (response) => response.data?.data ?? response.data;

  const fetchMembers = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const response = await api.get('/members', { params });
      setMembers(unwrap(response));
      return response.data;
    } catch (error) {
      console.error('Fetch members error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to fetch members' };
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchMember = useCallback(async (id) => {
    try {
      const response = await api.get(`/members/${id}`);
      return unwrap(response);
    } catch (error) {
      console.error('Fetch member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to fetch member' };
    }
  }, [api]);

  const createMember = useCallback(async (memberData) => {
    try {
      const response = await api.post('/members', memberData);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Create member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to create member' };
    }
  }, [api, fetchMembers]);

  const updateMember = useCallback(async (id, memberData) => {
    try {
      const response = await api.put(`/members/${id}`, memberData);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Update member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to update member' };
    }
  }, [api, fetchMembers]);

  const deleteMember = useCallback(async (id) => {
    try {
      const response = await api.delete(`/members/${id}`);
      await fetchMembers();
      return response.data;
    } catch (error) {
      console.error('Delete member error:', error.response?.data || error.message);
      throw error.response?.data || { error: 'Failed to delete member' };
    }
  }, [api, fetchMembers]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/members/stats');
      setStats(unwrap(response));
      return unwrap(response);
    } catch (error) {
      console.error('Error fetching stats:', error.response?.data || error.message);
      // Set default stats if API fails
      setStats({ total: 0, active: 0, new: 0 });
    }
  }, [api]);

  const value = useMemo(() => ({
    members,
    loading,
    stats,
    fetchMembers,
    fetchMember,
    createMember,
    updateMember,
    deleteMember,
    fetchStats,
  }), [members, loading, stats, fetchMembers, fetchMember, createMember, updateMember, deleteMember, fetchStats]);

  return (
    <MembersContext.Provider
      value={value}
    >
      {children}
    </MembersContext.Provider>
  );
};
