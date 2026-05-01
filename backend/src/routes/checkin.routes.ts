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

router.get('/qr/:bookingId', getBookingQr);

router.post('/scan', scanCheckIn);
router.patch('/:bookingId/manual', manualCheckIn);
router.get('/event/:eventId', getEventAttendance);

export default router;
