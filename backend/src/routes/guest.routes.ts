import { Router } from 'express';
import {
  exportEventGuestsCsv,
  getEventGuests,
  markGuestCheckIn,
  runBulkGuestAction,
  updateGuestApprovalStatus,
} from '../controllers/guest.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/event/:eventId', getEventGuests);
router.get('/export/:eventId', exportEventGuestsCsv);
router.patch('/:id/status', updateGuestApprovalStatus);
router.patch('/:id/checkin', markGuestCheckIn);
router.post('/bulk-action', runBulkGuestAction);

export default router;
