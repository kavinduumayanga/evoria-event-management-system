import { Router } from 'express';
import { getUsers, getUser, updateUser, deleteUser } from '../controllers/user.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.use(protect);

router.get('/:id', getUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

router.use(restrictTo('host_admin'));
router.get('/', getUsers);

export default router;
