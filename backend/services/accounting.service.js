const { pool } = require('../config/database');
const logger = require('../config/logging');

class AccountingService {
  // Validate double-entry (debits must equal credits)
  validateDoubleEntry(lines) {
    const totalDebit = lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry validation failed: Total debits (${totalDebit}) must equal total credits (${totalCredit})`);
    }

    return { totalDebit, totalCredit, isValid: true };
  }

  // Calculate account balance
  async calculateAccountBalance(accountId, asOfDate = null) {
    try {
      let query = `
        SELECT COALESCE(SUM(debit_amount), 0) as total_debit,
               COALESCE(SUM(credit_amount), 0) as total_credit
        FROM journal_entry_lines
        WHERE account_id = $1
      `;
      
      const params = [accountId];

      if (asOfDate) {
        query += ` AND journal_entry_id IN (
          SELECT id FROM journal_entries 
          WHERE entry_date <= $2 AND status = 'posted'
        )`;
        params.push(asOfDate);
      } else {
        query += ` AND journal_entry_id IN (
          SELECT id FROM journal_entries WHERE status = 'posted'
        )`;
      }

      const result = await pool.query(query, params);
      const { total_debit, total_credit } = result.rows[0];

      // Get account type to determine balance calculation
      const accountQuery = 'SELECT account_type FROM accounts WHERE id = $1';
      const accountResult = await pool.query(accountQuery, [accountId]);
      const accountType = accountResult.rows[0].account_type;

      let balance;
      if (accountType === 'asset' || accountType === 'expense') {
        balance = parseFloat(total_debit) - parseFloat(total_credit);
      } else {
        // Liability, equity, income
        balance = parseFloat(total_credit) - parseFloat(total_debit);
      }

      return { total_debit: parseFloat(total_debit), total_credit: parseFloat(total_credit), balance };
    } catch (error) {
      logger.error('Calculate account balance error:', error);
      throw error;
    }
  }

  // Generate trial balance
  async generateTrialBalance(asOfDate = null) {
    try {
      let query = `
        SELECT a.id, a.account_number, a.account_name, a.account_type,
               COALESCE(SUM(jel.debit_amount), 0) as total_debit,
               COALESCE(SUM(jel.credit_amount), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.is_active = true
          AND je.status = 'posted'
      `;
      
      const params = [];
      if (asOfDate) {
        query += ` AND je.entry_date <= $1`;
        params.push(asOfDate);
      }

      query += ` GROUP BY a.id, a.account_number, a.account_name, a.account_type ORDER BY a.account_number`;

      const result = await pool.query(query, params);

      const trialBalance = result.rows.map(row => {
        let balance;
        if (row.account_type === 'asset' || row.account_type === 'expense') {
          balance = parseFloat(row.total_debit) - parseFloat(row.total_credit);
        } else {
          balance = parseFloat(row.total_credit) - parseFloat(row.total_debit);
        }

        return {
          ...row,
          total_debit: parseFloat(row.total_debit),
          total_credit: parseFloat(row.total_credit),
          balance
        };
      });

      const totalDebit = trialBalance.reduce((sum, row) => sum + row.total_debit, 0);
      const totalCredit = trialBalance.reduce((sum, row) => sum + row.total_credit, 0);

      return {
        trial_balance: trialBalance,
        summary: {
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_balanced: Math.abs(totalDebit - totalCredit) < 0.01
        }
      };
    } catch (error) {
      logger.error('Generate trial balance error:', error);
      throw error;
    }
  }

  // Create journal entry automatically from payment
  async createJournalEntryFromPayment(paymentId, userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get payment details
      const paymentQuery = `
        SELECT p.*, u.first_name, u.last_name
        FROM payments p
        LEFT JOIN users u ON p.member_id = u.id
        WHERE p.id = $1
      `;
      const paymentResult = await client.query(paymentQuery, [paymentId]);

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = paymentResult.rows[0];

      // Get payment items
      const itemsQuery = `
        SELECT pi.*, pc.name as category_name
        FROM payment_items pi
        LEFT JOIN payment_categories pc ON pi.category_id = pc.id
        WHERE pi.payment_id = $1
      `;
      const itemsResult = await client.query(itemsQuery, [paymentId]);
      const paymentItems = itemsResult.rows;

      // Generate entry number
      const entryNumber = `JE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      // Create journal entry
      const entryQuery = `
        INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, created_by, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'posted')
        RETURNING *
      `;

      const description = `Payment from ${payment.first_name} ${payment.last_name} - ${paymentItems.map(i => i.category_name).join(', ')}`;
      const entryResult = await client.query(entryQuery, [
        entryNumber,
        payment.payment_date,
        description,
        'payment',
        paymentId,
        payment.amount,
        payment.amount,
        userId
      ]);

      const journalEntry = entryResult.rows[0];

      // Debit cash/bank account (M-Pesa account)
      const mpesaAccountQuery = 'SELECT id FROM accounts WHERE account_number = $1';
      const mpesaAccountResult = await client.query(mpesaAccountQuery, ['1120']); // M-Pesa account

      if (mpesaAccountResult.rows.length > 0) {
        const debitLine = `
          INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(debitLine, [
          journalEntry.id,
          mpesaAccountResult.rows[0].id,
          'M-Pesa Payment Received',
          payment.amount,
          0
        ]);
      }

      // Credit income accounts for each payment item
      for (const item of paymentItems) {
        // Map payment category to income account
        let accountNumber = '4120'; // Default: Local Church Offering
        if (item.category_name === 'Tithe') accountNumber = '4110';
        else if (item.category_name === 'Mission Offering') accountNumber = '4130';
        else if (item.category_name === 'Sabbath School Offering') accountNumber = '4140';

        const incomeAccountQuery = 'SELECT id FROM accounts WHERE account_number = $1';
        const incomeAccountResult = await client.query(incomeAccountQuery, [accountNumber]);

        if (incomeAccountResult.rows.length > 0) {
          const creditLine = `
            INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
            VALUES ($1, $2, $3, $4, $5)
          `;
          await client.query(creditLine, [
            journalEntry.id,
            incomeAccountResult.rows[0].id,
            item.category_name,
            0,
            item.amount
          ]);
        }
      }

      await client.query('COMMIT');

      return journalEntry;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Create journal entry from payment error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update budget actuals
  async updateBudgetActuals(fiscalYear) {
    try {
      // Get all budgets for the fiscal year
      const budgetsQuery = `
        SELECT b.*, a.account_type
        FROM budgets b
        LEFT JOIN accounts a ON b.account_id = a.id
        WHERE b.fiscal_year = $1
      `;
      const budgetsResult = await pool.query(budgetsQuery, [fiscalYear]);

      for (const budget of budgetsResult.rows) {
        if (!budget.account_id) continue;

        // Calculate actual amount from journal entries
        const actualQuery = `
          SELECT COALESCE(SUM(
            CASE 
              WHEN a.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount
              ELSE jel.credit_amount - jel.debit_amount
            END
          ), 0) as actual
          FROM journal_entry_lines jel
          LEFT JOIN accounts a ON jel.account_id = a.id
          LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
          WHERE jel.account_id = $1
            AND je.status = 'posted'
            AND EXTRACT(YEAR FROM je.entry_date) = $2
        `;

        const actualResult = await pool.query(actualQuery, [budget.account_id, fiscalYear]);
        const actualAmount = parseFloat(actualResult.rows[0].actual);

        // Update budget
        const variance = budget.budgeted_amount - actualAmount;
        await pool.query(
          `UPDATE budgets 
           SET actual_amount = $1, variance = $2 
           WHERE id = $3`,
          [actualAmount, variance, budget.id]
        );
      }

      return { success: true, message: 'Budget actuals updated' };
    } catch (error) {
      logger.error('Update budget actuals error:', error);
      throw error;
    }
  }

  // Get fund balance
  async getFundBalance(fundId, asOfDate = null) {
    try {
      let query = `
        SELECT COALESCE(SUM(
          CASE 
            WHEN a.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount
            ELSE jel.credit_amount - jel.debit_amount
          END
        ), 0) as balance
        FROM accounts a
        LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        WHERE a.fund_id = $1
          AND a.is_active = true
          AND je.status = 'posted'
      `;

      const params = [fundId];

      if (asOfDate) {
        query += ` AND je.entry_date <= $2`;
        params.push(asOfDate);
      }

      const result = await pool.query(query, params);
      return parseFloat(result.rows[0].balance);
    } catch (error) {
      logger.error('Get fund balance error:', error);
      throw error;
    }
  }

  // Reverse journal entry
  async reverseJournalEntry(journalEntryId, userId, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get original journal entry
      const originalQuery = `
        SELECT je.*, json_agg(
          json_build_object(
            'account_id', jel.account_id,
            'debit_amount', jel.debit_amount,
            'credit_amount', jel.credit_amount,
            'description', jel.description
          )
        ) as lines
        FROM journal_entries je
        LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        WHERE je.id = $1
        GROUP BY je.id
      `;

      const originalResult = await client.query(originalQuery, [journalEntryId]);

      if (originalResult.rows.length === 0) {
        throw new Error('Journal entry not found');
      }

      const originalEntry = originalResult.rows[0];

      // Generate reversal entry number
      const reversalEntryNumber = `REV-${originalEntry.entry_number}`;

      // Create reversal journal entry
      const reversalQuery = `
        INSERT INTO journal_entries (entry_number, entry_date, description, reference_type, reference_id, total_debit, total_credit, created_by, status)
        VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, 'posted')
        RETURNING *
      `;

      const description = `Reversal of ${originalEntry.entry_number}: ${reason}`;
      const reversalResult = await client.query(reversalQuery, [
        reversalEntryNumber,
        description,
        'reversal',
        journalEntryId,
        originalEntry.total_credit, // Swap debit and credit
        originalEntry.total_debit,
        userId
      ]);

      const reversalEntry = reversalResult.rows[0];

      // Create reversal lines (swap debit and credit)
      for (const line of originalEntry.lines) {
        const reversalLine = `
          INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(reversalLine, [
          reversalEntry.id,
          line.account_id,
          `Reversal: ${line.description}`,
          line.credit_amount, // Swap
          line.debit_amount    // Swap
        ]);
      }

      // Mark original as reversed
      await client.query(
        'UPDATE journal_entries SET status = $1 WHERE id = $2',
        ['reversed', journalEntryId]
      );

      await client.query('COMMIT');

      return reversalEntry;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Reverse journal entry error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Calculate depreciation for fixed assets
  async calculateDepreciation(assetId, fiscalYear) {
    try {
      // Get asset details
      const assetQuery = `
        SELECT * FROM fixed_assets WHERE id = $1
      `;
      const assetResult = await pool.query(assetQuery, [assetId]);

      if (assetResult.rows.length === 0) {
        throw new Error('Asset not found');
      }

      const asset = assetResult.rows[0];

      if (asset.depreciation_method === 'straight_line') {
        const annualDepreciation = asset.purchase_price / asset.useful_life_years;
        const yearsSincePurchase = fiscalYear - new Date(asset.purchase_date).getFullYear();
        
        if (yearsSincePurchase > 0 && yearsSincePurchase <= asset.useful_life_years) {
          const accumulatedDepreciation = annualDepreciation * yearsSincePurchase;
          const netBookValue = asset.purchase_price - accumulatedDepreciation;

          return {
            annual_depreciation: annualDepreciation,
            accumulated_depreciation: accumulatedDepreciation,
            net_book_value: netBookValue
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Calculate depreciation error:', error);
      throw error;
    }
  }

  // Generate account summary
  async generateAccountSummary(accountId, startDate, endDate) {
    try {
      const query = `
        SELECT je.entry_date, je.entry_number, je.description,
               jel.debit_amount, jel.credit_amount,
               a.account_name, a.account_number
        FROM journal_entry_lines jel
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
        LEFT JOIN accounts a ON jel.account_id = a.id
        WHERE jel.account_id = $1
          AND je.status = 'posted'
          AND je.entry_date >= $2
          AND je.entry_date <= $3
        ORDER BY je.entry_date ASC
      `;

      const result = await pool.query(query, [accountId, startDate, endDate]);

      const transactions = result.rows.map(row => ({
        date: row.entry_date,
        entry_number: row.entry_number,
        description: row.description,
        debit: parseFloat(row.debit_amount),
        credit: parseFloat(row.credit_amount)
      }));

      const balance = await this.calculateAccountBalance(accountId, endDate);

      return {
        account_id: accountId,
        account_name: result.rows[0]?.account_name,
        account_number: result.rows[0]?.account_number,
        period: { start: startDate, end: endDate },
        transactions,
        ending_balance: balance.balance
      };
    } catch (error) {
      logger.error('Generate account summary error:', error);
      throw error;
    }
  }
}

module.exports = new AccountingService();
