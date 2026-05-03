import { Router } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import {
    getActiveConfig,
    getVersionHistory,
    createConfig,
    activateConfig,
} from '../controllers/parserConfig.controller';

const router = Router();

// ── Public endpoints (no auth) ──────────────────────────────────

// GET /api/parser-config/:platform → active config (Redis-cached 1h)
router.get('/:platform', getActiveConfig);

// ── Admin endpoints (requires ADMIN_TOKEN) ──────────────────────

// GET /api/parser-config/:platform/versions → all versions
router.get('/:platform/versions', requireAdmin, getVersionHistory);

export default router;

// ── Separate admin router for /api/admin/parser-config ──────────
// These are mounted under /api/admin/parser-config in app.ts

export const adminParserConfigRouter = Router();

// POST /api/admin/parser-config → create new config version
adminParserConfigRouter.post('/', requireAdmin, createConfig);

// PUT /api/admin/parser-config/:id/activate → activate a version
adminParserConfigRouter.put('/:id/activate', requireAdmin, activateConfig);
