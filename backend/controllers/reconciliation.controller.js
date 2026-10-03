const BaseController = require('./BaseController');
const ReconciliationRepository = require('../repositories/ReconciliationRepository');
const { createLogger } = require('../helpers/controllerLogger');

/**
 * Reconciliation Controller (REQ-FR-004)
 * Handles "Name-First" forensic auditing of financial transactions
 */
class ReconciliationController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('ReconciliationController');
  }

  async pushFromRelay(req, res) {
    const { transactions } = req.body;
    const churchId = req.user.church_id;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ success: false, error: 'transactions must be a non-empty array' });
    }

    try {
      await ReconciliationRepository.pushTransactions(
        transactions.map(tx => ({
          church_id: churchId,
          transaction_code: tx.code,
          sender_name: tx.name,
          amount: tx.amount,
          source_type: tx.source
        }))
      );
      res.json({ success: true, message: 'Transactions pushed to queue' });
    } catch (error) {
      this.logger.error('pushFromRelay', error);
      res.status(500).json({ success: false, error: 'Failed to push transactions' });
    }
  }

  async getPending(req, res) {
    const churchId = req.user.church_id;

    try {
      const pending = await ReconciliationRepository.getPendingTransactions(churchId);
      res.json({ success: true, pending: pending });
    } catch (error) {
      this.logger.error('getPending', error);
      res.status(500).json({ success: false, error: 'Failed to fetch pending transactions' });
    }
  }

  async verifyTransaction(req, res) {
    const { transactionId, status, notes } = req.body;
    const userId = req.user.id;
    const churchId = req.user.church_id;

    try {
      // Forensic Audit: history assembly handled by the repository
      const updated = await ReconciliationRepository.verifyWithAuditTrail(
        transactionId, status, notes, userId, churchId
      );

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      res.json({ success: true });
    } catch (error) {
      this.logger.error('verifyTransaction', error);
      res.status(500).json({ success: false, error: 'Failed to verify transaction' });
    }
  }
}

module.exports = new ReconciliationController();
