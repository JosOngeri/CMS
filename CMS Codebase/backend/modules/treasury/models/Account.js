/**
 * Account Model
 * Represents a Chart of Accounts entry
 */

class Account {
  constructor(data = {}) {
    this.id = data.id || null;
    this.account_number = data.account_number || '';
    this.account_name = data.account_name || '';
    this.account_type = data.account_type || ''; // asset, liability, equity, income, expense
    this.sub_type = data.sub_type || null;
    this.parent_account_id = data.parent_account_id || null;
    this.parent_account_name = data.parent_account_name || null;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.description = data.description || '';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.balance = data.balance || 0;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validate account data
   */
  validate() {
    const errors = [];

    if (!this.account_number || this.account_number.trim() === '') {
      errors.push('Account number is required');
    }

    if (!this.account_name || this.account_name.trim() === '') {
      errors.push('Account name is required');
    }

    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
    if (!validTypes.includes(this.account_type)) {
      errors.push(`Account type must be one of: ${validTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Convert to database format
   */
  toDatabase() {
    return {
      account_number: this.account_number,
      account_name: this.account_name,
      account_type: this.account_type,
      sub_type: this.sub_type,
      parent_account_id: this.parent_account_id,
      fund_id: this.fund_id,
      description: this.description,
      is_active: this.is_active,
      balance: this.balance
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Account(row);
  }

  /**
   * Get account type display name
   */
  getAccountTypeDisplay() {
    const displayNames = {
      asset: 'Asset',
      liability: 'Liability',
      equity: 'Equity',
      income: 'Income',
      expense: 'Expense'
    };
    return displayNames[this.account_type] || this.account_type;
  }

  /**
   * Check if account is a parent account
   */
  isParentAccount() {
    return this.parent_account_id === null;
  }

  /**
   * Get full account display (number + name)
   */
  getFullDisplay() {
    return `${this.account_number} - ${this.account_name}`;
  }
}

module.exports = Account;
