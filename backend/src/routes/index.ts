import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import eventRoutes from './event.routes';
import ticketRoutes from './ticket.routes';
import bookingRoutes from './booking.routes';
import venueRoutes from './venue.routes';
import sessionRoutes from './session.routes';
import uploadRoutes from './upload.routes';
import checkinRoutes from './checkin.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/bookings', bookingRoutes);
router.use('/venues', venueRoutes);
router.use('/sessions', sessionRoutes);
router.use('/uploads', uploadRoutes);
router.use('/checkins', checkinRoutes);
router.use('/notifications', notificationRoutes);

export default router;
