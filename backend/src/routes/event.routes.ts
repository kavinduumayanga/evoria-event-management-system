import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  getHostEvents,
  updateEvent,
  deleteEvent,
  updateEventStatus,
} from '../controllers/event.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getEvents);
router.get('/host/:hostAdminId', protect, restrictTo('host_admin'), getHostEvents);
router.get('/:id', getEvent);

// Protected routes
router.use(protect);

// Host Admin only
router.use(restrictTo('host_admin'));
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/status', updateEventStatus);

export default router;
