const BaseController = require('./BaseController');
const VendorsRepository = require('../repositories/VendorsRepository');
const VendorService = require('../services/VendorService');
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

      const vendors = await VendorsRepository.getAllVendors({ is_active, search, church_id: req.user.church_id });

      res.json({ success: true, vendors });
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

      const vendor = await VendorsRepository.getVendorById(id, req.user.church_id);

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({ success: true, vendor });
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

      const vendor = await VendorService.createVendor({
        vendor_code,
        vendor_name,
        contact_person,
        phone,
        email,
        address,
        city,
        country,
        tax_id,
        payment_terms,
        created_by: req.user.id,
        church_id: req.user.church_id
      });

      res.json({ success: true, vendor });
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
      }, req.user.church_id);

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({ success: true, vendor });
    } catch (error) {
      this.logger.error('updateVendor', error);
      res.status(500).json({ success: false, error: 'Failed to update vendor' });
    }
  }

  /**
   * Delete vendor — vendors with transactions are archived instead
   * (VendorService decides; preserves the financial audit trail)
   */
  async deleteVendor(req, res) {
    try {
      const { id } = req.params;

      const { vendor, archived } = await VendorService.deleteOrArchiveVendor(id, req.user.church_id);

      if (!vendor) {
        return res.status(404).json({ success: false, error: 'Vendor not found' });
      }

      res.json({
        success: true,
        vendor,
        message: archived
          ? 'Vendor has transactions and was archived instead of deleted'
          : 'Vendor deleted successfully'
      });
    } catch (error) {
      this.logger.error('deleteVendor', error);
      res.status(500).json({ success: false, error: 'Failed to delete vendor' });
    }
  }
}

module.exports = new VendorsController();
