/**
 * Contribution Model
 * Represents a church member contribution/donation
 */

class Contribution {
  constructor(data = {}) {
    this.id = data.id || null;
    this.contributor_id = data.contributor_id || null;
    this.contributor_name = data.contributor_name || '';
    this.contributor_type = data.contributor_type || 'member'; // member, visitor, organization
    this.contribution_date = data.contribution_date || new Date().toISOString().split('T')[0];
    this.amount = data.amount || 0;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.payment_method = data.payment_method || 'cash'; // cash, check, bank_transfer, mpesa, card
    this.payment_reference = data.payment_reference || '';
    this.mpesa_receipt = data.mpesa_receipt || '';
    this.notes = data.notes || '';
    this.is_anonymous = data.is_anonymous !== undefined ? data.is_anonymous : false;
    this.receipt_sent = data.receipt_sent || false;
    this.receipt_sent_at = data.receipt_sent_at || null;
    this.acknowledged = data.acknowledged || false;
    this.acknowledged_at = data.acknowledged_at || null;
    this.batch_id = data.batch_id || null;
    this.entered_by = data.entered_by || null;
    this.entered_by_name = data.entered_by_name || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.contribution_date) {
      errors.push('Contribution date is required');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!this.fund_id) {
      errors.push('Fund is required');
    }

    const validMethods = ['cash', 'check', 'bank_transfer', 'mpesa', 'card', 'other'];
    if (!validMethods.includes(this.payment_method)) {
      errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      contributor_id: this.contributor_id,
      contributor_type: this.contributor_type,
      contribution_date: this.contribution_date,
      amount: this.amount,
      fund_id: this.fund_id,
      payment_method: this.payment_method,
      payment_reference: this.payment_reference,
      mpesa_receipt: this.mpesa_receipt,
      notes: this.notes,
      is_anonymous: this.is_anonymous,
      receipt_sent: this.receipt_sent,
      receipt_sent_at: this.receipt_sent_at,
      acknowledged: this.acknowledged,
      acknowledged_at: this.acknowledged_at,
      batch_id: this.batch_id,
      entered_by: this.entered_by
    };
  }

  static fromDatabase(row) {
    return new Contribution(row);
  }

  markAsReceiptSent() {
    this.receipt_sent = true;
    this.receipt_sent_at = new Date().toISOString();
    return this;
  }

  markAsAcknowledged() {
    this.acknowledged = true;
    this.acknowledged_at = new Date().toISOString();
    return this;
  }

  isMpesa() {
    return this.payment_method === 'mpesa';
  }

  getDisplayName() {
    return this.is_anonymous ? 'Anonymous' : (this.contributor_name || 'Unknown');
  }
}

module.exports = Contribution;
