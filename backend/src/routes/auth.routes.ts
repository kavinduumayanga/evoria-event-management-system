import { Router } from 'express';
import {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  googleAuthPlaceholder,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleAuthPlaceholder);
router.get('/me', protect, getMe);

export default router;
