import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  getHostEvents,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  searchEvents,
  getTrendingEvents,
  incrementEventView,
  getRecommendedEvents,
  getEventCalendar,
} from '../controllers/event.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getEvents);
router.get('/search', searchEvents);
router.get('/trending', getTrendingEvents);
router.get('/recommended', getRecommendedEvents);
router.get('/host/:hostAdminId', protect, restrictTo('host_admin'), getHostEvents);
router.get('/:id/calendar', getEventCalendar);
router.get('/:id', getEvent);

// Protected routes
router.use(protect);
router.patch('/:id/view', incrementEventView);

// Host Admin only
router.use(restrictTo('host_admin'));
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/status', updateEventStatus);

export default router;
