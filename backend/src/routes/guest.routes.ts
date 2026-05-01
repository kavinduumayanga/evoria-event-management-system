import { Router } from 'express';
import {
  exportEventGuestsCsv,
  getGuestQr,
  getEventGuests,
  markGuestCheckIn,
  runBulkGuestAction,
  updateGuestStatus,
} from '../controllers/guest.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/:registrationId/qr', getGuestQr);
router.get('/event/:eventId', getEventGuests);
router.get('/export/:eventId', exportEventGuestsCsv);
router.patch('/:registrationId/status', updateGuestStatus);
// Backward-compatible status route.
router.patch('/:id/status', updateGuestStatus);
router.patch('/:id/checkin', markGuestCheckIn);
router.post('/bulk-action', runBulkGuestAction);

export default router;
