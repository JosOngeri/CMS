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

    try {
      // Forensic Audit: Update with history
      const currentTx = await ReconciliationRepository.findById(transactionId);
      const oldVal = currentTx;

      const editHistory = oldVal.edit_history || [];
      editHistory.push({
        editor_id: userId,
        timestamp: new Date().toISOString(),
        old_status: oldVal.status
      });

      await ReconciliationRepository.verifyTransaction(transactionId, status, notes, userId, editHistory);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ReconciliationController();
