import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  // Legacy role is kept for backward compatibility only.
  // New authorization logic is event-scoped and does not depend on this field.
  role: { type: String, enum: ['user', 'host_admin', 'attendee'], default: 'user' },
  phone: { type: String, trim: true },
  profileImage: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  reportCount: { type: Number, default: 0 },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
    }
  }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ emailVerified: 1 });

export const UserModel = mongoose.model('User', userSchema);
