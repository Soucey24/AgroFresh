import express from 'express';
import { sendOtp, resendOtp, verifyOtp } from '../controllers/otpController.js';

const router = express.Router();

router.post('/otp/send', sendOtp);
router.post('/otp/resend', resendOtp);
router.post('/otp/verify', verifyOtp);

export default router;
