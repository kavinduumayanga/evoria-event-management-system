import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { UserModel } from '../src/models/User';
import { VenueModel } from '../src/models/Venue';
import { EventModel } from '../src/models/Event';
import { TicketTypeModel } from '../src/models/TicketType';
import { SessionModel } from '../src/models/Session';
import { RegistrationModel } from '../src/models/Registration';
import { BookingModel } from '../src/models/Booking';
import { NotificationModel } from '../src/models/Notification';

dotenv.config();

const DEMO_PASSWORD = 'Demo123!';
const DEMO_EVENT_SLUG = 'evoria-tech-meetup-2026';
const DEMO_EVENT_TITLE = 'Evoria Tech Meetup 2026';
const DEMO_EVENT_QR = 'qr_demo_registration_attendee2_2026';
const DEMO_BOOKING_QR_HOST = 'qr_demo_booking_host_2026';
const DEMO_BOOKING_QR_ATTENDEE = 'qr_demo_booking_attendee1_2026';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const upsertDemoUser = async (payload: {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
}) => {
  const email = normalizeEmail(payload.email);
  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        name: payload.name,
        email,
        password: payload.passwordHash,
        role: 'user',
        phone: payload.phone,
        isActive: true,
        isSuspended: false,
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  return user;
};

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/evoria';
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB: ${mongoUri}`);
    await RegistrationModel.syncIndexes();

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    const [demoHost, demoAttendee1, demoAttendee2] = await Promise.all([
      upsertDemoUser({
        name: 'Evoria Demo Host',
        email: 'demo.host@evoria.com',
        passwordHash,
        phone: '+94 77 100 0001',
      }),
      upsertDemoUser({
        name: 'Evoria Demo Attendee 1',
        email: 'demo.attendee1@evoria.com',
        passwordHash,
        phone: '+94 77 100 0002',
      }),
      upsertDemoUser({
        name: 'Evoria Demo Attendee 2',
        email: 'demo.attendee2@evoria.com',
        passwordHash,
        phone: '+94 77 100 0003',
      }),
    ]);

    const venue = await VenueModel.findOneAndUpdate(
      { name: 'Evoria Demo Convention Hall', city: 'Colombo' },
      {
        $set: {
          name: 'Evoria Demo Convention Hall',
          address: '45 Marine Drive, Colombo 03',
          city: 'Colombo',
          capacity: 250,
          type: 'hybrid',
          contactInfo: 'demo-venue@evoria.com',
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    const eventDate = '2026-11-20';

    const event = await EventModel.findOneAndUpdate(
      { publicSlug: DEMO_EVENT_SLUG },
      {
        $set: {
          title: DEMO_EVENT_TITLE,
          description: 'A stable demo event for viva: product walkthrough, architecture, and live check-in demo.',
          date: eventDate,
          startTime: '18:00',
          endTime: '21:00',
          ownerId: demoHost.id,
          hostAdminId: demoHost.id,
          adminIds: [],
          publicSlug: DEMO_EVENT_SLUG,
          venueId: venue.id,
          type: 'hybrid',
          pricingMode: 'free',
          category: 'Technology',
          city: 'Colombo',
          tags: ['evoria', 'demo', 'tech'],
          meetingLink: 'https://meet.google.com/evoria-demo-2026',
          coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
          contactDetails: {
            name: 'Evoria Demo Team',
            email: 'demo.host@evoria.com',
            phone: '+94 77 100 0001',
          },
          branding: {
            primaryColor: '#22D3EE',
            accentColor: '#14B8A6',
          },
          capacity: 2,
          isFlagged: false,
          isFeatured: true,
          moderationStatus: 'approved',
          priorityAccessEnabled: false,
          status: 'published',
          visibility: 'public',
          requiresApproval: false,
          customQuestions: [
            {
              id: 'diet_pref',
              question: 'Any dietary preference?',
              type: 'text',
              required: false,
            },
          ],
          registrationFields: {
            customQuestions: [
              {
                id: 'diet_pref',
                question: 'Any dietary preference?',
                type: 'text',
                required: false,
              },
            ],
          },
          bookingCount: 2,
          viewsCount: 0,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    const ticket = await TicketTypeModel.findOneAndUpdate(
      { eventId: event.id, name: 'General Admission' },
      {
        $set: {
          eventId: event.id,
          name: 'General Admission',
          description: 'Free entry for the Evoria Tech Meetup demo.',
          price: 0,
          currency: 'LKR',
          isFree: true,
          quantity: 2,
          soldCount: 2,
          maxPerUser: 1,
          isActive: true,
          promoCodes: [],
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );

    await SessionModel.deleteMany({ eventId: event.id });
    await SessionModel.insertMany([
      {
        eventId: event.id,
        title: 'Welcome and Product Overview',
        description: 'Opening context for the Evoria platform demo.',
        speakerName: demoHost.name,
        sessionDate: eventDate,
        startTime: '18:00',
        endTime: '18:30',
        hallOrRoom: 'Main Hall',
        status: 'scheduled',
      },
      {
        eventId: event.id,
        title: 'Live Check-in and Waitlist Flow',
        description: 'Shows QR scan success, duplicate handling, and waitlist promotion.',
        speakerName: demoHost.name,
        sessionDate: eventDate,
        startTime: '19:00',
        endTime: '19:45',
        hallOrRoom: 'Main Hall',
        status: 'scheduled',
      },
    ]);

    // Reset only demo-event-dependent records so re-runs are deterministic.
    await Promise.all([
      RegistrationModel.deleteMany({ eventId: event.id }),
      BookingModel.deleteMany({ eventId: event.id }),
      NotificationModel.deleteMany({ eventId: event.id }),
    ]);

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));

    const registrations = await RegistrationModel.insertMany([
      {
        eventId: event.id,
        userId: demoAttendee1.id,
        name: demoAttendee1.name,
        email: demoAttendee1.email,
        emailLower: normalizeEmail(demoAttendee1.email),
        mobile: demoAttendee1.phone || '+94 77 100 0002',
        nic: '200112345678',
        customAnswers: [{ questionId: 'diet_pref', answer: 'Vegetarian' }],
        status: 'pending',
        qrCodeValue: null,
        registeredAt: now,
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
      },
      {
        eventId: event.id,
        userId: demoAttendee2.id,
        name: demoAttendee2.name,
        email: demoAttendee2.email,
        emailLower: normalizeEmail(demoAttendee2.email),
        mobile: demoAttendee2.phone || '+94 77 100 0003',
        nic: '200212345679',
        customAnswers: [{ questionId: 'diet_pref', answer: 'No preference' }],
        status: 'going',
        qrCodeValue: DEMO_EVENT_QR,
        registeredAt: now,
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
      },
      {
        eventId: event.id,
        userId: null,
        name: 'Walk-in Guest',
        email: 'walkin.demo@evoria.com',
        emailLower: normalizeEmail('walkin.demo@evoria.com'),
        mobile: '+94 77 100 0099',
        nic: '199912345670',
        customAnswers: [{ questionId: 'diet_pref', answer: 'Vegan' }],
        status: 'checked_in',
        qrCodeValue: 'qr_demo_walkin_checkedin_2026',
        registeredAt: tenMinutesAgo,
        checkedInAt: tenMinutesAgo,
        checkedInBy: demoHost.id,
        checkInMethod: 'manual',
      },
    ]);

    await BookingModel.insertMany([
      {
        userId: demoHost.id,
        eventId: event.id,
        ticketTypeId: ticket.id,
        quantity: 1,
        totalAmount: 0,
        bookingStatus: 'confirmed',
        bookingDate: now.toISOString(),
        isWaitlisted: false,
        waitlistPosition: null,
        wasWaitlisted: false,
        rsvpStatus: 'going',
        approvalStatus: 'approved',
        checkInStatus: 'not_checked_in',
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
        qrCodeValue: DEMO_BOOKING_QR_HOST,
        customAnswers: [],
        registrationType: 'free',
      },
      {
        userId: demoAttendee1.id,
        eventId: event.id,
        ticketTypeId: ticket.id,
        quantity: 1,
        totalAmount: 0,
        bookingStatus: 'confirmed',
        bookingDate: now.toISOString(),
        isWaitlisted: false,
        waitlistPosition: null,
        wasWaitlisted: false,
        rsvpStatus: 'going',
        approvalStatus: 'approved',
        checkInStatus: 'not_checked_in',
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
        qrCodeValue: DEMO_BOOKING_QR_ATTENDEE,
        customAnswers: [],
        registrationType: 'free',
      },
      {
        userId: demoAttendee2.id,
        eventId: event.id,
        ticketTypeId: ticket.id,
        quantity: 1,
        totalAmount: 0,
        bookingStatus: 'pending',
        bookingDate: now.toISOString(),
        isWaitlisted: true,
        waitlistPosition: 1,
        wasWaitlisted: true,
        rsvpStatus: 'going',
        approvalStatus: 'pending',
        checkInStatus: 'not_checked_in',
        checkedInAt: null,
        checkedInBy: null,
        checkInMethod: null,
        customAnswers: [],
        registrationType: 'free',
      },
    ]);

    await NotificationModel.create({
      userId: demoAttendee1.id,
      eventId: event.id,
      title: 'Demo Invite',
      message: `You are invited to ${DEMO_EVENT_TITLE}.`,
      type: 'announcement',
      channel: 'in_app',
      status: 'sent',
      sentAt: now,
      createdBy: demoHost.id,
      isRead: false,
    });

    console.log('Demo seed completed.');
    console.log('Users:');
    console.log(`- demo.host@evoria.com / ${DEMO_PASSWORD}`);
    console.log(`- demo.attendee1@evoria.com / ${DEMO_PASSWORD}`);
    console.log(`- demo.attendee2@evoria.com / ${DEMO_PASSWORD}`);
    console.log(`Event slug: ${event.publicSlug}`);
    console.log(`QR-ready registration token: ${DEMO_EVENT_QR}`);
    console.log(`Created registrations: ${registrations.length}`);
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedData();
