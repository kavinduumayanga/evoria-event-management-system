import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../src/models/User';
import { EventModel } from '../src/models/Event';
import { VenueModel } from '../src/models/Venue';
import { TicketTypeModel } from '../src/models/TicketType';
import { SessionModel } from '../src/models/Session';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/evoria';
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected for Seeding');

    // Clear existing data
    await UserModel.deleteMany({});
    await EventModel.deleteMany({});
    await VenueModel.deleteMany({});
    await TicketTypeModel.deleteMany({});
    await SessionModel.deleteMany({});

    console.log('Cleared existing data');

    const hashedPasswordAdmin = await bcrypt.hash('Admin123!', 12);
    const hashedPasswordAttendee = await bcrypt.hash('Attendee123!', 12);

    const adminId = uuidv4();
    const attendeeId = uuidv4();

    await UserModel.create([
      {
        _id: adminId,
        name: 'Host Admin',
        email: 'hostadmin@evoria.com',
        password: hashedPasswordAdmin,
        role: 'host_admin',
        isActive: true,
      },
      {
        _id: attendeeId,
        name: 'Test Attendee',
        email: 'attendee@evoria.com',
        password: hashedPasswordAttendee,
        role: 'attendee',
        isActive: true,
      }
    ]);

    const venueId = uuidv4();
    await VenueModel.create({
      _id: venueId,
      name: 'Cyber Arena',
      address: '123 Neon Street',
      city: 'Night City',
      capacity: 5000,
      type: 'physical',
      contactInfo: 'contact@cyberarena.com',
    });

    const eventId = uuidv4();
    await EventModel.create({
      _id: eventId,
      title: 'Neon Nights Festival',
      description: 'The biggest synthwave and cyberpunk music festival of the year.',
      date: '2026-12-31',
      startTime: '20:00',
      endTime: '06:00',
      hostAdminId: adminId,
      venueId: venueId,
      capacity: 5000,
      status: 'published',
      visibility: 'public'
    });

    await TicketTypeModel.create([
      {
        eventId: eventId,
        name: 'General Admission',
        description: 'Standard access to the festival',
        price: 99.99,
        quantity: 4000,
        maxPerUser: 4,
        soldCount: 0,
        isActive: true,
      },
      {
        eventId: eventId,
        name: 'VIP Experience',
        description: 'Front row access, exclusive lounge, free drinks',
        price: 299.99,
        quantity: 1000,
        maxPerUser: 2,
        soldCount: 0,
        isActive: true,
      }
    ]);

    await SessionModel.create([
      {
        eventId: eventId,
        title: 'Opening Act: The Midnight',
        description: 'Kick off the festival with an amazing performance',
        speakerName: 'The Midnight',
        sessionDate: '2026-12-31',
        startTime: '20:30',
        endTime: '22:00',
        hallOrRoom: 'Main Stage',
        status: 'scheduled'
      },
      {
        eventId: eventId,
        title: 'Main Event: Carpenter Brut',
        description: 'The headlining show you won\'t want to miss',
        speakerName: 'Carpenter Brut',
        sessionDate: '2027-01-01',
        startTime: '00:00',
        endTime: '02:00',
        hallOrRoom: 'Main Stage',
        status: 'scheduled'
      }
    ]);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
