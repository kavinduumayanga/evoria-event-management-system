import { Router } from 'express';
import {
  createVenue,
  getVenues,
  getVenue,
  updateVenue,
  deleteVenue,
} from '../controllers/venue.controller';
import { protect, restrictTo } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getVenues);
router.get('/:id', getVenue);

router.use(protect);
router.use(restrictTo('host_admin'));

router.post('/', createVenue);
router.put('/:id', updateVenue);
router.delete('/:id', deleteVenue);

export default router;
