import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { deleteReminder, processDueReminders } from '../controllers/reminder.controller';

const router = Router();

router.use(protect);

router.delete('/:id', deleteReminder);
router.post('/process-due', processDueReminders);

export default router;
