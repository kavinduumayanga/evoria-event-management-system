import { Router } from 'express';
import { mockCheckout } from '../controllers/payment.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('attendee'));

router.post('/mock-checkout', mockCheckout);

export default router;
