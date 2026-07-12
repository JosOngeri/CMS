/**
 * Pledge Model
 * Represents a pledge/commitment to give
 */

class Pledge {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pledgor_id = data.pledgor_id || null;
    this.pledgor_name = data.pledgor_name || '';
    this.pledgor_type = data.pledgor_type || 'member';
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.total_amount = data.total_amount || 0;
    this.amount_paid = data.amount_paid || 0;
    this.frequency = data.frequency || 'one_time'; // one_time, weekly, monthly, quarterly, yearly
    this.pledge_date = data.pledge_date || new Date().toISOString().split('T')[0];
    this.start_date = data.start_date || null;
    this.end_date = data.end_date || null;
    this.amount_per_period = data.amount_per_period || 0;
    this.number_of_periods = data.number_of_periods || 1;
    this.status = data.status || 'active'; // active, completed, cancelled
    this.purpose = data.purpose || '';
    this.notes = data.notes || '';
    this.reminder_sent = data.reminder_sent || false;
    this.reminder_sent_at = data.reminder_sent_at || null;
    this.created_by = data.created_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.total_amount || this.total_amount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    if (!this.fund_id) {
      errors.push('Fund is required');
    }

    const validFrequencies = ['one_time', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(this.frequency)) {
      errors.push(`Frequency must be one of: ${validFrequencies.join(', ')}`);
    }

    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      pledgor_id: this.pledgor_id,
      pledgor_type: this.pledgor_type,
      fund_id: this.fund_id,
      total_amount: this.total_amount,
      amount_paid: this.amount_paid,
      frequency: this.frequency,
      pledge_date: this.pledge_date,
      start_date: this.start_date,
      end_date: this.end_date,
      amount_per_period: this.amount_per_period,
      number_of_periods: this.number_of_periods,
      status: this.status,
      purpose: this.purpose,
      notes: this.notes,
      reminder_sent: this.reminder_sent,
      reminder_sent_at: this.reminder_sent_at,
      created_by: this.created_by
    };
  }

  static fromDatabase(row) {
    return new Pledge(row);
  }

  getRemainingAmount() {
    return Math.max(0, this.total_amount - this.amount_paid);
  }

  getProgressPercentage() {
    if (this.total_amount === 0) return 0;
    return Math.min(100, (this.amount_paid / this.total_amount) * 100);
  }

  isComplete() {
    return this.amount_paid >= this.total_amount;
  }

  recordPayment(amount) {
    this.amount_paid += amount;
    if (this.isComplete()) {
      this.status = 'completed';
    }
    return this;
  }

  markReminderSent() {
    this.reminder_sent = true;
    this.reminder_sent_at = new Date().toISOString();
    return this;
  }
}

module.exports = Pledge;
