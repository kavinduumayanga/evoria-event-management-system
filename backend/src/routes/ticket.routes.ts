import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicket,
  getEventTickets,
  updateTicket,
  deleteTicket,
} from '../controllers/ticket.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getTickets);
router.get('/:id', getTicket);
router.get('/event/:eventId', getEventTickets);

router.use(protect);
router.use(restrictTo('host_admin'));

router.post('/', createTicket);
router.put('/:id', updateTicket);
router.delete('/:id', deleteTicket);

export default router;
