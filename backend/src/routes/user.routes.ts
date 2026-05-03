import { Router } from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  updateProfile,
  updatePassword,
  deleteAccount,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.put('/profile', updateProfile);
router.put('/password', updatePassword);
router.delete('/me', deleteAccount);

router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

router.get('/', getUsers);

export default router;
