import express from 'express';
import { register, verifyRegistrationOtp, resendRegistrationOtp, login, verifyLoginOtp, resendLoginOtp, logout, getProfile } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/register/resend-otp', resendRegistrationOtp);
router.post('/login', login);
router.post('/login/verify-otp', verifyLoginOtp);
router.post('/login/resend-otp', resendLoginOtp);
router.post('/logout', logout);
router.get('/profile', getProfile);

export default router; 