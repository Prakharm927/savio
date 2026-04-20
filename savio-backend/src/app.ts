import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalLimiter, perIpLimiter, comparisonLimiter, rateLimiterErrorHandler } from './middleware/rateLimiter';
import productsRouter from './routes/products.routes';
import comparisonRouter from './routes/comparison.routes';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Prixo API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});

// API routes
app.use('/api/products', productsRouter);

// Comparison endpoint with stricter rate limiting
app.use('/api/comparison', comparisonLimiter, comparisonRouter);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
