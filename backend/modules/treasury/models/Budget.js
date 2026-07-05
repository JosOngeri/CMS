/**
 * Budget Model
 * Represents a budget for an account/fund/department
 */

class Budget {
  constructor(data = {}) {
    this.id = data.id || null;
    this.budget_name = data.budget_name || '';
    this.budget_type = data.budget_type || 'annual'; // annual, quarterly, monthly, project
    this.fiscal_year = data.fiscal_year || new Date().getFullYear();
    this.account_id = data.account_id || null;
    this.account_name = data.account_name || null;
    this.account_number = data.account_number || null;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.department_id = data.department_id || null;
    this.department_name = data.department_name || null;
    this.total_budgeted = data.total_budgeted || 0;
    this.total_actual = data.total_actual || 0;
    this.variance = data.variance || 0;
    this.variance_percentage = data.variance_percentage || 0;
    this.status = data.status || 'active'; // draft, active, closed
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.notes = data.notes || '';
    this.created_by = data.created_by || null;
    this.created_by_name = data.created_by_name || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validate budget data
   */
  validate() {
    const errors = [];

    if (!this.budget_name || this.budget_name.trim() === '') {
      errors.push('Budget name is required');
    }

    const validTypes = ['annual', 'quarterly', 'monthly', 'project'];
    if (!validTypes.includes(this.budget_type)) {
      errors.push(`Budget type must be one of: ${validTypes.join(', ')}`);
    }

    if (!this.fiscal_year || this.fiscal_year < 2000 || this.fiscal_year > 2100) {
      errors.push('Valid fiscal year is required');
    }

    const validStatuses = ['draft', 'active', 'closed'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // At least one of account, fund, or department should be specified
    if (!this.account_id && !this.fund_id && !this.department_id) {
      errors.push('Budget must be associated with an account, fund, or department');
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
      budget_name: this.budget_name,
      budget_type: this.budget_type,
      fiscal_year: this.fiscal_year,
      account_id: this.account_id,
      fund_id: this.fund_id,
      department_id: this.department_id,
      total_budgeted: this.total_budgeted,
      total_actual: this.total_actual,
      variance: this.variance,
      variance_percentage: this.variance_percentage,
      status: this.status,
      start_date: this.start_date,
      end_date: this.end_date,
      notes: this.notes,
      created_by: this.created_by
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Budget(row);
  }

  /**
   * Calculate variance from actual spending
   */
  calculateVariance(actual = 0) {
    this.total_actual = actual;
    this.variance = this.total_budgeted - this.total_actual;
    
    if (this.total_budgeted > 0) {
      this.variance_percentage = (this.variance / this.total_budgeted) * 100;
    } else {
      this.variance_percentage = 0;
    }
    
    return this;
  }

  /**
   * Check if budget is over
   */
  isOverBudget() {
    return this.total_actual > this.total_budgeted;
  }

  /**
   * Check if budget is at risk (over 80% spent)
   */
  isAtRisk() {
    if (this.total_budgeted === 0) return false;
    const percentage = (this.total_actual / this.total_budgeted) * 100;
    return percentage >= 80 && !this.isOverBudget();
  }

  /**
   * Get remaining budget
   */
  getRemaining() {
    return Math.max(0, this.total_budgeted - this.total_actual);
  }

  /**
   * Get spent percentage
   */
  getSpentPercentage() {
    if (this.total_budgeted === 0) return 0;
    return Math.min(100, (this.total_actual / this.total_budgeted) * 100);
  }

  /**
   * Check if budget can be edited
   */
  canEdit() {
    return this.status === 'draft' || this.status === 'active';
  }

  /**
   * Activate the budget
   */
  activate() {
    if (this.status !== 'draft') {
      throw new Error('Only draft budgets can be activated');
    }
    this.status = 'active';
    return this;
  }

  /**
   * Close the budget
   */
  close() {
    if (this.status !== 'active') {
      throw new Error('Only active budgets can be closed');
    }
    this.status = 'closed';
    return this;
  }

  /**
   * Get budget type display
   */
  getBudgetTypeDisplay() {
    const displays = {
      annual: 'Annual Budget',
      quarterly: 'Quarterly Budget',
      monthly: 'Monthly Budget',
      project: 'Project Budget'
    };
    return displays[this.budget_type] || this.budget_type;
  }

  /**
   * Get status display
   */
  getStatusDisplay() {
    const displays = {
      draft: 'Draft',
      active: 'Active',
      closed: 'Closed'
    };
    return displays[this.status] || this.status;
  }

  /**
   * Check if budget period is current
   */
  isCurrent() {
    const now = new Date();
    const start = this.start_date ? new Date(this.start_date) : null;
    const end = this.end_date ? new Date(this.end_date) : null;
    
    if (start && end) {
      return now >= start && now <= end;
    }
    
    // Check fiscal year if dates not provided
    return this.fiscal_year === now.getFullYear();
  }
}

module.exports = Budget;
