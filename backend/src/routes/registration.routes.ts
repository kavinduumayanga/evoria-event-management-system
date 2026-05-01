import { Router } from 'express';
import {
  approveRegistration,
  createRegistration,
  getEventRegistrations,
  getMyRegistrations,
  rejectRegistration,
  updateRegistrationRsvp,
} from '../controllers/registration.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', createRegistration);
router.get('/my', getMyRegistrations);
router.patch('/:id/rsvp', updateRegistrationRsvp);

router.get('/event/:eventId', getEventRegistrations);
router.patch('/:id/approve', approveRegistration);
router.patch('/:id/reject', rejectRegistration);

export default router;
