import express from 'express';
import { signup, verifyOTP, login, resendOTP, logout } from '../controllers/Auth.controller.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for OTP requests
const otpLimiter = rateLimit({
  windowMs: 60 * 100, // 1 minute
  max: 1,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 1 minute.',
  },
});

// Apply rate limiting to OTP-related routes
router.post('/register', otpLimiter, signup);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/logout', logout);

export default router;
