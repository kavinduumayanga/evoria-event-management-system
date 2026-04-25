import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBooking,
  getMyBookings,
  getEventBookings,
  cancelBooking,
} from '../controllers/booking.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Specific routes MUST be declared before wildcard /:id routes
router.get('/my', getMyBookings);
router.post('/', createBooking);

// Host admin only routes
router.get('/', restrictTo('host_admin'), getBookings);
router.get('/event/:eventId', restrictTo('host_admin'), getEventBookings);

// Wildcard routes last
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);

export default router;
