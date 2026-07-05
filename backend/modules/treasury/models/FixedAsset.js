/**
 * FixedAsset Model
 * Represents a fixed asset for depreciation tracking
 */

class FixedAsset {
  constructor(data = {}) {
    this.id = data.id || null;
    this.asset_name = data.asset_name || '';
    this.asset_code = data.asset_code || '';
    this.description = data.description || '';
    this.category = data.category || 'equipment'; // building, vehicle, equipment, furniture, land, other
    this.purchase_date = data.purchase_date || null;
    this.purchase_price = data.purchase_price || 0;
    this.current_value = data.current_value || 0;
    this.salvage_value = data.salvage_value || 0;
    this.useful_life_years = data.useful_life_years || 5;
    this.depreciation_method = data.depreciation_method || 'straight_line'; // straight_line, declining_balance
    this.accumulated_depreciation = data.accumulated_depreciation || 0;
    this.depreciation_rate = data.depreciation_rate || 0;
    this.fund_id = data.fund_id || null;
    this.fund_name = data.fund_name || null;
    this.account_id = data.account_id || null;
    this.account_name = data.account_name || null;
    this.vendor_id = data.vendor_id || null;
    this.vendor_name = data.vendor_name || null;
    this.location = data.location || '';
    this.custodian = data.custodian || '';
    this.serial_number = data.serial_number || '';
    this.warranty_expiry = data.warranty_expiry || null;
    this.status = data.status || 'active'; // active, disposed, sold, stolen
    this.disposal_date = data.disposal_date || null;
    this.disposal_amount = data.disposal_amount || null;
    this.notes = data.notes || '';
    this.created_by = data.created_by || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  validate() {
    const errors = [];

    if (!this.asset_name || this.asset_name.trim() === '') {
      errors.push('Asset name is required');
    }

    if (!this.purchase_price || this.purchase_price < 0) {
      errors.push('Purchase price must be 0 or greater');
    }

    const validCategories = ['building', 'vehicle', 'equipment', 'furniture', 'land', 'other'];
    if (!validCategories.includes(this.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    const validMethods = ['straight_line', 'declining_balance', 'none'];
    if (!validMethods.includes(this.depreciation_method)) {
      errors.push(`Depreciation method must be one of: ${validMethods.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  toDatabase() {
    return {
      asset_name: this.asset_name,
      asset_code: this.asset_code,
      description: this.description,
      category: this.category,
      purchase_date: this.purchase_date,
      purchase_price: this.purchase_price,
      current_value: this.current_value,
      salvage_value: this.salvage_value,
      useful_life_years: this.useful_life_years,
      depreciation_method: this.depreciation_method,
      accumulated_depreciation: this.accumulated_depreciation,
      depreciation_rate: this.depreciation_rate,
      fund_id: this.fund_id,
      account_id: this.account_id,
      vendor_id: this.vendor_id,
      location: this.location,
      custodian: this.custodian,
      serial_number: this.serial_number,
      warranty_expiry: this.warranty_expiry,
      status: this.status,
      disposal_date: this.disposal_date,
      disposal_amount: this.disposal_amount,
      notes: this.notes,
      created_by: this.created_by
    };
  }

  static fromDatabase(row) {
    return new FixedAsset(row);
  }

  calculateDepreciation() {
    if (this.depreciation_method === 'none' || this.category === 'land') {
      return 0;
    }

    const depreciableAmount = this.purchase_price - this.salvage_value;
    
    if (this.depreciation_method === 'straight_line') {
      return depreciableAmount / this.useful_life_years;
    } else if (this.depreciation_method === 'declining_balance') {
      const rate = 2 / this.useful_life_years; // Double declining
      return (this.purchase_price - this.accumulated_depreciation) * rate;
    }

    return 0;
  }

  calculateCurrentValue() {
    this.current_value = Math.max(this.salvage_value, 
      this.purchase_price - this.accumulated_depreciation);
    return this.current_value;
  }

  recordAnnualDepreciation() {
    const annualDepreciation = this.calculateDepreciation();
    this.accumulated_depreciation += annualDepreciation;
    this.calculateCurrentValue();
    return annualDepreciation;
  }

  getRemainingLife() {
    if (!this.purchase_date) return this.useful_life_years;
    
    const purchase = new Date(this.purchase_date);
    const now = new Date();
    const yearsElapsed = (now - purchase) / (365.25 * 24 * 60 * 60 * 1000);
    
    return Math.max(0, this.useful_life_years - yearsElapsed);
  }

  dispose(disposalAmount, disposalDate) {
    this.status = 'disposed';
    this.disposal_amount = disposalAmount;
    this.disposal_date = disposalDate || new Date().toISOString().split('T')[0];
    this.calculateCurrentValue();
    return this;
  }

  getGainLoss() {
    if (!this.disposal_amount) return 0;
    return this.disposal_amount - this.current_value;
  }
}

module.exports = FixedAsset;
