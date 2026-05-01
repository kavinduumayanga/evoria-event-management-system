import { Router } from 'express';
import { createReport, getReports, resolveReport } from '../controllers/report.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', createReport);
router.get('/', getReports);
router.patch('/:id/resolve', resolveReport);

export default router;
