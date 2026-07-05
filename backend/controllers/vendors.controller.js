const BaseController = require('./BaseController');
const VendorsRepository = require('../repositories/VendorsRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Vendors Controller
 * Handles vendor management for treasury operations
 */
class VendorsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('VendorsController');
  }

  /**
   * Get all vendors
   */
  async getAllVendors(req, res) {
    try {
      const { is_active, search } = req.query;

      const vendors = await VendorsRepository.getAllVendors({ is_active, search });

      res.json({ success: true, data: vendors });
    } catch (error) {
      this.logger.error('getAllVendors', error);
      res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
    }
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(req, res) {
    try {
      const { id } = req.params;

      const vendor = await VendorsRepository.getVendorById(id);

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({ success: true, data: vendor });
    } catch (error) {
      this.logger.error('getVendorById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch vendor' });
    }
  }

  /**
   * Create new vendor
   */
  async createVendor(req, res) {
    try {
      const {
        vendor_code, vendor_name, contact_person, phone, email,
        address, city, country, tax_id, payment_terms
      } = req.body;

      // Generate vendor code if not provided
      const code = vendor_code || `VND-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

      const vendor = await VendorsRepository.createVendor({
        vendor_code: code,
        vendor_name,
        contact_person,
        phone,
        email,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        created_by: req.user.id
      });

      res.json({ success: true, data: vendor });
    } catch (error) {
      this.logger.error('createVendor', error);
      res.status(500).json({ success: false, error: 'Failed to create vendor' });
    }
  }

  /**
   * Update vendor
   */
  async updateVendor(req, res) {
    try {
      const { id } = req.params;
      const {
        vendor_name, contact_person, phone, email,
        address, city, country, tax_id, payment_terms, is_active
      } = req.body;

      const vendor = await VendorsRepository.updateVendor(id, {
        vendor_name, contact_person, phone, email,
        address, city, country, tax_id, payment_terms, is_active
      });

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({ success: true, data: vendor });
    } catch (error) {
      this.logger.error('updateVendor', error);
      res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
  }

  /**
   * Delete vendor
   */
  async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      // Check if vendor has transactions
      const transactionCount = await VendorsRepository.getVendorTransactionCount(id);

      if (transactionCount > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete vendor with transactions. Archive instead.'
        });
      }

      const vendor = await VendorsRepository.deleteVendor(id);

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error) {
      this.logger.error('deleteVendor', error);
      res.status(500).json({ success: false, error: 'Failed to delete vendor' });
    }
  }
}

module.exports = new VendorsController();
