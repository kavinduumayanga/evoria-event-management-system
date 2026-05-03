import { Router } from 'express';
import {
  createEvent,
  getEvents,
  getEvent,
  getHostEvents,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  updateEventVisibility,
  searchEvents,
  getDiscoverEvents,
  getTrendingEvents,
  incrementEventView,
  getRecommendedEvents,
  getEventCalendar,
  downloadEventCalendarIcs,
  toggleEventFeatured,
  addEventAdmin,
  removeEventAdmin,
  updateEventRegistrationFields,
  addEventCoHost,
  getEventCoHosts,
  removeEventCoHost,
} from '../controllers/event.controller';
import { getEventDashboard } from '../controllers/eventDashboard.controller';
import { getEventRegistrationsForManagers } from '../controllers/eventRegistration.controller';
import { getEventGuests } from '../controllers/guest.controller';
import {
  blastEventMessage,
  getEventCommunications,
  inviteGuestToEvent,
} from '../controllers/eventCommunication.controller';
import { createEventReminder, getEventReminders } from '../controllers/reminder.controller';
import { createEventReview, getEventReviewSummary, getEventReviews } from '../controllers/review.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getEvents);
router.get('/discover', getDiscoverEvents);
router.get('/search', searchEvents);
router.get('/trending', getTrendingEvents);
router.get('/recommended', getRecommendedEvents);
router.get('/host/:hostAdminId', protect, getHostEvents);
router.get('/:eventId/registrations', protect, getEventRegistrationsForManagers);
router.get('/:eventId/guests', protect, getEventGuests);
router.get('/:id/calendar', getEventCalendar);
router.get('/:id/calendar.ics', downloadEventCalendarIcs);
router.get('/:eventId/reviews/summary', getEventReviewSummary);
router.get('/:eventId/reviews', getEventReviews);
router.get('/:id', getEvent);

// Protected routes
router.use(protect);
router.patch('/:id/view', incrementEventView);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/status', updateEventStatus);
router.patch('/:id/visibility', updateEventVisibility);
router.patch('/:eventId/registration-fields', updateEventRegistrationFields);
router.post('/:eventId/invite', inviteGuestToEvent);
router.post('/:eventId/blast', blastEventMessage);
router.get('/:eventId/communications', getEventCommunications);
router.get('/:eventId/dashboard', getEventDashboard);
router.post('/:eventId/reminders', createEventReminder);
router.get('/:eventId/reminders', getEventReminders);
router.post('/:eventId/reviews', createEventReview);
router.patch('/:id/feature', toggleEventFeatured);
router.post('/:id/admins', addEventAdmin);
router.delete('/:id/admins/:userId', removeEventAdmin);
router.post('/:eventId/co-hosts', addEventCoHost);
router.get('/:eventId/co-hosts', getEventCoHosts);
router.delete('/:eventId/co-hosts/:userId', removeEventCoHost);

export default router;
