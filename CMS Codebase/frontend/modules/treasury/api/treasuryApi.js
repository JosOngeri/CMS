/**
 * Treasury API Module
 * All treasury-related API calls
 */

import { api } from '../../../core/api/client';

/**
 * Account API
 */
export const accountApi = {
  getAll: (params = {}) => api.get('/treasury/accounts', { params }),
  getById: (id) => api.get(`/treasury/accounts/${id}`),
  create: (data) => api.post('/treasury/accounts', data),
  update: (id, data) => api.put(`/treasury/accounts/${id}`, data),
  delete: (id) => api.delete(`/treasury/accounts/${id}`),
  getHierarchy: () => api.get('/treasury/accounts/hierarchy'),
  getTrialBalance: (params = {}) => api.get('/treasury/accounts/trial-balance', { params })
};

/**
 * Fund API
 */
export const fundApi = {
  getAll: (params = {}) => api.get('/treasury/funds', { params }),
  getById: (id) => api.get(`/treasury/funds/${id}`),
  create: (data) => api.post('/treasury/funds', data),
  update: (id, data) => api.put(`/treasury/funds/${id}`, data),
  delete: (id) => api.delete(`/treasury/funds/${id}`),
  getBalances: () => api.get('/treasury/funds/balances')
};

/**
 * Journal Entry API
 */
export const journalEntryApi = {
  getAll: (params = {}) => api.get('/treasury/journal-entries', { params }),
  getById: (id) => api.get(`/treasury/journal-entries/${id}`),
  create: (data) => api.post('/treasury/journal-entries', data),
  update: (id, data) => api.put(`/treasury/journal-entries/${id}`, data),
  reverse: (id, data = {}) => api.post(`/treasury/journal-entries/${id}/reverse`, data),
  getAccountTransactions: (accountId, params = {}) => 
    api.get(`/treasury/journal-entries/accounts/${accountId}/transactions`, { params })
};

/**
 * Expense API
 */
export const expenseApi = {
  getAll: (params = {}) => api.get('/treasury/expenses', { params }),
  getById: (id) => api.get(`/treasury/expenses/${id}`),
  create: (data) => api.post('/treasury/expenses', data),
  update: (id, data) => api.put(`/treasury/expenses/${id}`, data),
  approve: (id) => api.post(`/treasury/expenses/${id}/approve`),
  reject: (id, reason) => api.post(`/treasury/expenses/${id}/reject`, { reason }),
  markPaid: (id) => api.post(`/treasury/expenses/${id}/pay`),
  getPending: () => api.get('/treasury/expenses/pending'),
  getSummary: () => api.get('/treasury/expenses/summary'),
  getReport: (params) => api.get('/treasury/expenses/report', { params })
};

/**
 * Budget API
 */
export const budgetApi = {
  getAll: (params = {}) => api.get('/treasury/budgets', { params }),
  getById: (id) => api.get(`/treasury/budgets/${id}`),
  create: (data) => api.post('/treasury/budgets', data),
  update: (id, data) => api.put(`/treasury/budgets/${id}`, data),
  activate: (id) => api.post(`/treasury/budgets/${id}/activate`),
  close: (id) => api.post(`/treasury/budgets/${id}/close`),
  getAlerts: (params = {}) => api.get('/treasury/budgets/alerts', { params }),
  getComparison: (params = {}) => api.get('/treasury/budgets/comparison', { params })
};

/**
 * Treasury Dashboard API
 */
export const treasuryDashboardApi = {
  getStats: () => api.get('/treasury/stats'),
  getSummary: () => api.get('/treasury/summary')
};

// Export all treasury APIs
export default {
  account: accountApi,
  fund: fundApi,
  journalEntry: journalEntryApi,
  expense: expenseApi,
  budget: budgetApi,
  dashboard: treasuryDashboardApi
};
