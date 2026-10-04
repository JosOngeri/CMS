/**
 * @audit Payments controller (standard path; M-Pesa flow in payment.controller.js).
 * @fixed checkDuplicatePayment implemented on repo; updatePaymentStatus passes
 *        (id,status,null,churchId) with 404-before-mutate; createPayment inserts
 *        church_id+payment_date; all remaining mutations + getPaymentSummary
 *        church-scoped (2026-10-03).
 */
const BaseController = require('./BaseController');
const PaymentsRepository = require('../repositories/PaymentsRepository');
const paymentGateway = require('../services/PaymentGatewayService');
const { createLogger } = require('../helpers/controllerLogger');
const auditService = require('../services/auditService');
const { pool } = require('../config/database');

/**
 * Payments Controller
 * Handles payment methods, payment records, and payment processing
 */
class PaymentsController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('PaymentsController');
  }

  /**
   * Get all active payment methods
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentMethods(req, res) {
    try {
      const paymentMethods = await PaymentsRepository.getPaymentMethods();
      res.json({ success: true, data: paymentMethods });
    } catch (error) {
      this.logger.error('getPaymentMethods', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment methods' });
    }
  }

  /**
   * Get payments with filtering and pagination
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.memberId] - Filter by member ID
   * @param {string} [req.query.paymentMethodId] - Filter by payment method ID
   * @param {string} [req.query.paymentType] - Filter by payment type
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.startDate] - Filter by start date
   * @param {string} [req.query.endDate] - Filter by end date
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPayments(req, res) {
    try {
      const { memberId, paymentMethodId, paymentType, status, startDate, endDate, limit = 50, offset = 0, archived } = req.query;
      const churchId = req.user.church_id;

      const payments = await PaymentsRepository.getPaymentsWithFilters({
        memberId,
        paymentMethodId,
        paymentType,
        status,
        startDate,
        endDate,
        limit,
        offset,
        churchId,
        // ?archived=true → the archive page's view of soft-deleted rows
        archivedOnly: archived === 'true'
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      this.logger.error('getPayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payments' });
    }
  }

  /**
   * Create a new payment record
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.paymentMethodId - Payment method ID
   * @param {string} req.body.memberId - Member ID
   * @param {number} req.body.amount - Payment amount
   * @param {string} req.body.paymentType - Payment type
   * @param {string} [req.body.referenceNumber] - Reference number
   * @param {string} [req.body.transactionId] - Transaction ID
   * @param {string} [req.body.notes] - Payment notes
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPayment(req, res) {
    try {
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const churchSlug = req.user.church_slug;
      let payment;

      // Support the frontend M-Pesa payment form (phone_number + payment_items)
      if (req.body.phone_number && Array.isArray(req.body.payment_items)) {
        // Validation for M-Pesa form
        if (!req.body.phone_number || req.body.phone_number.trim() === '') {
          return res.status(400).json({ success: false, error: 'Phone number is required' });
        }

        // Normalize Kenyan phone input: accepts 2547..., +2547..., 07..., 7...,
        // with spaces/dashes — converts to E.164 (+2547XXXXXXXX)
        const digits = String(req.body.phone_number).replace(/[^\d]/g, '');
        let normalized = digits;
        if (/^0?7\d{8}$/.test(digits)) normalized = `254${digits.slice(-9)}`;
        if (!/^2547\d{8}$/.test(normalized)) {
          return res.status(400).json({ success: false, error: 'Enter a valid Safaricom number (e.g., 0712 345 678 or 254712345678)' });
        }
        const e164Phone = `+${normalized}`;

        if (!Array.isArray(req.body.payment_items) || req.body.payment_items.length === 0) {
          return res.status(400).json({ success: false, error: 'Payment items must be a non-empty array' });
        }

        const totalAmount = req.body.payment_items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        if (totalAmount <= 0) {
          return res.status(400).json({ success: false, error: 'Total amount must be greater than 0' });
        }

        const categoryNames = req.body.payment_items.map(item => item.category_name).filter(Boolean);
        const category = categoryNames.length > 0 ? categoryNames.join(', ') : 'general';

        payment = await PaymentsRepository.createPaymentFromFrontend({
          userId,
          churchId,
          churchSlug,
          phoneNumber: e164Phone,
          amount: totalAmount,
          category,
          notes: req.body.notes || null,
          paymentType: 'mpesa',
          currency: 'KES',
          // Persist the itemized split for the payment-detail quickview —
          // previously only the flattened `category` string survived.
          paymentItems: req.body.payment_items.map(item => ({
            category_name: item.category_name || 'general',
            amount: parseFloat(item.amount || 0)
          }))
        });

        // Actually send the M-Pesa STK push — creating the record alone
        // would leave the member waiting for a prompt that never comes.
        const stkPhone = normalized;
        try {
          const stkResult = await paymentGateway.initiateSTKPush({
            phoneNumber: stkPhone,
            amount: totalAmount,
            reference: `SDA-${payment.id}`,
            description: `${category} payment`,
          });

          if (!stkResult.success) {
            await PaymentsRepository.updatePaymentStatus(payment.id, 'failed', null, churchId);
            return res.status(400).json({ success: false, error: stkResult.error || 'M-Pesa prompt failed to send' });
          }

          await PaymentsRepository.updatePaymentStatus(payment.id, 'pending', stkResult.transactionId || null, churchId);
          payment.transaction_id = stkResult.transactionId || null;
        } catch (stkError) {
          this.logger.error('createPayment.stk', stkError);
          await PaymentsRepository.updatePaymentStatus(payment.id, 'failed', null, churchId).catch(() => {});
          return res.status(502).json({ success: false, error: 'Could not reach M-Pesa. Please try again.' });
        }
      } else {
        const { paymentMethodId, memberId, amount, paymentType, referenceNumber, transactionId, notes } = req.body;

        // Validation for standard payment form
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
          return res.status(400).json({ success: false, error: 'Amount must be a number greater than 0' });
        }

        if (req.body.payment_date) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(req.body.payment_date)) {
            return res.status(400).json({ success: false, error: 'Payment date must be in ISO format (YYYY-MM-DD)' });
          }
        }

        // Duplicate payment prevention - check for identical payment within 5 minutes
        const existingPayment = await PaymentsRepository.checkDuplicatePayment(
          memberId,
          parseFloat(amount),
          req.body.payment_date || new Date().toISOString().split('T')[0],
          churchId
        );
        if (existingPayment) {
          return res.status(409).json({
            success: false,
            error: 'Duplicate payment detected - a payment with the same details was recently processed'
          });
        }

        payment = await PaymentsRepository.createPayment(
          paymentMethodId,
          memberId,
          amount,
          paymentType,
          referenceNumber,
          transactionId,
          userId,
          notes,
          churchId,
          req.body.payment_date || null
        );
      }

      // Log audit event
      await auditService.log(
        churchId,
        userId,
        'CREATE',
        'payments',
        payment.id,
        null,
        payment,
        req.ip,
        req.get('user-agent')
      );

      res.status(201).json({
        success: true,
        message: 'Payment initiated successfully',
        data: payment
      });
    } catch (error) {
      this.logger.error('createPayment', error);
      res.status(500).json({ success: false, error: 'Failed to create payment', details: error.message });
    }
  }

  /**
   * Update payment status
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Payment ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.status - New status
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      // Validate status value
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Get old payment for audit log — scoped read also gates the mutation
      const oldPayment = await PaymentsRepository.getPaymentById(id, churchId);

      if (!oldPayment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      // churchId goes in the repo's churchId param (was passed as transactionId,
      // writing the church UUID into payments.transaction_id + no tenant scope)
      const payment = await PaymentsRepository.updatePaymentStatus(id, status, null, churchId);

      // Log audit event
      await auditService.log(
        churchId,
        userId,
        'UPDATE_STATUS',
        'payments',
        id,
        oldPayment,
        payment,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });
    } catch (error) {
      this.logger.error('updatePaymentStatus', error);
      res.status(500).json({ success: false, error: 'Failed to update payment status' });
    }
  }

  /**
   * Archive (soft-delete) a payment — hides it from the working list while
   * keeping the full record. Financial rows are never hard-deleted.
   */
  async archivePayment(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const oldPayment = await PaymentsRepository.getPaymentById(id, churchId);
      if (!oldPayment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      if (oldPayment.archived_at) {
        return res.status(400).json({ success: false, error: 'Payment is already archived' });
      }

      const payment = await PaymentsRepository.archivePayment(id, userId, churchId);

      await auditService.log(
        churchId, userId, 'ARCHIVE', 'payments', id,
        oldPayment, payment, req.ip, req.get('user-agent')
      );

      res.json({ success: true, message: 'Payment archived', data: payment });
    } catch (error) {
      this.logger.error('archivePayment', error);
      res.status(500).json({ success: false, error: 'Failed to archive payment' });
    }
  }

  async restorePayment(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;
      const userId = req.user.id;

      const oldPayment = await PaymentsRepository.getPaymentById(id, churchId);
      if (!oldPayment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      if (!oldPayment.archived_at) {
        return res.status(400).json({ success: false, error: 'Payment is not archived' });
      }

      const payment = await PaymentsRepository.restorePayment(id, churchId);

      await auditService.log(
        churchId, userId, 'RESTORE', 'payments', id,
        oldPayment, payment, req.ip, req.get('user-agent')
      );

      res.json({ success: true, message: 'Payment restored', data: payment });
    } catch (error) {
      this.logger.error('restorePayment', error);
      res.status(500).json({ success: false, error: 'Failed to restore payment' });
    }
  }

  /**
   * Get pledges with filtering
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.memberId] - Filter by member ID
   * @param {string} [req.query.status] - Filter by status
   * @param {string} [req.query.pledgeType] - Filter by pledge type
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPledges(req, res) {
    try {
      const { memberId, status, pledgeType } = req.query;
      const churchId = req.user.church_id;

      const pledges = await PaymentsRepository.getPledgesWithFilters({
        memberId,
        status,
        pledgeType,
        churchId
      });

      res.json({ success: true, data: pledges });
    } catch (error) {
      this.logger.error('getPledges', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledges' });
    }
  }

  /**
   * Create a new pledge
   * @param {Object} req - Express request object
   * @param {Object} req.body - Request body
   * @param {string} req.body.memberId - Member ID
   * @param {number} req.body.amount - Pledge amount
   * @param {string} req.body.pledgeType - Pledge type
   * @param {string} [req.body.startDate] - Start date
   * @param {string} [req.body.endDate] - End date
   * @param {string} [req.body.frequency] - Payment frequency
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async createPledge(req, res) {
    try {
      const { memberId, amount, pledgeType, startDate, endDate, frequency } = req.body;
      const churchId = req.user.church_id;

      const pledge = await PaymentsRepository.createPledge(
        memberId,
        amount,
        pledgeType,
        startDate,
        endDate,
        frequency,
        churchId
      );

      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Member not found in this church' });
      }

      res.status(201).json({
        success: true,
        message: 'Pledge created successfully',
        data: pledge
      });
    } catch (error) {
      this.logger.error('createPledge', error);
      res.status(500).json({ success: false, error: 'Failed to create pledge' });
    }
  }

  /**
   * Add payment to a pledge
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.pledgeId - Pledge ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.paymentId - Payment ID
   * @param {number} req.body.amount - Payment amount
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async addPledgePayment(req, res) {
    try {
      const { pledgeId } = req.params;
      const { paymentId, amount } = req.body;
      const churchId = req.user.church_id;

      const pledgePayment = await PaymentsRepository.addPledgePayment(pledgeId, paymentId, amount, churchId);

      if (!pledgePayment) {
        return res.status(404).json({ success: false, error: 'Pledge or payment not found in this church' });
      }

      res.status(201).json({
        success: true,
        message: 'Pledge payment added successfully',
        data: pledgePayment
      });
    } catch (error) {
      this.logger.error('addPledgePayment', error);
      res.status(500).json({ success: false, error: 'Failed to add pledge payment' });
    }
  }

  /**
   * Get payment summary for a date range
   * @param {Object} req - Express request object
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.startDate] - Start date
   * @param {string} [req.query.endDate] - End date
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const summary = await PaymentsRepository.getPaymentSummary(startDate, endDate, req.user.church_id);

      res.json({ success: true, data: summary });
    } catch (error) {
      this.logger.error('getPaymentSummary', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment summary' });
    }
  }

  /**
   * Get payment categories
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getPaymentCategories(req, res) {
    try {
      const categories = await PaymentsRepository.getPaymentCategories();
      res.json({ success: true, categories });
    } catch (error) {
      this.logger.error('getPaymentCategories', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment categories' });
    }
  }

  /**
   * Get payments for the currently authenticated user
   * @param {Object} req - Express request object
   * @param {Object} req.user - Authenticated user
   * @param {Object} req.query - Query parameters
   * @param {string} [req.query.status] - Filter by status
   * @param {number} [req.query.limit=50] - Limit results
   * @param {number} [req.query.offset=0] - Offset for pagination
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getMyPayments(req, res) {
    try {
      const userId = req.user.id;
      const { status, limit = 50, offset = 0 } = req.query;

      const payments = await PaymentsRepository.getMyPayments(userId, {
        status,
        limit,
        offset,
        churchId: req.user.church_id
      });

      res.json({ success: true, payments });
    } catch (error) {
      this.logger.error('getMyPayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch your payments' });
    }
  }

  /**
   * Download/generate a receipt for a specific payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.id - Payment ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;
      const roles = req.user.roles || [];

      // Members may only print their own receipts; finance staff can print
      // any payment in their church (they administer the records).
      let payment = await PaymentsRepository.getPaymentForReceipt(id, userId);
      if (!payment && roles.some(r => ['Super Admin', 'Pastor', 'Treasurer', 'First Elder', 'Department Head'].includes(r))) {
        payment = await PaymentsRepository.getPaymentForReceiptAdmin(id, churchId);
      }

      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      // PDF is the default — web and mobile both download the file without a
      // format param, which used to hand them this JSON blob saved as ".pdf".
      // Opt out explicitly with ?format=json.
      if (req.query.format === 'json') {
        return res.json({
          success: true,
          receipt: {
            receiptNumber: `REC-${payment.id}`,
            paymentId: payment.id,
            memberName: payment.member_name,
            amount: payment.amount,
            paymentType: payment.payment_type,
            paymentMethod: payment.payment_method_name,
            status: payment.status,
            date: payment.payment_date,
            referenceNumber: payment.reference_number,
          }
        });
      }

      // Church name for the receipt header.
      const churchRow = payment.church_id
        ? (await pool.query('SELECT name FROM churches WHERE id = $1', [payment.church_id])).rows[0]
        : null;
      const churchName = churchRow?.name || 'Msabato Church';

      const { jsPDF } = require('jspdf');
      const autoTable = require('jspdf-autotable').default;
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // ── Header band ────────────────────────────────────────────────
      doc.setFillColor(30, 64, 175); // primary blue band
      doc.rect(0, 0, pageW, 34, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(churchName.toUpperCase(), pageW / 2, 14, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('OFFICIAL PAYMENT RECEIPT', pageW / 2, 24, { align: 'center' });

      doc.setTextColor(30, 30, 30);

      // ── Receipt meta block ─────────────────────────────────────────
      const receiptNo = `REC-${String(payment.id).slice(0, 8).toUpperCase()}`;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Receipt No: ${receiptNo}`, 15, 46);
      doc.setFont('helvetica', 'normal');
      const paidDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'N/A';
      doc.text(`Date: ${paidDate}`, pageW - 15, 46, { align: 'right' });
      doc.text(`Status: ${String(payment.status || '').toUpperCase()}`, pageW - 15, 52, { align: 'right' });

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 56, pageW - 15, 56);

      // ── Payer block ────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.text('Received From', 15, 66);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(payment.member_name || 'Walk-in / Unknown', 15, 73);
      if (payment.phone_number) doc.text(payment.phone_number, 15, 79);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Details', pageW - 15, 66, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      const methodLabel = payment.payment_method_name || payment.payment_method || 'N/A';
      const methodDisplay = methodLabel.replace(/\b\w/g, c => c.toUpperCase());
      doc.text(`Method: ${methodDisplay}`, pageW - 15, 73, { align: 'right' });
      const ref = payment.mpesa_receipt || payment.mpesa_receipt_number || payment.transaction_id || payment.reference_number;
      if (ref) doc.text(`Ref: ${ref}`, pageW - 15, 79, { align: 'right' });

      // ── Itemized breakdown (payment_items: tithe 200 + pathfinder 100) ──
      const items = Array.isArray(payment.payment_items) && payment.payment_items.length
        ? payment.payment_items
        : [{ category_name: payment.category || payment.payment_type || 'general', amount: payment.amount }];

      autoTable(doc, {
        startY: 88,
        head: [['#', 'Category', 'Amount (KES)']],
        body: items.map((it, i) => [
          String(i + 1),
          String(it.category_name || it.category || 'Item').replace(/\b\w/g, c => c.toUpperCase()),
          parseFloat(it.amount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }),
        ]),
        foot: [['', 'TOTAL', parseFloat(payment.amount ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })]],
        theme: 'striped',
        headStyles: { fillColor: [30, 64, 175], fontSize: 10 },
        footStyles: { fillColor: [230, 235, 250], textColor: [20, 20, 20], fontStyle: 'bold', fontSize: 10 },
        columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right' } },
        margin: { left: 15, right: 15 },
      });

      // ── Footer ─────────────────────────────────────────────────────
      const tableEndY = (doc.lastAutoTable?.finalY || 120) + 14;
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Thank you for your giving. This is a computer-generated receipt', pageW / 2, tableEndY, { align: 'center' });
      doc.text(`and does not require a signature.`, pageW / 2, tableEndY + 5, { align: 'center' });
      doc.text(`Generated by Msabato CMS · ${new Date().toLocaleString('en-KE')}`, pageW / 2, tableEndY + 14, { align: 'center' });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${receiptNo}.pdf"`);
      return res.send(pdfBuffer);
    } catch (error) {
      this.logger.error('downloadReceipt', error);
      res.status(500).json({ success: false, error: 'Failed to generate receipt' });
    }
  }

  /**
   * Get all refunds
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async getRefunds(req, res) {
    try {
      const churchId = req.user.church_id;
      const refunds = await PaymentsRepository.getRefunds(churchId);

      res.json({ success: true, refunds });
    } catch (error) {
      this.logger.error('getRefunds', error);
      res.status(500).json({ success: false, error: 'Failed to fetch refunds' });
    }
  }

  /**
   * Request a refund for a payment
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.paymentId - Payment ID
   * @param {Object} req.body - Request body
   * @param {string} req.body.reason - Refund reason
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async refundPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      const payment = await PaymentsRepository.getPaymentById(paymentId, churchId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      // Standardized refund workflow: only completed payments can be refunded
      if (payment.status !== 'completed') {
        return res.status(400).json({ success: false, error: 'Only completed payments can be refunded' });
      }

      const refund = await PaymentsRepository.createRefund(paymentId, payment.amount, reason, userId, churchId);

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('refundPayment', error);
      res.status(500).json({ success: false, error: 'Failed to request refund' });
    }
  }

  /**
   * Approve a refund request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async approveRefund(req, res) {
    try {
      const { refundId } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      // updateRefundStatus only transitions pending refunds (repo-level guard)
      const refund = await PaymentsRepository.updateRefundStatus(refundId, 'approved', userId, churchId);

      if (!refund) {
        return res.status(404).json({ success: false, error: 'Refund not found or already processed' });
      }

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('approveRefund', error);
      res.status(500).json({ success: false, error: 'Failed to approve refund' });
    }
  }

  /**
   * Reject a refund request
   * @param {Object} req - Express request object
   * @param {Object} req.params - Route parameters
   * @param {string} req.params.refundId - Refund ID
   * @param {Object} req.user - Authenticated user
   * @param {Object} res - Express response object
   * @returns {Promise<void>}
   */
  async rejectRefund(req, res) {
    try {
      const { refundId } = req.params;
      const userId = req.user.id;
      const churchId = req.user.church_id;

      // updateRefundStatus only transitions pending refunds (repo-level guard)
      const refund = await PaymentsRepository.updateRefundStatus(refundId, 'rejected', userId, churchId);

      if (!refund) {
        return res.status(404).json({ success: false, error: 'Refund not found or already processed' });
      }

      res.json({ success: true, refund });
    } catch (error) {
      this.logger.error('rejectRefund', error);
      res.status(500).json({ success: false, error: 'Failed to reject refund' });
    }
  }

  async createPaymentMethod(req, res) {
    try {
      const { name, type, provider, config, isActive } = req.body;
      const paymentMethod = await PaymentsRepository.createPaymentMethod({
        name, type, provider, config, isActive
      });
      res.status(201).json({ success: true, data: paymentMethod });
    } catch (error) {
      this.logger.error('createPaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to create payment method' });
    }
  }

  async updatePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      const { name, type, provider, config, isActive } = req.body;
      const paymentMethod = await PaymentsRepository.updatePaymentMethod(id, {
        name, type, provider, config, isActive
      });
      res.json({ success: true, data: paymentMethod });
    } catch (error) {
      this.logger.error('updatePaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to update payment method' });
    }
  }

  async deletePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      await PaymentsRepository.deletePaymentMethod(id);
      res.json({ success: true, message: 'Payment method deleted' });
    } catch (error) {
      this.logger.error('deletePaymentMethod', error);
      res.status(500).json({ success: false, error: 'Failed to delete payment method' });
    }
  }

  async updatePayment(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;
      const { amount, paymentMethodId, paymentType, status, notes } = req.body;
      const existing = await PaymentsRepository.getPaymentById(id, churchId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      const payment = await PaymentsRepository.updatePayment(id, {
        amount, paymentMethodId, paymentType, status, notes
      }, churchId);
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('updatePayment', error);
      res.status(500).json({ success: false, error: 'Failed to update payment' });
    }
  }

  async deletePayment(req, res) {
    try {
      const { id } = req.params;
      const churchId = req.user.church_id;
      const existing = await PaymentsRepository.getPaymentById(id, churchId);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      await PaymentsRepository.deletePayment(id, churchId);
      res.json({ success: true, message: 'Payment deleted' });
    } catch (error) {
      this.logger.error('deletePayment', error);
      res.status(500).json({ success: false, error: 'Failed to delete payment' });
    }
  }

  async updatePledge(req, res) {
    try {
      const { id } = req.params;
      const { amount, pledgeType, startDate, endDate, frequency, status } = req.body;
      const pledge = await PaymentsRepository.updatePledge(id, {
        amount, pledgeType, startDate, endDate, frequency, status
      }, req.user.church_id);
      if (!pledge) {
        return res.status(404).json({ success: false, error: 'Pledge not found' });
      }
      res.json({ success: true, data: pledge });
    } catch (error) {
      this.logger.error('updatePledge', error);
      res.status(500).json({ success: false, error: 'Failed to update pledge' });
    }
  }

  async deletePledge(req, res) {
    try {
      const { id } = req.params;
      await PaymentsRepository.deletePledge(id, req.user.church_id);
      res.json({ success: true, message: 'Pledge deleted' });
    } catch (error) {
      this.logger.error('deletePledge', error);
      res.status(500).json({ success: false, error: 'Failed to delete pledge' });
    }
  }

  async getPledgePayments(req, res) {
    try {
      const { pledgeId } = req.params;
      const payments = await PaymentsRepository.getPledgePayments(pledgeId, req.user.church_id);
      res.json({ success: true, data: payments });
    } catch (error) {
      this.logger.error('getPledgePayments', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pledge payments' });
    }
  }

  async getPaymentAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const churchId = req.user.church_id;
      const analytics = await PaymentsRepository.getPaymentAnalytics(startDate, endDate, churchId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      this.logger.error('getPaymentAnalytics', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment analytics' });
    }
  }

  async getPaymentTrends(req, res) {
    try {
      const { months = 12 } = req.query;
      const churchId = req.user.church_id;
      const trends = await PaymentsRepository.getPaymentTrends(months, churchId);
      res.json({ success: true, data: trends });
    } catch (error) {
      this.logger.error('getPaymentTrends', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment trends' });
    }
  }

  async verifyPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await PaymentsRepository.verifyPayment(id, req.user.church_id);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('verifyPayment', error);
      res.status(500).json({ success: false, error: 'Failed to verify payment' });
    }
  }

  async cancelPayment(req, res) {
    try {
      const { id } = req.params;
      const payment = await PaymentsRepository.cancelPayment(id, req.user.church_id);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('cancelPayment', error);
      res.status(500).json({ success: false, error: 'Failed to cancel payment' });
    }
  }

  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      // Catch-all route also receives non-UUID paths (e.g. /payments/history) —
      // a malformed id is a 404, not a server error.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      const churchId = req.user.church_id;
      const payment = await PaymentsRepository.getPaymentById(id, churchId);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }
      res.json({ success: true, data: payment });
    } catch (error) {
      this.logger.error('getPaymentById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch payment' });
    }
  }
}

module.exports = new PaymentsController();