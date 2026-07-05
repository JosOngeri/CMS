const express = require('express');
const router = express.Router();
const chartOfAccountsController = require('../controllers/chartOfAccounts.controller');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get all chart of accounts with hierarchy
router.get('/', chartOfAccountsController.getAllAccounts);

// Get chart of account by ID
router.get('/:id', chartOfAccountsController.getAccountById);

// Get account balance
router.get('/:id/balance', chartOfAccountsController.getAccountBalance);

// Create new chart of account
router.post('/', chartOfAccountsController.createAccount);

// Update chart of account
router.put('/:id', chartOfAccountsController.updateAccount);

// Delete chart of account
router.delete('/:id', chartOfAccountsController.deleteAccount);

module.exports = router;
