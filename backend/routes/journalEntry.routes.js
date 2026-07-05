const express = require('express');
const router = express.Router();
const journalEntryController = require('../controllers/journalEntry.controller');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all journal entries with filtering
router.get('/', journalEntryController.getAllJournalEntries);

// Get journal entry by ID with lines
router.get('/:id', journalEntryController.getJournalEntryById);

// Create new journal entry
router.post('/', journalEntryController.createJournalEntry);

// Update journal entry (only if not posted)
router.put('/:id', journalEntryController.updateJournalEntry);

// Void journal entry
router.post('/:id/void', journalEntryController.voidJournalEntry);

// Delete journal entry (only if draft)
router.delete('/:id', journalEntryController.deleteJournalEntry);

module.exports = router;
