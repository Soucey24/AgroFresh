import express from 'express';
import { listUsers, createUser, updateUser, deleteUser, getUser, uploadAvatar, changePassword, verifyEmailChange, updateProfile, getProfile } from '../controllers/userController.js';
import { upload } from '../controllers/uploadController.js';
import { requestVerification, startDiditVerification } from '../controllers/verificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile/me', getProfile); // GET /api/users/profile/me
router.put('/profile/update', upload.single('avatar'), updateProfile); // PUT /api/users/profile/update
router.post('/avatar', upload.single('avatar'), uploadAvatar); // POST /api/users/avatar
router.post('/:id/didit-session', requireAuth, startDiditVerification);
router.post('/change-password', changePassword); // POST /api/users/change-password
router.get('/verify-email', verifyEmailChange); // GET /api/users/verify-email
router.get('/', listUsers); // GET /api/users
router.post('/', createUser); // POST /api/users
router.get('/:id', getUser); // GET /api/users/:id
router.put('/:id', upload.single('avatar'), updateUser); // PUT /api/users/:id
router.delete('/:id', deleteUser); // DELETE /api/users/:id
router.post(
	'/:id/verification',
	upload.fields([
		{ name: 'photo', maxCount: 1 },
		{ name: 'ghana_card_front', maxCount: 1 },
		{ name: 'ghana_card_back', maxCount: 1 },
		{ name: 'fda_document', maxCount: 1 },
		{ name: 'documents', maxCount: 6 }
	]),
	requestVerification
); // POST /api/users/:id/verification

export default router; 