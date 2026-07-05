/**
 * BankReconciliation Model
 * Represents a bank account reconciliation
 */

class BankReconciliation {
  constructor(data = {}) {
    this.id = data.id || null;
    this.account_id = data.account_id || null;
    this.account_name = data.account_name || null;
    this.statement_date = data.statement_date || null;
    this.statement_balance = data.statement_balance || 0;
    this.book_balance = data.book_balance || 0;
    this.difference = data.difference || 0;
    this.status = data.status || 'in_progress'; // in_progress, reconciled, unreconciled
    this.reconciled_by = data.reconciled_by || null;
    this.reconciled_by_name = data.reconciled_by_name || null;
    this.reconciled_at = data.reconciled_at || null;
    this.notes = data.notes || '';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    
    // Reconciliation items
    this.items = data.items || [];
  }

  validate() {
    const errors = [];

    if (!this.account_id) {
      errors.push('Account is required');
    }

    if (!this.statement_date) {
      errors.push('Statement date is required');
    }

    const validStatuses = ['in_progress', 'reconciled', 'unreconciled'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      account_id: this.account_id,
      statement_date: this.statement_date,
      statement_balance: this.statement_balance,
      book_balance: this.book_balance,
      difference: this.difference,
      status: this.status,
      reconciled_by: this.reconciled_by,
      reconciled_at: this.reconciled_at,
      notes: this.notes
    };
  }

  static fromDatabase(row, items = []) {
    return new BankReconciliation({ ...row, items });
  }

  calculateDifference() {
    this.difference = this.statement_balance - this.book_balance;
    return this.difference;
  }

  isBalanced() {
    return Math.abs(this.difference) < 0.01;
  }

  canReconcile() {
    return this.status === 'in_progress' && this.isBalanced();
  }

  reconcile(userId, userName) {
    if (!this.canReconcile()) {
      throw new Error('Cannot reconcile: balances do not match');
    }
    this.status = 'reconciled';
    this.reconciled_by = userId;
    this.reconciled_by_name = userName;
    this.reconciled_at = new Date().toISOString();
    return this;
  }
}

module.exports = BankReconciliation;
