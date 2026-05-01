import { Router } from 'express';
import { getPlatformAnalytics } from '../controllers/admin.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/analytics', getPlatformAnalytics);

export default router;
