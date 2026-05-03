import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSession,
  getEventSessions,
  updateSession,
  deleteSession,
} from '../controllers/session.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getSessions);
router.get('/event/:eventId', getEventSessions);
router.get('/:id', getSession);

router.use(protect);

router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;
