import { Router } from 'express';
import {
  approveEventModeration,
  rejectEventModeration,
  suspendUser,
  activateUser,
} from '../controllers/moderation.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);
router.use(restrictTo('host_admin'));

router.patch('/event/:id/approve', approveEventModeration);
router.patch('/event/:id/reject', rejectEventModeration);
router.patch('/user/:id/suspend', suspendUser);
router.patch('/user/:id/activate', activateUser);

export default router;
