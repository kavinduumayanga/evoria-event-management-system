import { Router } from 'express';
import { mockCheckout } from '../controllers/payment.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/mock-checkout', mockCheckout);

export default router;
