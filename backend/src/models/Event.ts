import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const customQuestionSchema = new Schema({
  id: { type: String, required: true, trim: true },
  question: { type: String, required: true, trim: true },
  type: { type: String, enum: ['text', 'number', 'choice'], required: true },
  required: { type: Boolean, default: false },
}, { _id: false });

const eventSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  ownerId: { type: String, required: true, index: true },
  // Legacy field kept for backward compatibility with older records.
  hostAdminId: { type: String, index: true },
  adminIds: { type: [String], default: [] },
  publicSlug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
  venueId: { type: String, default: null },
  location: {
    type: new Schema({
      name: { type: String, trim: true },
      address: { type: String, trim: true, default: '' },
      lat: { type: Number },
      lng: { type: Number },
    }, { _id: false }),
    default: null,
  },
  type: { type: String, enum: ['online', 'physical', 'hybrid'], required: true },
  pricingMode: { type: String, enum: ['free', 'ticketed'], default: 'ticketed' },
  category: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  tags: { type: [String], default: [] },
  viewsCount: { type: Number, default: 0 },
  bookingCount: { type: Number, default: 0 },
  meetingLink: { type: String, trim: true, default: '' },
  coverImage: { type: String, trim: true },
  contactDetails: {
    type: new Schema({
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    }, { _id: false }),
    default: () => ({ name: '', email: '', phone: '' }),
  },
  branding: {
    type: new Schema({
      primaryColor: { type: String, trim: true, default: '' },
      accentColor: { type: String, trim: true, default: '' },
    }, { _id: false }),
    default: () => ({ primaryColor: '', accentColor: '' }),
  },
  capacity: { type: Number, required: true },
  isFlagged: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
  },
  priorityAccessEnabled: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
  visibility: { type: String, enum: ['public', 'private', 'unlisted'], default: 'public' },
  requiresApproval: { type: Boolean, default: false },
  customQuestions: {
    type: [customQuestionSchema],
    default: [],
  },
  registrationFields: {
    type: new Schema({
      customQuestions: {
        type: [customQuestionSchema],
        default: [],
      },
    }, { _id: false }),
    default: () => ({ customQuestions: [] }),
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      ret.pricingMode = ret.pricingMode || 'ticketed';
      delete ret._id;
      delete ret.__v;
    }
  }
});

eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ category: 1, city: 1, date: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ ownerId: 1, date: 1 });
eventSchema.index({ isFeatured: -1, date: 1, startTime: 1 });
eventSchema.index({ bookingCount: -1, viewsCount: -1 });

export const EventModel = mongoose.model('Event', eventSchema);
