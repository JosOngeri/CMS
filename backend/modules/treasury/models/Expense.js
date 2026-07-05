/**
 * Expense Model
 * Represents an expense request/claim
 */

class Expense {
  constructor(data = {}) {
    this.id = data.id || null;
    this.expense_date = data.expense_date || new Date().toISOString().split('T')[0];
    this.description = data.description || '';
    this.amount = data.amount || 0;
    this.account_id = data.account_id || null;
    this.account_name = data.account_name || null;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.vendor_id = data.vendor_id || null;
    this.vendor_name = data.vendor_name || null;
    this.department_id = data.department_id || null;
    this.department_name = data.department_name || null;
    this.project_id = data.project_id || null;
    this.project_name = data.project_name || null;
    this.receipt_url = data.receipt_url || null;
    this.status = data.status || 'pending'; // pending, approved, rejected, paid
    this.payment_method = data.payment_method || null;
    this.approved_by = data.approved_by || null;
    this.approved_by_name = data.approved_by_name || null;
    this.approved_at = data.approved_at || null;
    this.rejection_reason = data.rejection_reason || null;
    this.submitted_by = data.submitted_by || null;
    this.submitted_by_name = data.submitted_by_name || null;
    this.notes = data.notes || '';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validate expense data
   */
  validate() {
    const errors = [];

    if (!this.expense_date) {
      errors.push('Expense date is required');
    }

    if (!this.description || this.description.trim() === '') {
      errors.push('Description is required');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!this.account_id) {
      errors.push('Account is required');
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'paid'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
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
      expense_date: this.expense_date,
      description: this.description,
      amount: this.amount,
      account_id: this.account_id,
      fund_id: this.fund_id,
      vendor_id: this.vendor_id,
      department_id: this.department_id,
      project_id: this.project_id,
      receipt_url: this.receipt_url,
      status: this.status,
      payment_method: this.payment_method,
      approved_by: this.approved_by,
      approved_at: this.approved_at,
      rejection_reason: this.rejection_reason,
      submitted_by: this.submitted_by,
      notes: this.notes
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row) {
    return new Expense(row);
  }

  /**
   * Check if expense can be approved
   */
  canApprove() {
    return this.status === 'pending';
  }

  /**
   * Check if expense can be rejected
   */
  canReject() {
    return this.status === 'pending';
  }

  /**
   * Check if expense can be paid
   */
  canPay() {
    return this.status === 'approved';
  }

  /**
   * Check if expense can be edited
   */
  canEdit() {
    return this.status === 'pending' || this.status === 'rejected';
  }

  /**
   * Approve the expense
   */
  approve(approverId, approverName) {
    if (!this.canApprove()) {
      throw new Error('Expense cannot be approved');
    }
    this.status = 'approved';
    this.approved_by = approverId;
    this.approved_by_name = approverName;
    this.approved_at = new Date().toISOString();
    return this;
  }

  /**
   * Reject the expense
   */
  reject(reason) {
    if (!this.canReject()) {
      throw new Error('Expense cannot be rejected');
    }
    this.status = 'rejected';
    this.rejection_reason = reason;
    return this;
  }

  /**
   * Mark as paid
   */
  markAsPaid() {
    if (!this.canPay()) {
      throw new Error('Expense must be approved before payment');
    }
    this.status = 'paid';
    return this;
  }

  /**
   * Get status display
   */
  getStatusDisplay() {
    const displays = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid'
    };
    return displays[this.status] || this.status;
  }

  /**
   * Get status color for UI
   */
  getStatusColor() {
    const colors = {
      pending: 'yellow',
      approved: 'blue',
      rejected: 'red',
      paid: 'green'
    };
    return colors[this.status] || 'gray';
  }
}

module.exports = Expense;
