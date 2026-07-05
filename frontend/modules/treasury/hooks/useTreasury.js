/**
 * useTreasury Hook
 * Treasury domain data fetching hook
 */

import { useState, useCallback } from 'react';
import { useApi, useGet } from '../../../core/hooks/useApi';
import treasuryApi from '../api/treasuryApi';

/**
 * Hook for accounts
 */
export const useAccounts = (options = {}) => {
  const { data, loading, error, execute, refresh } = useApi(
    treasuryApi.account.getAll,
    { immediate: true, ...options }
  );
  
  return {
    accounts: data?.accounts || [],
    loading,
    error,
    refresh,
    createAccount: treasuryApi.account.create,
    updateAccount: treasuryApi.account.update,
    deleteAccount: treasuryApi.account.delete
  };
};

/**
 * Hook for single account
 */
export const useAccount = (id) => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.account.getById,
    { immediate: !!id }
  );
  
  return {
    account: data?.account || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for funds
 */
export const useFunds = (options = {}) => {
  const { data, loading, error, execute, refresh } = useApi(
    treasuryApi.fund.getAll,
    { immediate: true, ...options }
  );
  
  return {
    funds: data?.funds || [],
    loading,
    error,
    refresh,
    createFund: treasuryApi.fund.create,
    updateFund: treasuryApi.fund.update,
    deleteFund: treasuryApi.fund.delete
  };
};

/**
 * Hook for fund balances
 */
export const useFundBalances = () => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.fund.getBalances,
    { immediate: true }
  );
  
  return {
    funds: data?.funds || [],
    summary: data?.summary || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for journal entries
 */
export const useJournalEntries = (params = {}) => {
  const { data, loading, error, execute, refresh } = useApi(
    () => treasuryApi.journalEntry.getAll(params),
    { immediate: true }
  );
  
  return {
    entries: data?.entries || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refresh,
    createEntry: treasuryApi.journalEntry.create,
    updateEntry: treasuryApi.journalEntry.update,
    reverseEntry: treasuryApi.journalEntry.reverse
  };
};

/**
 * Hook for single journal entry
 */
export const useJournalEntry = (id) => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.journalEntry.getById,
    { immediate: !!id }
  );
  
  return {
    entry: data?.entry || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for expenses
 */
export const useExpenses = (params = {}) => {
  const { data, loading, error, execute, refresh } = useApi(
    () => treasuryApi.expense.getAll(params),
    { immediate: true }
  );
  
  return {
    expenses: data?.expenses || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refresh,
    createExpense: treasuryApi.expense.create,
    updateExpense: treasuryApi.expense.update,
    approveExpense: treasuryApi.expense.approve,
    rejectExpense: treasuryApi.expense.reject,
    markExpensePaid: treasuryApi.expense.markPaid
  };
};

/**
 * Hook for pending expenses
 */
export const usePendingExpenses = () => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.expense.getPending,
    { immediate: true }
  );
  
  return {
    expenses: data?.expenses || [],
    summary: data?.summary || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for single expense
 */
export const useExpense = (id) => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.expense.getById,
    { immediate: !!id }
  );
  
  return {
    expense: data?.expense || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for budgets
 */
export const useBudgets = (params = {}) => {
  const { data, loading, error, execute, refresh } = useApi(
    () => treasuryApi.budget.getAll(params),
    { immediate: true }
  );
  
  return {
    budgets: data?.budgets || [],
    pagination: data?.pagination || null,
    loading,
    error,
    refresh,
    createBudget: treasuryApi.budget.create,
    updateBudget: treasuryApi.budget.update,
    activateBudget: treasuryApi.budget.activate,
    closeBudget: treasuryApi.budget.close
  };
};

/**
 * Hook for single budget
 */
export const useBudget = (id) => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.budget.getById,
    { immediate: !!id }
  );
  
  return {
    budget: data?.budget || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for budget alerts
 */
export const useBudgetAlerts = (threshold = 80) => {
  const { data, loading, error, execute } = useApi(
    () => treasuryApi.budget.getAlerts({ threshold }),
    { immediate: true }
  );
  
  return {
    alerts: data?.alerts || { over: [], at_risk: [] },
    summary: data?.summary || null,
    loading,
    error,
    refresh: execute
  };
};

/**
 * Hook for treasury dashboard stats
 */
export const useTreasuryStats = () => {
  const { data, loading, error, execute } = useApi(
    treasuryApi.dashboard.getStats,
    { immediate: true }
  );
  
  return {
    stats: data || null,
    loading,
    error,
    refresh: execute
  };
};

// Export all treasury hooks
export default {
  useAccounts,
  useAccount,
  useFunds,
  useFundBalances,
  useJournalEntries,
  useJournalEntry,
  useExpenses,
  usePendingExpenses,
  useExpense,
  useBudgets,
  useBudget,
  useBudgetAlerts,
  useTreasuryStats
};
