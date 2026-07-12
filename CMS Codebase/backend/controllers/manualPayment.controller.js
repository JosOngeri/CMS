const BaseController = require('./BaseController');
const ResponseHandler = require('../utils/ResponseHandler');
const { createLogger } = require('../helpers/controllerLogger');
const NameMatcher = require('../services/nameMatcher');
const ManualPaymentRepository = require('../repositories/ManualPaymentRepository');

/**
 * Manual Payment Controller (Phase 12)
 * Handles cash and manual payment entries with virtual receipt generation
 */
class ManualPaymentController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ManualPaymentController');
  }

  /**
   * Create manual payment entry
   */
  async createManualPayment(req, res) {
    const { 
      member_id, 
      amount, 
      payment_method, 
      reference_number, 
      notes, 
      payment_date,
      payment_type = 'contribution'
    } = req.body;
    const churchId = req.user.church_id;
    const userId = req.user.id;

    try {
      // Validate required fields
      if (!amount || !payment_method) {
        return ResponseHandler.error(res, 'Amount and payment method are required', 400);
      }

      // Generate virtual receipt number
      const receiptNumber = await this.generateReceiptNumber(churchId);

      // Insert manual payment
      const result = await ManualPaymentRepository.createManualPayment({
        member_id: member_id || null,
        church_id: churchId,
        amount,
        payment_method,
        reference_number: reference_number || null,
        notes: notes || null,
        payment_date: payment_date || new Date().toISOString(),
        payment_type,
        receipt_number: receiptNumber,
        recorded_by: userId,
        status: 'verified'
      });

      this.logger.info(`Manual payment created: ${receiptNumber} - KES ${amount}`);

      return ResponseHandler.success(
        res,
        result,
        'Manual payment recorded successfully',
        201
      );
    } catch (error) {
      this.logger.error('createManualPayment', error);
      return ResponseHandler.error(res, 'Failed to record manual payment');
    }
  }

  /**
   * Generate unique receipt number
   */
  async generateReceiptNumber(churchId) {
    const prefix = 'KMC';
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // Get sequential number for today
    const count = await ManualPaymentRepository.getTodayPaymentCount(churchId);

    const sequence = (count + 1).toString().padStart(4, '0');

    return `${prefix}-${dateStr}-${sequence}`;
  }

  /**
   * Get manual payments for a church
   */
  async getManualPayments(req, res) {
    const churchId = req.user.church_id;
    const { limit = 50, offset = 0, payment_method, start_date, end_date } = req.query;

    try {
      const result = await ManualPaymentRepository.getManualPayments(churchId, {
        limit,
        offset,
        payment_method,
        start_date,
        end_date
      });

      return ResponseHandler.success(res, result);
    } catch (error) {
      this.logger.error('getManualPayments', error);
      return ResponseHandler.error(res, 'Failed to fetch manual payments');
    }
  }

  /**
   * Get payment by receipt number
   */
  async getPaymentByReceipt(req, res) {
    const { receiptNumber } = req.params;
    const churchId = req.user.church_id;

    try {
      const result = await ManualPaymentRepository.getPaymentByReceipt(receiptNumber, churchId);

      if (!result) {
        return ResponseHandler.error(res, 'Payment not found', 404);
      }

      return ResponseHandler.success(res, result);
    } catch (error) {
      this.logger.error('getPaymentByReceipt', error);
      return ResponseHandler.error(res, 'Failed to fetch payment');
    }
  }

  /**
   * Generate virtual receipt
   */
  async generateVirtualReceipt(req, res) {
    const { receiptNumber } = req.params;
    const churchId = req.user.church_id;

    try {
      const payment = await ManualPaymentRepository.getPaymentWithDetails(receiptNumber, churchId);

      if (!payment) {
        return ResponseHandler.error(res, 'Payment not found', 404);
      }

      // Generate receipt data
      const receipt = {
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

      return ResponseHandler.success(res, receipt);
    } catch (error) {
      this.logger.error('generateVirtualReceipt', error);
      return ResponseHandler.error(res, 'Failed to generate receipt');
    }
  }

  /**
   * Update manual payment
   */
  async updateManualPayment(req, res) {
    const { id } = req.params;
    const { amount, payment_method, reference_number, notes, payment_date } = req.body;
    const churchId = req.user.church_id;

    try {
      // Check if payment exists and belongs to church
      const existing = await ManualPaymentRepository.findById(id, churchId);

      if (!existing) {
        return ResponseHandler.error(res, 'Payment not found', 404);
      }

      // Check if payment is locked (verified)
      if (existing.is_verified) {
        return ResponseHandler.error(res, 'Cannot modify verified payment', 403);
      }

      // Update payment
      const result = await ManualPaymentRepository.updatePayment(id, churchId, {
        amount,
        payment_method,
        reference_number,
        notes,
        payment_date
      });

      this.logger.info(`Manual payment updated: ${id}`);

      return ResponseHandler.success(res, result, 'Payment updated successfully');
    } catch (error) {
      this.logger.error('updateManualPayment', error);
      return ResponseHandler.error(res, 'Failed to update payment');
    }
  }

  /**
   * Delete manual payment
   */
  async deleteManualPayment(req, res) {
    const { id } = req.params;
    const churchId = req.user.church_id;

    try {
      // Check if payment exists and belongs to church
      const existing = await ManualPaymentRepository.findById(id, churchId);

      if (!existing) {
        return ResponseHandler.error(res, 'Payment not found', 404);
      }

      // Check if payment is locked (verified)
      if (existing.is_verified) {
        return ResponseHandler.error(res, 'Cannot delete verified payment', 403);
      }

      await ManualPaymentRepository.deletePayment(id);

      this.logger.info(`Manual payment deleted: ${id}`);

      return ResponseHandler.success(res, null, 'Payment deleted successfully');
    } catch (error) {
      this.logger.error('deleteManualPayment', error);
      return ResponseHandler.error(res, 'Failed to delete payment');
    }
  }

  /**
   * Match payment to member using name matcher
   */
  async matchPaymentToMember(req, res) {
    const { paymentId, memberName } = req.body;
    const churchId = req.user.church_id;

    try {
      // Get all members for the church
      const members = await ManualPaymentRepository.getChurchMembers(churchId);

      // Use name matcher to find best match
      const bestMatch = NameMatcher.findBestMatch(memberName, members, 0.7);

      if (!bestMatch) {
        return ResponseHandler.success(res, { matched: false, matches: [] });
      }

      // Update payment with matched member
      await ManualPaymentRepository.updatePaymentMember(paymentId, bestMatch.id);

      return ResponseHandler.success(res, {
        matched: true,
        member: bestMatch,
        confidence: bestMatch.similarity
      });
    } catch (error) {
      this.logger.error('matchPaymentToMember', error);
      return ResponseHandler.error(res, 'Failed to match payment to member');
    }
  }

  /**
   * Get manual payment statistics
   */
  async getManualPaymentStats(req, res) {
    const churchId = req.user.church_id;
    const { start_date, end_date } = req.query;

    try {
      const result = await ManualPaymentRepository.getPaymentStats(
        churchId,
        start_date || null,
        end_date || null
      );

      return ResponseHandler.success(res, result);
    } catch (error) {
      this.logger.error('getManualPaymentStats', error);
      return ResponseHandler.error(res, 'Failed to fetch statistics');
    }
  }
}

module.exports = new ManualPaymentController();