/**
 * Vendor Model
 * Represents a vendor/payee for expenses
 */

class Vendor {
  constructor(data = {}) {
    this.id = data.id || null;
    this.vendor_name = data.vendor_name || '';
    this.vendor_code = data.vendor_code || '';
    this.contact_person = data.contact_person || '';
    this.email = data.email || '';
    this.phone = data.phone || '';
    this.address = data.address || '';
    this.city = data.city || '';
    this.state = data.state || '';
    this.postal_code = data.postal_code || '';
    this.country = data.country || 'Kenya';
    this.tax_id = data.tax_id || '';
    this.payment_terms = data.payment_terms || 'Net 30';
    this.bank_account = data.bank_account || '';
    this.bank_name = data.bank_name || '';
    this.swift_code = data.swift_code || '';
    this.preferred_payment_method = data.preferred_payment_method || 'bank_transfer';
    this.category = data.category || 'other';
    this.notes = data.notes || '';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.vendor_name || this.vendor_name.trim() === '') {
      errors.push('Vendor name is required');
    }

    if (this.email && !this.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      vendor_name: this.vendor_name,
      vendor_code: this.vendor_code,
      contact_person: this.contact_person,
      email: this.email,
      phone: this.phone,
      address: this.address,
      city: this.city,
      state: this.state,
      postal_code: this.postal_code,
      country: this.country,
      tax_id: this.tax_id,
      payment_terms: this.payment_terms,
      bank_account: this.bank_account,
      bank_name: this.bank_name,
      swift_code: this.swift_code,
      preferred_payment_method: this.preferred_payment_method,
      category: this.category,
      notes: this.notes,
      is_active: this.is_active
    };
  }

  static fromDatabase(row) {
    return new Vendor(row);
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  getFullAddress() {
    const parts = [this.address, this.city, this.state, this.postal_code, this.country].filter(Boolean);
    return parts.join(', ');
  }
}

module.exports = Vendor;
