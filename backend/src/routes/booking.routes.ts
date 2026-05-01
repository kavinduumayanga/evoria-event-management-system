import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBooking,
  getMyBookings,
  getEventBookings,
  cancelBooking,
  refundBooking,
} from '../controllers/booking.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

// Specific routes MUST be declared before wildcard /:id routes
router.get('/my', getMyBookings);
router.post('/', createBooking);

router.get('/', getBookings);
router.get('/event/:eventId', getEventBookings);
router.patch('/:id/refund', refundBooking);

// Wildcard routes last
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);

export default router;
