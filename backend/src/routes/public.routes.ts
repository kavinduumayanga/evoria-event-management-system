import { Router } from 'express';
import { getPublicEventBySlug } from '../controllers/event.controller';
import { createPublicEventRegistration } from '../controllers/eventRegistration.controller';

const router = Router();

router.get('/events/:slug', getPublicEventBySlug);
router.post('/events/:slug/register', createPublicEventRegistration);

export default router;
