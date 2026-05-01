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
import { canManageEvent } from '../utils/eventPermissions';

const promoCodeSchema = z.object({
  code: z.string().trim().min(1, 'Promo code is required'),
  discountType: z.enum(['percentage', 'fixed']),
  value: z.number().min(0, 'Promo value cannot be negative'),
  isActive: z.boolean().default(true),
});

const ticketSchema = z.object({
  eventId: z.string().trim().min(1, 'eventId is required'),
  name: z.string().trim().min(2, 'Ticket name is required'),
  description: z.string().trim().optional(),
  price: z.number().min(0, 'Price must be at least 0'),
  currency: z.string().trim().min(1).default('LKR'),
  isFree: z.boolean().default(false),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  maxPerUser: z.number().int().positive('maxPerUser must be greater than 0'),
  isActive: z.boolean().default(true),
  promoCodes: z.array(promoCodeSchema).default([]),
  unlockCode: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.isFree && data.price !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Free tickets must have price 0',
      path: ['price'],
    });
  }
});

const updateTicketSchema = z.object({
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().trim().min(1).optional(),
  isFree: z.boolean().optional(),
  quantity: z.number().int().positive().optional(),
  soldCount: z.number().int().min(0).optional(),
  maxPerUser: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  promoCodes: z.array(promoCodeSchema).optional(),
  unlockCode: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  if (data.isFree === true && data.price !== undefined && data.price !== 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Free tickets must have price 0',
      path: ['price'],
    });
  }
});

const applyPromoSchema = z.object({
  ticketTypeId: z.string().trim().min(1, 'ticketTypeId is required'),
  quantity: z.number().int().positive('quantity must be greater than 0'),
  promoCode: z.string().trim().min(1, 'promoCode is required'),
  unlockCode: z.string().trim().optional(),
}).strict();

const normalizeTicketPayload = (payload: z.infer<typeof ticketSchema>) => {
  const normalizedPromoCodes = payload.promoCodes.map((promo) => ({
    code: promo.code.trim().toUpperCase(),
    discountType: promo.discountType,
    value: promo.value,
    isActive: promo.isActive,
  }));

  return {
    ...payload,
    price: payload.isFree ? 0 : payload.price,
    currency: payload.currency.toUpperCase(),
    promoCodes: normalizedPromoCodes,
    unlockCode: payload.unlockCode?.trim() || undefined,
  };
};

const handleZodError = (error: unknown, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    return next(new AppError(error.issues.map((issue) => issue.message).join(', '), 400));
  }
  return next(error);
};

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = ticketSchema.parse(req.body);
    const normalizedPayload = normalizeTicketPayload(validatedData);

    const event = await EventModel.findById(validatedData.eventId);
    if (!event) return next(new AppError('Event not found', 404));

    if (!canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to add tickets to this event', 403));
    }

    const newTicketDoc = await TicketTypeModel.create({
      soldCount: 0,
      ...normalizedPayload,
    });

    res.status(201).json({ status: 'success', data: { ticket: newTicketDoc.toJSON() } });
  } catch (error) {
    handleZodError(error, next);
  }
};

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await TicketTypeModel.find();
    res.status(200).json({ status: 'success', results: tickets.length, data: { tickets: tickets.map((ticket) => ticket.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await TicketTypeModel.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));
    res.status(200).json({ status: 'success', data: { ticket: ticket.toJSON() } });
  } catch (error) {
    next(error);
  }
};

export const getEventTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await TicketTypeModel.find({ eventId: req.params.eventId });
    res.status(200).json({ status: 'success', results: tickets.length, data: { tickets: tickets.map((ticket) => ticket.toJSON()) } });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await TicketTypeModel.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    const event = await EventModel.findById(ticket.eventId);
    if (!event || !canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to update this ticket', 403));
    }

    const validatedData = updateTicketSchema.parse(req.body);
    const mergedData = {
      name: validatedData.name ?? ticket.name,
      description: validatedData.description ?? ticket.description,
      price: validatedData.price ?? ticket.price,
      currency: (validatedData.currency ?? ticket.currency ?? 'LKR').toUpperCase(),
      isFree: validatedData.isFree ?? ticket.isFree ?? false,
      quantity: validatedData.quantity ?? ticket.quantity,
      soldCount: validatedData.soldCount ?? ticket.soldCount,
      maxPerUser: validatedData.maxPerUser ?? ticket.maxPerUser,
      isActive: validatedData.isActive ?? ticket.isActive,
      promoCodes: validatedData.promoCodes !== undefined
        ? validatedData.promoCodes.map((promo) => ({
            code: promo.code.trim().toUpperCase(),
            discountType: promo.discountType,
            value: promo.value,
            isActive: promo.isActive,
          }))
        : ticket.promoCodes,
      unlockCode: validatedData.unlockCode?.trim() !== undefined
        ? (validatedData.unlockCode?.trim() || undefined)
        : ticket.unlockCode,
    };

    if (mergedData.isFree) {
      mergedData.price = 0;
    }

    if (mergedData.price < 0) {
      return next(new AppError('Price must be at least 0', 400));
    }

    if (mergedData.quantity <= 0) {
      return next(new AppError('Quantity must be greater than 0', 400));
    }

    if (mergedData.soldCount > mergedData.quantity) {
      return next(new AppError('soldCount cannot exceed quantity', 400));
    }

    const updatedTicket = await TicketTypeModel.findByIdAndUpdate(
      req.params.id as string,
      mergedData,
      { new: true },
    );

    res.status(200).json({ status: 'success', data: { ticket: updatedTicket!.toJSON() } });
  } catch (error) {
    handleZodError(error, next);
  }
};

export const deleteTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await TicketTypeModel.findById(req.params.id as string);
    if (!ticket) return next(new AppError('Ticket not found', 404));

    const event = await EventModel.findById(ticket.eventId);
    if (!event || !canManageEvent(req.user!.id, event)) {
      return next(new AppError('Not authorized to delete this ticket', 403));
    }

    await TicketTypeModel.findByIdAndDelete(req.params.id as string);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};

export const applyPromoCode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = applyPromoSchema.parse(req.body);
    const ticket = await TicketTypeModel.findById(validatedData.ticketTypeId);
    if (!ticket) return next(new AppError('Ticket not found', 404));

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
        ticketId: ticket.id,
        currency: pricing.currency,
        originalAmount: pricing.subtotal,
        discountAmount: pricing.discountAmount,
        finalAmount: pricing.finalAmount,
        appliedPromoCode: pricing.appliedPromoCode,
      },
    });
  } catch (error) {
    handleZodError(error, next);
  }
};
