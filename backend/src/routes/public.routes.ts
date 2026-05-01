import { Router } from 'express';
import { getPublicEventBySlug } from '../controllers/event.controller';

const router = Router();

router.get('/events/:slug', getPublicEventBySlug);

export default router;
