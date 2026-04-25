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

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);

router.use(restrictTo('host_admin'));
router.get('/', getBookings);
router.get('/event/:eventId', getEventBookings);

export default router;
