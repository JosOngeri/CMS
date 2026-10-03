const VendorsRepository = require('../repositories/VendorsRepository');
const numberingService = require('./numberingService');

/**
 * Vendor Service
 * Business rules for vendor management: code generation and
 * transaction-aware archiving (vendors with transactions are
 * archived instead of deleted to preserve the audit trail)
 */
class VendorService {
  /**
   * Generate a vendor code (VND-NNNN)
   * @returns {string} Vendor code
   */
  generateVendorCode() {
    return numberingService.generateVendorCode();
  }

  /**
   * Create a vendor, generating a code when one is not supplied
   * @param {Object} data - Vendor fields (vendor_code optional)
   * @returns {Promise<Object>} Created vendor
   */
  async createVendor(data) {
    const vendor_code = data.vendor_code || this.generateVendorCode();
    return VendorsRepository.createVendor({ ...data, vendor_code });
  }

  /**
   * Delete a vendor, or archive it when transactions exist
   * @param {string} id - Vendor ID
   * @returns {Promise<{vendor: Object|null, archived: boolean}>}
   */
  async deleteOrArchiveVendor(id, churchId) {
    // Check if vendor has transactions
    const transactionCount = await VendorsRepository.getVendorTransactionCount(id, churchId);

    if (transactionCount > 0) {
      const archived = await VendorsRepository.archiveVendor(id, churchId);
      return { vendor: archived, archived: true };
    }

    const vendor = await VendorsRepository.deleteVendor(id, churchId);
    return { vendor, archived: false };
  }
}

module.exports = new VendorService();
