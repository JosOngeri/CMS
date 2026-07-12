/**
 * JournalEntry Model
 * Represents a double-entry bookkeeping journal entry
 */

class JournalEntryLine {
  constructor(data = {}) {
    this.id = data.id || null;
    this.journal_entry_id = data.journal_entry_id || null;
    this.account_id = data.account_id || null;
    this.debit_amount = data.debit_amount || 0;
    this.credit_amount = data.credit_amount || 0;
    this.description = data.description || '';
    this.line_number = data.line_number || 1;
    this.account_name = data.account_name || null;
    this.account_number = data.account_number || null;
  }

  /**
   * Check if line is balanced (has either debit or credit, not both or neither)
   */
  isValid() {
    const hasDebit = this.debit_amount > 0;
    const hasCredit = this.credit_amount > 0;
    return hasDebit !== hasCredit; // XOR - exactly one must be true
  }

  /**
   * Get the amount (positive for debit, negative for credit in standard format)
   */
  getSignedAmount() {
    if (this.debit_amount > 0) return this.debit_amount;
    if (this.credit_amount > 0) return -this.credit_amount;
    return 0;
  }
}

class JournalEntry {
  constructor(data = {}) {
    this.id = data.id || null;
    this.entry_date = data.entry_date || new Date().toISOString().split('T')[0];
    this.description = data.description || '';
    this.reference_type = data.reference_type || null; // e.g., 'payment', 'expense', 'adjustment'
    this.reference_id = data.reference_id || null;
    this.status = data.status || 'posted'; // draft, posted, reversed
    this.total_debits = data.total_debits || 0;
    this.total_credits = data.total_credits || 0;
    this.created_by = data.created_by || null;
    this.created_by_name = data.created_by_name || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    
    // Array of JournalEntryLine objects
    this.lines = (data.lines || []).map(line => 
      line instanceof JournalEntryLine ? line : new JournalEntryLine(line)
    );
  }

  /**
   * Validate journal entry
   */
  validate() {
    const errors = [];

    if (!this.entry_date) {
      errors.push('Entry date is required');
    }

    if (!this.description || this.description.trim() === '') {
      errors.push('Description is required');
    }

    if (this.lines.length < 2) {
      errors.push('At least two journal entry lines are required');
    }

    // Check each line is valid
    this.lines.forEach((line, index) => {
      if (!line.isValid()) {
        errors.push(`Line ${index + 1}: Must have either debit or credit amount, not both`);
      }
      if (!line.account_id) {
        errors.push(`Line ${index + 1}: Account is required`);
      }
    });

    // Check debits equal credits
    if (!this.isBalanced()) {
      errors.push(`Journal entry is not balanced. Debits: ${this.total_debits}, Credits: ${this.total_credits}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate totals from lines
   */
  calculateTotals() {
    this.total_debits = this.lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0);
    this.total_credits = this.lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0);
    return this;
  }

  /**
   * Check if journal entry is balanced (debits = credits)
   */
  isBalanced() {
    this.calculateTotals();
    const tolerance = 0.01; // Allow for floating point precision
    return Math.abs(this.total_debits - this.total_credits) < tolerance;
  }

  /**
   * Add a line to the journal entry
   */
  addLine(line) {
    const journalLine = line instanceof JournalEntryLine ? line : new JournalEntryLine(line);
    journalLine.line_number = this.lines.length + 1;
    this.lines.push(journalLine);
    this.calculateTotals();
    return this;
  }

  /**
   * Remove a line from the journal entry
   */
  removeLine(index) {
    this.lines.splice(index, 1);
    // Re-number lines
    this.lines.forEach((line, i) => {
      line.line_number = i + 1;
    });
    this.calculateTotals();
    return this;
  }

  /**
   * Convert to database format (for journal_entries table)
   */
  toDatabase() {
    return {
      entry_date: this.entry_date,
      description: this.description,
      reference_type: this.reference_type,
      reference_id: this.reference_id,
      status: this.status,
      total_debits: this.total_debits,
      total_credits: this.total_credits,
      created_by: this.created_by
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row, lines = []) {
    return new JournalEntry({
      ...row,
      lines
    });
  }

  /**
   * Check if entry can be edited
   */
  canEdit() {
    return this.status === 'draft' || this.status === 'posted';
  }

  /**
   * Check if entry can be reversed
   */
  canReverse() {
    return this.status === 'posted';
  }

  /**
   * Get entry type based on reference
   */
  getEntryType() {
    const types = {
      payment: 'Payment',
      expense: 'Expense',
      adjustment: 'Adjustment',
      transfer: 'Transfer',
      contribution: 'Contribution',
      budget: 'Budget Entry'
    };
    return types[this.reference_type] || 'General Entry';
  }
}

module.exports = { JournalEntry, JournalEntryLine };
