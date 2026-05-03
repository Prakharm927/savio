import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Admin authentication middleware.
 *
 * Validates the `Authorization: Bearer <token>` header against the
 * ADMIN_TOKEN environment variable.  All /api/admin/* routes should
 * be guarded by this middleware.
 *
 * Usage:
 *   import { requireAdmin } from './middleware/adminAuth';
 *   app.use('/api/admin', requireAdmin, adminRouter);
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
        logger.error('ADMIN_TOKEN environment variable is not set');
        res.status(500).json({
            success: false,
            message: 'Server misconfiguration: admin auth is not available',
        });
        return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
        });
        return;
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    if (token !== adminToken) {
        logger.warn(`Admin auth failed from IP ${req.ip}`);
        res.status(403).json({
            success: false,
            message: 'Invalid admin token',
        });
        return;
    }

    next();
}
