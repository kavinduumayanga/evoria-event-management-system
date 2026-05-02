import { Router } from 'express';
import {
  uploadEventImage,
  uploadProfileImage,
  uploadSessionImage,
} from '../controllers/upload.controller';
import { upload } from '../middleware/upload.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/profile-image', upload.single('image'), uploadProfileImage);
router.post('/event-image', upload.single('image'), uploadEventImage);
router.post('/session-image', upload.single('image'), uploadSessionImage);

export default router;
