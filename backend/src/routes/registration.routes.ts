import { Router } from 'express';
import {
  approveRegistration,
  createRegistration,
  getEventRegistrations,
  getMyRegistrations,
  rejectRegistration,
  updateRegistrationRsvp,
} from '../controllers/registration.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/', restrictTo('attendee'), createRegistration);
router.get('/my', restrictTo('attendee'), getMyRegistrations);
router.patch('/:id/rsvp', restrictTo('attendee'), updateRegistrationRsvp);

router.get('/event/:eventId', restrictTo('host_admin'), getEventRegistrations);
router.patch('/:id/approve', restrictTo('host_admin'), approveRegistration);
router.patch('/:id/reject', restrictTo('host_admin'), rejectRegistration);

export default router;
