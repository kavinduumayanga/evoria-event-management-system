import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  getBookingQr,
  scanCheckIn,
  manualCheckIn,
  getEventAttendance,
} from '../controllers/checkin.controller';

const router = Router();

router.use(protect);

router.get('/qr/:registrationId', getBookingQr);

router.post('/scan', scanCheckIn);
router.patch('/:registrationId/manual', manualCheckIn);
router.get('/event/:eventId', getEventAttendance);

export default router;
