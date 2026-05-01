import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const registrationSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true, index: true },
  userId: { type: String, default: null, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  emailLower: { type: String, required: true, trim: true, lowercase: true },
  mobile: { type: String, required: true, trim: true },
  nic: { type: String, required: true, trim: true },
  customAnswers: {
    type: [{
      questionId: { type: String, required: true, trim: true },
      answer: { type: String, required: true, trim: true },
    }],
    default: [],
  },
  status: {
    type: String,
    enum: ['pending', 'going', 'ongoing', 'checked_in', 'not_going', 'declined'],
    default: 'pending',
  },
  qrCodeValue: { type: String, trim: true, default: null },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: String, default: null },
  checkInMethod: { type: String, enum: ['qr', 'manual', null], default: null },
  attendanceNote: { type: String, trim: true, default: null },
  registeredAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.emailLower;
    },
  },
});

registrationSchema.index({ eventId: 1, emailLower: 1 }, { unique: true });
registrationSchema.index({ eventId: 1, status: 1, registeredAt: -1 });
registrationSchema.index({ userId: 1, registeredAt: -1 });
registrationSchema.index({ qrCodeValue: 1 }, { unique: true, sparse: true });

export const RegistrationModel = mongoose.model('Registration', registrationSchema);
