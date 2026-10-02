const BaseController = require('./BaseController');
const ReconciliationRepository = require('../repositories/ReconciliationRepository');

/**
 * Reconciliation Controller (REQ-FR-004)
 * Handles "Name-First" forensic auditing of financial transactions
 */
class ReconciliationController extends BaseController {

  async pushFromRelay(req, res) {
    const { transactions } = req.body;
    const churchId = req.user.church_id;

    try {
      for (const tx of transactions) {
        await ReconciliationRepository.pushTransaction({
          church_id: churchId,
          transaction_code: tx.code,
          sender_name: tx.name,
          amount: tx.amount,
          source_type: tx.source
        });
      }
      res.json({ success: true, message: 'Transactions pushed to queue' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getPending(req, res) {
    const churchId = req.user.church_id;

    try {
      const pending = await ReconciliationRepository.getPendingTransactions(churchId);
      res.json({ success: true, pending: pending });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
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
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReconciliationController();
