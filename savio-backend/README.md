# Prixo Backend API

**Price comparison platform backend** with PostgreSQL, Prisma ORM, Redis caching, and TypeScript.

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Native   │ (Frontend - Expo)
│      App        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Express API   │ (This backend)
│   TypeScript    │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌───────┐  ┌───────┐
│ Redis │  │ Prisma│
│ Cache │  │  ORM  │
└───────┘  └───┬───┘
               ↓
          ┌─────────┐
          │PostgreSQL│
          │ Database│
          └─────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** (for PostgreSQL and Redis)

### 1. Clone and Install

```bash
cd savio-backend
npm install
```

### 2. Start Docker Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`
- pgAdmin on port `5050` (http://localhost:5050)

### 3. Setup Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on: **http://localhost:3000**

---

## 📡 API Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "success": true,
  "message": "Prixo API is running",
  "timestamp": "2026-01-06T12:00:00.000Z"
}
```

---

### Products

#### **List All Products**

```http
GET /api/products?page=1&limit=20&category=dairy&search=milk
```

Query Parameters:
- `page` (default: 1)
- `limit` (default: 20)
- `category` (optional)
- `search` (optional)
- `sortBy` (default: `popularityScore`)
- `order` (default: `desc`)

Response:
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### **Get Product by USKU**

```http
GET /api/products/:usku
```

Example:
```http
GET /api/products/USKU-MILK-001
```

#### **Get Product Prices**

```http
GET /api/products/:usku/prices?pincode=560001
```

Response:
```json
{
  "success": true,
  "data": {
    "usku": "USKU-MILK-001",
    "name": "Amul Taaza Toned Milk",
    "prices": [
      {
        "platform": "bigbasket",
        "price": 56,
        "mrp": 60,
        "discountPercent": 6.67,
        "inStock": true
      },
      {
        "platform": "amazon",
        "price": 58,
        "mrp": 60,
        "inStock": true
      }
    ]
  }
}
```

#### **Search Products**

```http
GET /api/products/search?q=milk&limit=10
```

---

### Comparison

#### **Compare Cart Across Platforms**

```http
POST /api/comparison
Content-Type: application/json

{
  "items": [
    { "usku": "USKU-MILK-001", "quantity": 2 },
    { "usku": "USKU-BREAD-001", "quantity": 1 }
  ],
  "pincode": "560001",
  "userId": "optional-user-id"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "pincode": "560001",
    "itemCount": 2,
    "platforms": [
      {
        "platform": "blinkit",
        "available": true,
        "itemsInStock": 2,
        "itemsOutOfStock": 0,
        "availabilityRate": 100,
        "subtotal": 119,
        "deliveryFee": 25,
        "platformFee": 5,
        "total": 149,
        "savings": 33,
        "eta": "Delivers in 10-15 minutes",
        "etaMinutes": 10
      },
      {
        "platform": "bigbasket",
        "total": 157,
        "savings": 25,
        ...
      },
      {
        "platform": "amazon",
        "total": 182,
        "savings": 0,
        ...
      }
    ],
    "cheapestPlatform": "blinkit",
    "fastestPlatform": "blinkit",
    "maxSavings": 33,
    "timestamp": "2026-01-06T12:00:00.000Z"
  }
}
```

---

## 🗄️ Database Schema

### Core Tables

1. **users** - User accounts
2. **savio_products** - Master product catalog (Universal SKU)
3. **platform_skus** - Platform-specific product mappings
4. **prices_latest** - Current prices per platform/pincode
5. **delivery_rules** - Delivery fees and ETAs
6. **user_carts** - Shopping cart items
7. **user_favorites** - Wishlist
8. **saved_lists** & **saved_list_items** - Recurring grocery lists
9. **comparison_history** - Analytics tracking

### View Schema in Prisma Studio

```bash
npm run db:studio
```

Opens GUI at: **http://localhost:5555**

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart postgres
docker-compose restart redis

# Access PostgreSQL CLI
docker-compose exec postgres psql -U prixo -d prixo_dev

# Access Redis CLI
docker-compose exec redis redis-cli
```

---

## 🔧 Environment Variables

Create `.env` file (see `.env.example`):

```env
# Database
DATABASE_URL="postgresql://prixo:prixo123@localhost:5432/prixo_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# Server
NODE_ENV="development"
PORT=3000

# Security
JWT_SECRET="your-secret-key"

# CORS (React Native dev server)
CORS_ORIGIN="http://localhost:8081,exp://localhost:8081"
```

---

## 🧪 Testing

### Manual Testing with cURL

```bash
# Health check
curl http://localhost:3000/health

# List products
curl http://localhost:3000/api/products

# Get product prices
curl "http://localhost:3000/api/products/USKU-MILK-001/prices?pincode=560001"

# Compare cart
curl -X POST http://localhost:3000/api/comparison \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"usku": "USKU-MILK-001", "quantity": 2},
      {"usku": "USKU-BREAD-001", "quantity": 1}
    ],
    "pincode": "560001"
  }'
```

### Using Postman

Import this collection:

1. Create new request
2. Set URL: `http://localhost:3000/api/comparison`
3. Set method: `POST`
4. Headers: `Content-Type: application/json`
5. Body (raw JSON):
```json
{
  "items": [
    {"usku": "USKU-MILK-001", "quantity": 2}
  ],
  "pincode": "560001"
}
```

---

## 📊 Monitoring

### pgAdmin (Database GUI)

1. Open: http://localhost:5050
2. Login: `admin@prixo.com` / `admin`
3. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `prixo_dev`
   - Username: `prixo`
   - Password: `prixo123`

### Redis Monitoring

```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check stats
INFO stats

# View all keys
KEYS *

# View cached comparison
GET comparison:*

# Check cache hit/miss
INFO stats | grep keyspace
```

---

## 🛠️ Development Workflow

### Adding New Features

1. **Update Prisma Schema** (`prisma/schema.prisma`)
2. **Push to database**: `npm run db:push`
3. **Generate Prisma Client**: `npm run db:generate`
4. **Create route** in `src/routes/`
5. **Create controller** in `src/controllers/`
6. **Register route** in `src/app.ts`
7. **Test** with cURL/Postman

### Database Migrations

```bash
# Create migration (production)
npx prisma migrate dev --name add_user_preferences

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only!)
npx prisma migrate reset
```

---

## 🚀 Production Deployment

### Build for Production

```bash
npm run build
```

Compiled output in `dist/` folder.

### Start Production Server

```bash
NODE_ENV=production npm start
```

### Environment Variables (Production)

```env
DATABASE_URL="postgresql://user:pass@prod-db-host:5432/prixo_prod"
REDIS_URL="redis://prod-redis-host:6379"
NODE_ENV="production"
PORT=3000
JWT_SECRET="<strong-production-secret>"
CORS_ORIGIN="https://prixo.app"
```

---

## 📁 Project Structure

```
savio-backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Sample data
├── src/
│   ├── config/
│   │   ├── database.ts         # Prisma client
│   │   └── redis.ts            # Redis client
│   ├── controllers/
│   │   ├── products.controller.ts
│   │   └── comparison.controller.ts
│   ├── routes/
│   │   ├── products.routes.ts
│   │   └── comparison.routes.ts
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── catchAsync.ts
│   │   └── response.ts
│   ├── types/
│   │   └── index.ts
│   ├── app.ts                  # Express app
│   └── server.ts               # Entry point
├── docker-compose.yml
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/new-api`
2. Make changes
3. Test locally
4. Commit: `git commit -m "Add new API endpoint"`
5. Push: `git push origin feature/new-api`
6. Create pull request

---

## 🔧 Parser Config Management

Parser configs let you update platform-specific selectors and patterns without shipping a new APK. Each platform has independently versioned configs.

### Environment Setup

Add `ADMIN_TOKEN` to your `.env`:

```env
ADMIN_TOKEN="your-secret-admin-token"
```

### Endpoints

#### Get Active Config (Public)

```bash
curl http://localhost:3000/api/parser-config/zepto
```

Response: `{ version, config, notes, lastUpdated }`

#### Get Version History (Admin)

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/parser-config/zepto/versions
```

#### Create New Config Version (Admin)

```bash
curl -X POST http://localhost:3000/api/admin/parser-config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zepto",
    "config": {
      "selectors": { "productName": "TextView.product_name" },
      "patterns": { "price": "₹(\\d+)" },
      "ignore": ["ad_banner"]
    },
    "notes": "Added product name selector from tree dump analysis",
    "activate": true
  }'
```

#### Activate a Specific Version (Admin)

```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/admin/parser-config/<config-id>/activate
```

### Seed Initial Configs

```bash
npx tsx prisma/seedParserConfigs.ts
```

Creates v1 empty configs for all 7 platforms (zepto, blinkit, instamart, bigbasket, jiomart, amazon, flipkart).

### Publishing Workflow

1. Capture a tree dump from the target platform (via the accessibility service)
2. Analyse the dump to identify selector paths and patterns
3. POST a new config version with `activate: false` (dry run)
4. Review the config in the admin dashboard
5. Activate via PUT or by setting `activate: true` on creation
6. The Redis cache (1h TTL) will serve the new config to all clients

---

## 🆘 Troubleshooting

### Port already in use

```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Docker not starting

```bash
# Remove all containers and volumes
docker-compose down -v

# Restart Docker Desktop
# Then: docker-compose up -d
```

### Prisma Client errors

```bash
# Regenerate Prisma Client
npm run db:generate

# Clear cache
rm -rf node_modules/.prisma
npm run db:generate
```

### Database connection issues

```bash
# Check Docker logs
docker-compose logs postgres

# Verify PostgreSQL is running
docker-compose ps

# Test connection
docker-compose exec postgres psql -U prixo -d prixo_dev
```

---

## 📧 Support

For issues, contact: **dev@prixo.com**

---

**Happy Coding! 🚀**
