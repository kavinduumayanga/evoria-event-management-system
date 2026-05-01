import { AppError } from './appError';

export interface TicketPromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
}

export interface TicketPricingInput {
  id: string;
  price: number;
  currency?: string;
  isFree?: boolean;
  promoCodes?: TicketPromoCode[];
  unlockCode?: string;
  quantity: number;
  soldCount: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  appliedPromoCode?: string;
  currency: string;
}

const normalizeCode = (value: string) => value.trim().toUpperCase();

export const validateTicketAvailability = (ticket: TicketPricingInput, quantity: number) => {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  if (ticket.price < 0) {
    throw new AppError('Ticket price cannot be negative', 400);
  }

  if (ticket.quantity <= 0) {
    throw new AppError('Ticket quantity must be greater than 0', 400);
  }

  if (ticket.soldCount > ticket.quantity) {
    throw new AppError('Ticket sold count is invalid', 400);
  }

  if (ticket.quantity < ticket.soldCount + quantity) {
    throw new AppError('Not enough tickets available', 400);
  }
};

export const validateUnlockCode = (ticket: TicketPricingInput, providedUnlockCode?: string) => {
  const ticketUnlockCode = ticket.unlockCode?.trim();
  if (!ticketUnlockCode) return;

  if (!providedUnlockCode || providedUnlockCode.trim() !== ticketUnlockCode) {
    throw new AppError('Invalid unlock code for this ticket', 403);
  }
};

const resolvePromoDiscount = (
  subtotal: number,
  promoCodes: TicketPromoCode[],
  promoCode?: string,
): { discountAmount: number; appliedPromoCode?: string } => {
  if (!promoCode) {
    return { discountAmount: 0 };
  }

  const normalizedPromo = normalizeCode(promoCode);
  const matchingPromo = promoCodes.find((code) => normalizeCode(code.code) === normalizedPromo);

  if (!matchingPromo) {
    throw new AppError('Promo code not found', 400);
  }

  if (!matchingPromo.isActive) {
    throw new AppError('Promo code is inactive', 400);
  }

  let discountAmount = 0;
  if (matchingPromo.discountType === 'percentage') {
    if (matchingPromo.value < 0 || matchingPromo.value > 100) {
      throw new AppError('Invalid percentage promo value', 400);
    }
    discountAmount = (subtotal * matchingPromo.value) / 100;
  } else {
    discountAmount = matchingPromo.value;
  }

  return {
    discountAmount: Math.min(subtotal, Math.max(0, discountAmount)),
    appliedPromoCode: normalizedPromo,
  };
};

export const calculateTicketPrice = (
  ticket: TicketPricingInput,
  quantity: number,
  promoCode?: string,
): PricingResult => {
  const isFree = Boolean(ticket.isFree);
  const unitPrice = isFree ? 0 : ticket.price;
  const subtotal = Math.max(0, unitPrice * quantity);
  const promoCodes = ticket.promoCodes || [];

  const { discountAmount, appliedPromoCode } = resolvePromoDiscount(subtotal, promoCodes, promoCode);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    finalAmount,
    appliedPromoCode,
    currency: ticket.currency || 'LKR',
  };
};
