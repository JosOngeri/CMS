const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const socialAuthController = require('../controllers/socialAuth.controller');
const { authenticateToken } = require('../middleware/auth');

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed` }),
  socialAuthController.googleCallback
);

// Facebook OAuth routes
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=facebook_auth_failed` }),
  socialAuthController.facebookCallback
);

// Social account management (protected)
router.post('/link', authenticateToken, socialAuthController.linkSocialAccount);
router.delete('/unlink/:provider', authenticateToken, socialAuthController.unlinkSocialAccount);

module.exports = router;