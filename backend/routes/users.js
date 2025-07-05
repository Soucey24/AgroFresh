import express from 'express';
import { listUsers, createUser, updateUser, deleteUser, getUser, uploadAvatar, changePassword, verifyEmailChange, updateProfile, getProfile } from '../controllers/userController.js';
import { upload } from '../controllers/uploadController.js';

const router = express.Router();

router.get('/', listUsers); // GET /api/users
router.get('/:id', getUser); // GET /api/users/:id
router.post('/', createUser); // POST /api/users
router.put('/:id', upload.single('avatar'), updateUser); // PUT /api/users/:id
router.delete('/:id', deleteUser); // DELETE /api/users/:id
router.post('/avatar', upload.single('avatar'), uploadAvatar); // POST /api/users/avatar
router.post('/change-password', changePassword); // POST /api/users/change-password
router.get('/verify-email', verifyEmailChange); // GET /api/users/verify-email
router.get('/profile/me', getProfile); // GET /api/users/profile/me
router.put('/profile/update', upload.single('avatar'), updateProfile); // PUT /api/users/profile/update

export default router; 