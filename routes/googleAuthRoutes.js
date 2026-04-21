const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// @desc    Redirect to Google consent screen
// @route   GET /auth/google
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// @desc    Google OAuth callback
// @route   GET /auth/google/callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?error=google_auth_failed`,
  }),
  (req, res) => {
    // Generate JWT for the authenticated user
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Redirect to frontend with the token
    const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    res.redirect(`${clientOrigin}/login-success?token=${token}`);
  }
);

module.exports = router;
