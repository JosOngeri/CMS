/**
 * Payment Model
 * Handles payment domain logic
 */

class Payment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.member_id = data.member_id || null;
    this.phone_number = data.phone_number || null;
    this.amount = parseFloat(data.amount) || 0;
    this.notes = data.notes || null;
    this.status = data.status || 'pending';
    this.transaction_id = data.transaction_id || null;
    this.mpesa_receipt_number = data.mpesa_receipt_number || null;
    this.payment_date = data.payment_date || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.payment_items = data.payment_items || [];
  }

  validate() {
    const errors = [];

    if (!this.phone_number) {
      errors.push('Phone number is required');
    } else if (!/^254\d{9}$/.test(this.phone_number)) {
      errors.push('Phone number must be in format 254XXXXXXXXX');
    }

    if (this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!this.payment_items || this.payment_items.length === 0) {
      errors.push('At least one payment item is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  canBeCancelled() {
    return this.status === 'pending';
  }

  canBeRefunded() {
    return this.status === 'completed';
  }

  isSuccessful() {
    return this.status === 'completed';
  }

  isPending() {
    return this.status === 'pending';
  }

  isFailed() {
    return this.status === 'failed' || this.status === 'cancelled';
  }

  getAccountReference() {
    return `SDA-${this.id ? this.id.toString().slice(-8) : 'PENDING'}`;
  }

  toDatabase() {
    return {
      id: this.id,
      member_id: this.member_id,
      phone_number: this.phone_number,
      amount: this.amount,
      notes: this.notes,
      status: this.status,
      transaction_id: this.transaction_id,
      mpesa_receipt_number: this.mpesa_receipt_number,
      payment_date: this.payment_date
    };
  }

  static fromDatabase(row) {
    return new Payment({
      id: row.id,
      member_id: row.member_id,
      phone_number: row.phone_number,
      amount: parseFloat(row.amount),
      notes: row.notes,
      status: row.status,
      transaction_id: row.transaction_id,
      mpesa_receipt_number: row.mpesa_receipt_number,
      payment_date: row.payment_date,
      created_at: row.created_at,
      updated_at: row.updated_at,
      payment_items: row.payment_items || []
    });
  }
}

class PaymentItem {
  constructor(data = {}) {
    this.id = data.id || null;
    this.payment_id = data.payment_id || null;
    this.category_id = data.category_id || null;
    this.amount = parseFloat(data.amount) || 0;
    this.category_name = data.category_name || null;
  }

  validate() {
    const errors = [];

    if (!this.category_id) {
      errors.push('Category ID is required');
    }

    if (this.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toDatabase() {
    return {
      id: this.id,
      payment_id: this.payment_id,
      category_id: this.category_id,
      amount: this.amount
    };
  }

  static fromDatabase(row) {
    return new PaymentItem({
      id: row.id,
      payment_id: row.payment_id,
      category_id: row.category_id,
      amount: parseFloat(row.amount),
      category_name: row.category_name
    });
  }
}

class PaymentCategory {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || null;
    this.description = data.description || null;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.sort_order = data.sort_order || 0;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.name || this.name.trim() === '') {
      errors.push('Category name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toDatabase() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      is_active: this.is_active,
      sort_order: this.sort_order
    };
  }

  static fromDatabase(row) {
    return new PaymentCategory({
      id: row.id,
      name: row.name,
      description: row.description,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }
}

module.exports = { Payment, PaymentItem, PaymentCategory };
