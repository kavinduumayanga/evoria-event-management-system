import { Router } from 'express';
import { getPlatformAnalytics } from '../controllers/admin.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('host_admin'));

router.get('/analytics', getPlatformAnalytics);

export default router;
