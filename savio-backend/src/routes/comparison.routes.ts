import { Router } from 'express';
import { compareCart } from '../controllers/comparison.controller';

const router = Router();

// POST /api/comparison - Compare cart across platforms
router.post('/', compareCart);

export default router;
