import { Router } from 'express';
import { createReport, getReports, resolveReport } from '../controllers/report.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', restrictTo('attendee'), createReport);
router.get('/', restrictTo('host_admin'), getReports);
router.patch('/:id/resolve', restrictTo('host_admin'), resolveReport);

export default router;
