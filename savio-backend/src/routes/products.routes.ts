import { Router } from 'express';
import {
    getAllProducts,
    getProductByUsku,
    getProductPrices,
    searchProducts,
} from '../controllers/products.controller';

const router = Router();

// GET /api/products - List all products with pagination
router.get('/', getAllProducts);

// GET /api/products/search - Search products
router.get('/search', searchProducts);

// GET /api/products/:usku - Get single product by USKU
router.get('/:usku', getProductByUsku);

// GET /api/products/:usku/prices - Get product prices across platforms
router.get('/:usku/prices', getProductPrices);

export default router;
