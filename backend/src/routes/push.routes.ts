import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { deletePushToken, registerPushToken } from '../controllers/push.controller';

const router = Router();

router.use(protect);

router.post('/register-token', registerPushToken);
router.delete('/token', deletePushToken);

export default router;
