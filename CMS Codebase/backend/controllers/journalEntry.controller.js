const BaseController = require('./BaseController');
const { createLogger } = require('../helpers/controllerLogger');
const { sendJournalEntrySMS } = require('../helpers/treasurySMSIntegration');
const JournalEntryRepository = require('../repositories/JournalEntryRepository');

/**
 * Journal Entry Controller
 * Handles double-entry accounting journal entries
 */
class JournalEntryController extends BaseController {
  constructor() {
    super();
    this.logger = createLogger('JournalEntryController');
  }

  /**
   * Get all journal entries with filtering
   */
  async getAllJournalEntries(req, res) {
    try {
      const { status, start_date, end_date, limit = 50, offset = 0 } = req.query;
      
      const result = await JournalEntryRepository.getAllJournalEntries({
        status, start_date, end_date, limit, offset
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('getAllJournalEntries', error);
      res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
    }
  }

  /**
   * Get journal entry by ID with lines
   */
  async getJournalEntryById(req, res) {
    try {
      const { id } = req.params;

      const result = await JournalEntryRepository.getJournalEntryById(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Journal entry not found' });
      }

      res.json({ 
        success: true, 
        data: result
      });
    } catch (error) {
      this.logger.error('getJournalEntryById', error);
      res.status(500).json({ success: false, error: 'Failed to fetch journal entry' });
    }
  }

  /**
   * Create new journal entry
   */
  async createJournalEntry(req, res) {
    try {
      const { entry_date, description, lines, created_by } = req.body;

      const result = await JournalEntryRepository.createJournalEntryWithLines(
        { entry_date, description, created_by },
        lines
      );

      if (result.error) {
        return res.status(400).json({ 
          success: false, 
          error: result.error,
          total_debit: result.total_debit,
          total_credit: result.total_credit
        });
      }

      sendJournalEntrySMS(result).catch(smsError => {
        this.logger.error('Failed to send journal entry SMS', smsError);
      });

      res.json({ success: true, data: result });
    } catch (error) {
      this.logger.error('createJournalEntry', error);
      res.status(500).json({ success: false, error: 'Failed to create journal entry' });
    }
  }

  /**
   * Update journal entry (only if not posted)
   */
  async updateJournalEntry(req, res) {
    try {
      const { id } = req.params;
      const { entry_date, description, lines } = req.body;

      const result = await JournalEntryRepository.updateJournalEntryWithLines(id, { entry_date, description }, lines);

      if (result.error) {
        if (result.error === 'Journal entry not found') {
          return res.status(404).json({ success: false, error: result.error });
        }
        return res.status(400).json({ success: false, error: result.error });
      }

      res.json({ success: true, message: 'Journal entry updated successfully' });
    } catch (error) {
      this.logger.error('updateJournalEntry', error);
      res.status(500).json({ success: false, error: 'Failed to update journal entry' });
    }
  }

  /**
   * Void journal entry
   */
  async voidJournalEntry(req, res) {
    try {
      const { id } = req.params;

      const result = await JournalEntryRepository.voidJournalEntry(id);

      if (!result) {
        return res.status(404).json({ success: false, error: 'Journal entry not found' });
      }

      res.json({ success: true, message: 'Journal entry voided successfully' });
    } catch (error) {
      this.logger.error('voidJournalEntry', error);
      res.status(500).json({ success: false, error: 'Failed to void journal entry' });
    }
  }

  /**
   * Delete journal entry (only if draft)
   */
  async deleteJournalEntry(req, res) {
    try {
      const { id } = req.params;

      const existingEntry = await JournalEntryRepository.getJournalEntryStatus(id);

      if (!existingEntry) {
        return res.status(404).json({ success: false, error: 'Journal entry not found' });
      }

      if (existingEntry.status === 'posted') {
        return res.status(400).json({ success: false, error: 'Cannot delete posted journal entry' });
      }

      const result = await JournalEntryRepository.deleteJournalEntry(id);

      res.json({ success: true, message: 'Journal entry deleted successfully' });
    } catch (error) {
      this.logger.error('deleteJournalEntry', error);
      res.status(500).json({ success: false, error: 'Failed to delete journal entry' });
    }
  }
}

module.exports = new JournalEntryController();
