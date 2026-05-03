import { Router } from 'express';
import { ingestZeptoSnapshot } from '../controllers/liveSnapshots.controller';

const router = Router();

router.post('/zepto', ingestZeptoSnapshot);

export default router;
