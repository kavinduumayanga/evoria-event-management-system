import { Router } from 'express';
import {
  createVenue,
  getVenues,
  getHostVenues,
  getVenue,
  updateVenue,
  deleteVenue,
} from '../controllers/venue.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/host/:hostId', protect, getHostVenues);
router.get('/:id', getVenue);

router.use(protect);

router.get('/', getVenues);
router.post('/', createVenue);
router.put('/:id', updateVenue);
router.delete('/:id', deleteVenue);

export default router;
