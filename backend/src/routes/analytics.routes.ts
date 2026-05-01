import { Router } from 'express';
import { getDashboardAnalytics, getEventAnalytics } from '../controllers/analytics.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('host_admin'));

router.get('/event/:eventId', getEventAnalytics);
router.get('/dashboard', getDashboardAnalytics);

export default router;
