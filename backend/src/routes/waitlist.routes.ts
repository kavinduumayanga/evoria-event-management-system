import { Router } from 'express';
import { getEventWaitlist, getMyWaitlist, promoteWaitlistBooking } from '../controllers/waitlist.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/my', getMyWaitlist);
router.get('/event/:eventId', getEventWaitlist);
router.patch('/:bookingId/promote', promoteWaitlistBooking);

export default router;
