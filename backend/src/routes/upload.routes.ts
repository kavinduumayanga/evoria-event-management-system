import { Router } from 'express';
import { uploadImage } from '../controllers/upload.controller';
import { upload } from '../middleware/upload.middleware';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.post('/profile-image', upload.single('image'), uploadImage);
router.post('/event-image', upload.single('image'), uploadImage);
router.post('/session-image', upload.single('image'), uploadImage);

export default router;
