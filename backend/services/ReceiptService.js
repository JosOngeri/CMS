const ManualPaymentRepository = require('../repositories/ManualPaymentRepository');
const numberingService = require('./numberingService');

/**
 * Receipt Service
 * Handles receipt number generation and virtual receipt assembly
 * for manual payments
 */
class ReceiptService {
  /**
   * Generate unique receipt number (sequential per church per day)
   * @param {string} churchId - Church ID for tenant-scoped sequencing
   * @returns {Promise<string>} Receipt number (KMC-YYYYMMDD-NNNN)
   */
  async generateReceiptNumber(churchId) {
    const prefix = 'KMC';
    // Atomic per-church daily sequence — no count-then-insert race
    const seq = await ManualPaymentRepository.getNextReceiptSequence(churchId);
    return numberingService.generateDailySequenceNumber(prefix, seq);
  }

  /**
   * Assemble virtual receipt payload from a payment record with details
   * @param {Object} payment - Payment row joined with church/member details
   * @returns {Object} Virtual receipt data
   */
  buildVirtualReceipt(payment) {
    return {
      receiptNumber: payment.receipt_number,
      churchName: payment.church_name,
      churchAddress: payment.church_address,
      churchPhone: payment.church_phone,
      memberName: payment.member_name || 'Walk-in',
      memberPhone: payment.member_phone,
      memberAddress: payment.member_address,
      amount: payment.amount,
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
      paymentType: payment.payment_type,
      paymentDate: payment.payment_date,
      recordedBy: payment.recorded_by_name,
      recordedAt: payment.created_at,
      notes: payment.notes,
      status: payment.status
    };
  }
}

module.exports = new ReceiptService();
