import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter, perIpLimiter, comparisonLimiter, rateLimiterErrorHandler } from './middleware/rateLimiter';
import productsRouter from './routes/products.routes';
import comparisonRouter from './routes/comparison.routes';
import liveSnapshotsRouter from './routes/liveSnapshots.routes';
import parserConfigRouter, { adminParserConfigRouter } from './routes/parserConfig.routes';
import adminRouter from './routes/admin.routes';
import { requireAdmin } from './middleware/adminAuth';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
};
app.use(cors(corsOptions));

// Body parser — JSON_BODY_LIMIT raised for structured accessibility tree dumps (~2–5 MB)
const bodyLimit = process.env.JSON_BODY_LIMIT || '10mb';
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

// Production-grade rate limiting
if (process.env.NODE_ENV === 'production') {
    // Global rate limiter (10k requests/min across all IPs)
    app.use('/api/', globalLimiter);

    // Per-IP rate limiter (100 requests/15min per IP)
    app.use('/api/', perIpLimiter);

    // Rate limiter error handler (graceful degradation)
    app.use(rateLimiterErrorHandler);
}

// Health check (no rate limit)
app.get('/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Savio API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API routes
app.use('/api/products', productsRouter);
app.use('/api/live-snapshots', liveSnapshotsRouter);

// Comparison endpoint with stricter rate limiting
app.use('/api/comparison', comparisonLimiter, comparisonRouter);

// Parser config endpoints (public GET + admin-protected mutations)
app.use('/api/parser-config', parserConfigRouter);
app.use('/api/admin/parser-config', requireAdmin, adminParserConfigRouter);

// Admin dashboard endpoints (products, snapshots, health)
app.use('/api/admin', requireAdmin, adminRouter);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
