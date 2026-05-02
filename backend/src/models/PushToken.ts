import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const pushTokenSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  userId: { type: String, required: true, index: true },
  expoPushToken: { type: String, required: true, trim: true, index: true },
  deviceInfo: {
    type: new Schema({
      platform: { type: String, trim: true, default: '' },
      deviceName: { type: String, trim: true, default: '' },
      appVersion: { type: String, trim: true, default: '' },
      osVersion: { type: String, trim: true, default: '' },
    }, { _id: false }),
    default: () => ({ platform: '', deviceName: '', appVersion: '', osVersion: '' }),
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
});

pushTokenSchema.index({ userId: 1, expoPushToken: 1 }, { unique: true });
pushTokenSchema.index({ expoPushToken: 1 }, { unique: true });

export const PushTokenModel = mongoose.model('PushToken', pushTokenSchema);
