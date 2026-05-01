import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.middleware';
import {
  createNotification,
  getMyNotifications,
  markNotificationAsRead,
  deleteNotification,
  eventBlastNotifications,
  getEventNotifications,
  processScheduledNotifications,
} from '../controllers/notification.controller';

const router = Router();

router.use(protect);

router.get('/my', getMyNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);

router.use(restrictTo('host_admin'));
router.post('/', createNotification);
router.post('/event-blast/:eventId', eventBlastNotifications);
router.get('/event/:eventId', getEventNotifications);
router.post('/process-scheduled', processScheduledNotifications);

export default router;
