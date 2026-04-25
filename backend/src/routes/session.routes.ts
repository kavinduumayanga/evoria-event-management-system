import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSession,
  getEventSessions,
  updateSession,
  deleteSession,
} from '../controllers/session.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getSessions);
router.get('/:id', getSession);
router.get('/event/:eventId', getEventSessions);

router.use(protect);
router.use(restrictTo('host_admin'));

router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

export default router;
