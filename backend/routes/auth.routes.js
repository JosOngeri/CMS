const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().withMessage('First name required'),
  body('last_name').notEmpty().withMessage('Last name required'),
];

const loginValidation = [
  body('email').notEmpty().withMessage('Email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Admin-only user creation (matches frontend MembersList form)
router.post('/register', authenticateToken, requireRole(['Super Admin', 'Pastor', 'First Elder']), registerValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  authController.register(req, res, next);
});

router.post('/verify-password', authenticateToken, (req, res, next) => authController.verifyPassword(req, res, next));

router.post('/login', loginValidation, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  authController.login(req, res, next);
});

router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/password', authenticateToken, authController.changePassword);
router.get('/sessions', authenticateToken, authController.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, authController.revokeSession);
router.delete('/sessions', authenticateToken, authController.revokeAllSessions);
router.post('/mfa/enable', authenticateToken, authController.enableMFA);
router.post('/mfa/verify-setup', authenticateToken, authController.verifyMFASetup);
router.post('/mfa/verify', authenticateToken, authController.verifyMFA);
router.post('/mfa/disable', authenticateToken, authController.disableMFA);
router.get('/audit-log', authenticateToken, authController.getAuditLog);

// Public routes
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

module.exports = router;
