/**
 * Fund Model
 * Represents a financial fund for restricted/unrestricted accounting
 */

class Fund {
  constructor(data = {}) {
    this.id = data.id || null;
    this.fund_code = data.fund_code || '';
    this.fund_name = data.fund_name || '';
    this.fund_type = data.fund_type || 'unrestricted'; // unrestricted, restricted, temporarily_restricted
    this.description = data.description || '';
    this.purpose = data.purpose || '';
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.target_amount = data.target_amount || null;
    this.current_balance = data.current_balance || 0;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validate fund data
   */
  validate() {
    const errors = [];

    if (!this.fund_code || this.fund_code.trim() === '') {
      errors.push('Fund code is required');
    }

    if (!this.fund_name || this.fund_name.trim() === '') {
      errors.push('Fund name is required');
    }

    const validTypes = ['unrestricted', 'restricted', 'temporarily_restricted'];
    if (!validTypes.includes(this.fund_type)) {
      errors.push(`Fund type must be one of: ${validTypes.join(', ')}`);
    }

    // Validate dates if both provided
    if (this.start_date && this.end_date) {
      const start = new Date(this.start_date);
      const end = new Date(this.end_date);
      if (end < start) {
        errors.push('End date must be after start date');
      }
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
      fund_code: this.fund_code,
      fund_name: this.fund_name,
      fund_type: this.fund_type,
      description: this.description,
      purpose: this.purpose,
      start_date: this.start_date,
      end_date: this.end_date,
      target_amount: this.target_amount,
      current_balance: this.current_balance,
      is_active: this.is_active
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Fund(row);
  }

  /**
   * Get fund type display name
   */
  getFundTypeDisplay() {
    const displayNames = {
      unrestricted: 'Unrestricted',
      restricted: 'Restricted',
      temporarily_restricted: 'Temporarily Restricted'
    };
    return displayNames[this.fund_type] || this.fund_type;
  }

  /**
   * Check if fund is restricted
   */
  isRestricted() {
    return this.fund_type === 'restricted' || this.fund_type === 'temporarily_restricted';
  }

  /**
   * Check if fund has a target
   */
  hasTarget() {
    return this.target_amount !== null && this.target_amount > 0;
  }

  /**
   * Get progress percentage toward target
   */
  getProgressPercentage() {
    if (!this.hasTarget() || this.target_amount === 0) {
      return 0;
    }
    return Math.min(100, (this.current_balance / this.target_amount) * 100);
  }

  /**
   * Check if fund is complete (reached target)
   */
  isComplete() {
    return this.hasTarget() && this.current_balance >= this.target_amount;
  }

  /**
   * Check if fund has expired
   */
  isExpired() {
    if (!this.end_date) return false;
    return new Date(this.end_date) < new Date();
  }
}

module.exports = Fund;
