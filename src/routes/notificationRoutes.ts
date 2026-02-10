import { Router } from 'express';
import { sendPushNotification } from '../controllers/userController.js';

const router = Router();

// POST /api/notifications/send
router.post('/send', sendPushNotification);

export default router;
