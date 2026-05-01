import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TicketTypeModel } from '../models/TicketType';
import { EventModel } from '../models/Event';
import { AppError } from '../utils/appError';
import {
  calculateTicketPrice,
  validateTicketAvailability,
  validateUnlockCode,
} from '../utils/ticketPricing';
import { isEventAtCapacityForQuantity } from '../utils/waitlist.helper';

const mockCheckoutSchema = z.object({
  ticketTypeId: z.string().trim().min(1, 'ticketTypeId is required'),
  quantity: z.number().int().positive('quantity must be greater than 0'),
  promoCode: z.string().trim().optional(),
  unlockCode: z.string().trim().optional(),
}).strict();

export const mockCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = mockCheckoutSchema.parse(req.body);

    const ticket = await TicketTypeModel.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    if (!ticket.isActive) {
      return next(new AppError('Ticket is not active', 400));
    }

    const event = await EventModel.findById(ticket.eventId);
    if (!event) return next(new AppError('Event not found', 404));
    const pricingMode = event.pricingMode === 'free' ? 'free' : 'ticketed';

    if (event.moderationStatus && event.moderationStatus !== 'approved') {
      return next(new AppError('Event is not approved for booking', 400));
    }

    if (event.status !== 'published') {
      return next(new AppError('Event is not available for booking', 400));
    }

    if (event.visibility !== 'public') {
      return next(new AppError('Only public events can be booked', 403));
    }

    if (pricingMode === 'free') {
      return next(new AppError('This is a free event. Payment is not required.', 400));
    }

    const eventAtCapacity = await isEventAtCapacityForQuantity(event.id, validatedData.quantity);
    if (eventAtCapacity) {
      return next(new AppError('Event is full. Join waitlist instead of payment.', 409));
    }

    validateUnlockCode(ticket as any, validatedData.unlockCode);
    validateTicketAvailability(ticket as any, validatedData.quantity);

    const pricing = calculateTicketPrice(
      ticket as any,
      validatedData.quantity,
      validatedData.promoCode,
    );

    res.status(200).json({
      status: 'success',
      data: {
        success: true,
        totalAmount: pricing.subtotal,
        discountedAmount: pricing.finalAmount,
        discountAmount: pricing.discountAmount,
        currency: pricing.currency,
        message: 'Mock payment successful',
        promoCode: pricing.appliedPromoCode,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
    }
    next(error);
  }
};
