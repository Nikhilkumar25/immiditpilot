import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { submitRating, getRatingsForUser } from '../controllers/ratingController';

const router = Router();

router.use(authenticate);

router.post('/', submitRating);
router.get('/user/:userId', getRatingsForUser);

export default router;
