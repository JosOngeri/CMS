/**
 * Finance Helper Functions
 * Treasury and finance utility functions
 */

const { pool } = require('../config/database');

/**
 * Calculate account balance for a specific account
 * @param {string} accountId - Account ID
 * @param {Date} [asOfDate] - Optional date to calculate balance as of
 * @returns {Promise<Object>} Balance information
 */
async function calculateAccountBalance(accountId, asOfDate = null) {
  let query = `
    SELECT 
      COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE jel.account_id = $1
    AND je.status = 'posted'
  `;
  const params = [accountId];

  if (asOfDate) {
    query += ` AND je.entry_date <= $2`;
    params.push(asOfDate);
  }

  const result = await pool.query(query, params);
  const { total_debits, total_credits } = result.rows[0];

  // Get account type to determine balance calculation
  const accountResult = await pool.query(
    'SELECT account_type FROM chart_of_accounts WHERE id = $1',
    [accountId]
  );

  if (accountResult.rows.length === 0) {
    return { balance: 0, total_debits, total_credits };
  }

  const accountType = accountResult.rows[0].account_type;
  
  // Assets and expenses: debit balance
  // Liabilities, equity, income: credit balance
  let balance;
  if (accountType === 'asset' || accountType === 'expense') {
    balance = parseFloat(total_debits) - parseFloat(total_credits);
  } else {
    balance = parseFloat(total_credits) - parseFloat(total_debits);
  }

  return {
    balance,
    total_debits: parseFloat(total_debits),
    total_credits: parseFloat(total_credits),
    account_type: accountType
  };
}

/**
 * Calculate trial balance
 * @param {Date} [asOfDate] - Optional date to calculate trial balance as of
 * @returns {Promise<Array>} Trial balance data
 */
async function calculateTrialBalance(asOfDate = null) {
  let query = `
    SELECT 
      coa.id,
      coa.account_code,
      coa.account_name,
      coa.account_type,
      COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
    LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      AND je.status = 'posted'
  `;
  const params = [];

  if (asOfDate) {
    query += ` AND je.entry_date <= $1`;
    params.push(asOfDate);
  }

  query += `
    WHERE coa.is_active = true
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
    ORDER BY coa.account_code
  `;

  const result = await pool.query(query, params);

  // Calculate balances
  const trialBalance = result.rows.map(row => {
    const totalDebits = parseFloat(row.total_debits);
    const totalCredits = parseFloat(row.total_credits);
    let balance;

    if (row.account_type === 'asset' || row.account_type === 'expense') {
      balance = totalDebits - totalCredits;
    } else {
      balance = totalCredits - totalDebits;
    }

    return {
      ...row,
      total_debits: totalDebits,
      total_credits: totalCredits,
      balance
    };
  });

  // Calculate totals
  const totalDebits = trialBalance.reduce((sum, row) => sum + row.total_debits, 0);
  const totalCredits = trialBalance.reduce((sum, row) => sum + row.total_credits, 0);

  return {
    accounts: trialBalance,
    totals: {
      total_debits: totalDebits,
      total_credits: totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
    }
  };
}

/**
 * Calculate income statement
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Income statement data
 */
async function calculateIncomeStatement(startDate, endDate) {
  const query = `
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits
    FROM chart_of_accounts coa
    JOIN journal_entry_lines jel ON coa.id = jel.account_id
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    WHERE coa.account_type IN ('income', 'expense')
    AND je.status = 'posted'
    AND je.entry_date >= $1
    AND je.entry_date <= $2
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type
    ORDER BY coa.account_code
  `;

  const result = await pool.query(query, [startDate, endDate]);

  let totalIncome = 0;
  let totalExpenses = 0;
  const incomeAccounts = [];
  const expenseAccounts = [];

  result.rows.forEach(row => {
    const totalDebits = parseFloat(row.total_debits);
    const totalCredits = parseFloat(row.total_credits);
    let amount;

    if (row.account_type === 'income') {
      amount = totalCredits - totalDebits;
      totalIncome += amount;
      incomeAccounts.push({ ...row, amount });
    } else {
      amount = totalDebits - totalCredits;
      totalExpenses += amount;
      expenseAccounts.push({ ...row, amount });
    }
  });

  const netIncome = totalIncome - totalExpenses;

  return {
    period: { start: startDate, end: endDate },
    income: {
      accounts: incomeAccounts,
      total: totalIncome
    },
    expenses: {
      accounts: expenseAccounts,
      total: totalExpenses
    },
    net_income: netIncome
  };
}

/**
 * Calculate balance sheet
 * @param {Date} [asOfDate] - Optional date to calculate balance sheet as of
 * @returns {Promise<Object>} Balance sheet data
 */
async function calculateBalanceSheet(asOfDate = null) {
  const query = `
    SELECT 
      coa.account_code,
      coa.account_name,
      coa.account_type,
      coa.parent_id,
      COALESCE(SUM(CASE WHEN jel.debit_amount > 0 THEN jel.debit_amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN jel.credit_amount > 0 THEN jel.credit_amount ELSE 0 END), 0) as total_credits
    FROM chart_of_accounts coa
    LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
    LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
      AND je.status = 'posted
  `;
  const params = [];

  if (asOfDate) {
    query += ` AND je.entry_date <= $1`;
    params.push(asOfDate);
  }

  query += `
    WHERE coa.account_type IN ('asset', 'liability', 'equity')
    AND coa.is_active = true
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.parent_id
    ORDER BY coa.account_code
  `;

  const result = await pool.query(query, params);

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;
  const assets = [];
  const liabilities = [];
  const equity = [];

  result.rows.forEach(row => {
    const totalDebits = parseFloat(row.total_debits);
    const totalCredits = parseFloat(row.total_credits);
    let amount;

    if (row.account_type === 'asset') {
      amount = totalDebits - totalCredits;
      totalAssets += amount;
      assets.push({ ...row, amount });
    } else if (row.account_type === 'liability') {
      amount = totalCredits - totalDebits;
      totalLiabilities += amount;
      liabilities.push({ ...row, amount });
    } else {
      amount = totalCredits - totalDebits;
      totalEquity += amount;
      equity.push({ ...row, amount });
    }
  });

  return {
    as_of: asOfDate || new Date(),
    assets: {
      accounts: assets,
      total: totalAssets
    },
    liabilities: {
      accounts: liabilities,
      total: totalLiabilities
    },
    equity: {
      accounts: equity,
      total: totalEquity
    },
    is_balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
  };
}

/**
 * Validate journal entry balance
 * @param {Array} lines - Journal entry lines
 * @returns {Object} Validation result
 */
function validateJournalEntryBalance(lines) {
  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);

  return {
    is_balanced: difference < 0.01,
    total_debits: totalDebits,
    total_credits: totalCredits,
    difference
  };
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} [currency] - Currency code (default: KES)
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount, currency = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Calculate percentage change
 * @param {number} oldValue - Old value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

module.exports = {
  calculateAccountBalance,
  calculateTrialBalance,
  calculateIncomeStatement,
  calculateBalanceSheet,
  validateJournalEntryBalance,
  formatCurrency,
  calculatePercentageChange
};
