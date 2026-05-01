import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import ticketRoutes from './ticket.routes';
import bookingRoutes from './booking.routes';
import paymentRoutes from './payment.routes';
import registrationRoutes from './registration.routes';
import guestRoutes from './guest.routes';
import venueRoutes from './venue.routes';
import sessionRoutes from './session.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/registrations', registrationRoutes);
router.use('/guests', guestRoutes);
router.use('/venues', venueRoutes);
router.use('/sessions', sessionRoutes);
router.use('/uploads', uploadRoutes);

export default router;
