/**
 * Journal Entry Controller
 * Handles journal entry operations
 */

const { validationResult } = require('express-validator');
const JournalEntryRepository = require('../repositories/journalEntry.repository');
const { JournalEntry } = require('../models/JournalEntry');
const logger = require('../../../config/logging');

class JournalEntryController {
  constructor(pool) {
    this.journalRepo = new JournalEntryRepository(pool);
  }

  /**
   * Get all journal entries
   */
  async getJournalEntries(req, res) {
    try {
      const { status, start_date, end_date, reference_type, account_id, limit = 50, offset = 0 } = req.query;
      
      const entries = await this.journalRepo.findAll({
        status,
        start_date,
        end_date,
        reference_type,
        account_id,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      res.json({ 
        entries,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          count: entries.length
        }
      });
    } catch (error) {
      logger.error('Get journal entries error:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntryById(req, res) {
    try {
      const { id } = req.params;
      const entry = await this.journalRepo.findById(id);
      
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      res.json({ entry });
    } catch (error) {
      logger.error('Get journal entry by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  }

  /**
   * Create new journal entry
   */
  async createJournalEntry(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const entry = new JournalEntry({
        ...req.body,
        created_by: req.user.id
      });

      // Calculate totals
      entry.calculateTotals();
      
      // Validate the entry
      const validation = entry.validate();
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Journal entry validation failed', 
          details: validation.errors 
        });
      }
      
      const created = await this.journalRepo.create(entry);
      
      logger.info(`Journal entry created: ${created.id} by ${req.user.email}`);
      res.status(201).json({ entry: created });
    } catch (error) {
      logger.error('Create journal entry error:', error);
      res.status(500).json({ error: error.message || 'Failed to create journal entry' });
    }
  }

  /**
   * Update journal entry (only drafts)
   */
  async updateJournalEntry(req, res) {
    try {
      const { id } = req.params;
      
      // Check if entry exists and is editable
      const existing = await this.journalRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      if (!existing.canEdit()) {
        return res.status(400).json({ 
          error: `Cannot edit journal entry with status: ${existing.status}` 
        });
      }

      const entry = new JournalEntry({
        ...req.body,
        id,
        created_by: existing.created_by
      });
      
      entry.calculateTotals();
      
      const updated = await this.journalRepo.update(id, entry);
      
      logger.info(`Journal entry updated: ${id}`);
      res.json({ entry: updated });
    } catch (error) {
      logger.error('Update journal entry error:', error);
      res.status(500).json({ error: error.message || 'Failed to update journal entry' });
    }
  }

  /**
   * Reverse a journal entry
   */
  async reverseJournalEntry(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const existing = await this.journalRepo.findById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }
      
      if (!existing.canReverse()) {
        return res.status(400).json({ 
          error: `Cannot reverse journal entry with status: ${existing.status}` 
        });
      }
      
      const reversal = await this.journalRepo.reverse(id, req.user.id);
      
      logger.info(`Journal entry reversed: ${id} -> ${reversal.id} by ${req.user.email}. Reason: ${reason}`);
      res.json({ 
        message: 'Journal entry reversed successfully',
        original_entry: existing,
        reversal_entry: reversal
      });
    } catch (error) {
      logger.error('Reverse journal entry error:', error);
      res.status(500).json({ error: error.message || 'Failed to reverse journal entry' });
    }
  }

  /**
   * Get account transactions (general ledger)
   */
  async getAccountTransactions(req, res) {
    try {
      const { account_id } = req.params;
      const { start_date, end_date, limit = 50 } = req.query;
      
      const transactions = await this.journalRepo.getAccountTransactions(account_id, {
        start_date,
        end_date,
        limit: parseInt(limit)
      });
      
      res.json({ 
        account_id,
        transactions,
        count: transactions.length
      });
    } catch (error) {
      logger.error('Get account transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch account transactions' });
    }
  }
}

module.exports = JournalEntryController;
