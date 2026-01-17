import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  getMe,
  googleCallback,
  registerValidation,
  loginValidation,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/v1/auth/register - Register new user (students only)
router.post('/register', registerValidation, register);

// POST /api/v1/auth/login - Login user
router.post('/login', loginValidation, login);

// GET /api/v1/auth/me - Get current user (protected)
router.get('/me', authenticate, getMe);

// GET /api/v1/auth/google - Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// GET /api/v1/auth/google/callback - Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/?error=google_auth_failed',
  }),
  googleCallback
);

export default router;
