import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', listNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
