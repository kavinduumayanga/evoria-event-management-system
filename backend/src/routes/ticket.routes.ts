import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicket,
  getEventTickets,
  updateTicket,
  deleteTicket,
  applyPromoCode,
} from '../controllers/ticket.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getTickets);
router.get('/:id', getTicket);
router.get('/event/:eventId', getEventTickets);

router.use(protect);
router.post('/apply-promo', applyPromoCode);

router.post('/', createTicket);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;
