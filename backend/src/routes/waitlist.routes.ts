import { Router } from 'express';
import { getEventWaitlist, getMyWaitlist, promoteWaitlistBooking } from '../controllers/waitlist.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/my', restrictTo('attendee'), getMyWaitlist);
router.get('/event/:eventId', restrictTo('host_admin'), getEventWaitlist);
router.patch('/:bookingId/promote', restrictTo('host_admin'), promoteWaitlistBooking);

export default router;
