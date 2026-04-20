# 🚀 Prixo Backend - Quick Start Guide

## ✅ What's Already Done

All code is written and dependencies are installed! You just need to:
1. Start Docker
2. Initialize database
3. Run the server

---

## 📋 Step-by-Step Instructions

### **Step 1: Start Docker Desktop**

1. Open the **Docker Desktop** application on Windows
2. Wait for Docker to start (you'll see a green indicator in the system tray)
3. Verify Docker is running:

```powershell
docker --version
```

You should see: `Docker version 29.1.2` or similar.

---

### **Step 2: Start Database Services**

Open PowerShell in the backend directory and run:

```powershell
cd C:\Users\prakh\OneDrive\Desktop\Savio\savio-backend
docker compose up -d
```

This starts 3 services:
- ✅ **PostgreSQL** on port 5432
- ✅ **Redis** on port 6379
- ✅ **pgAdmin** on port 5050

**Verify they're running**:

```powershell
docker compose ps
```

You should see all 3 containers with status "Up".

---

### **Step 3: Initialize the Database**

```powershell
# Push Prisma schema to PostgreSQL
npm run db:push

# Seed sample data (5 products, prices, delivery rules)
npm run db:seed
```

You should see:
```
🌱 Seeding database...
✅ Cleared existing data
✅ Created test users
✅ Created 5 sample products
✅ Created platform SKU mappings
✅ Created price data for Bangalore (560001)
✅ Created delivery rules
✅ Added items to user cart
🎉 Database seeded successfully!
```

---

### **Step 4: Start the Development Server**

```powershell
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Connected to Redis
🚀 Prixo backend running on port 3000
📊 Environment: development
🌐 Health check: http://localhost:3000/health
```

**Server is ready!** 🎉

---

## 🧪 Test the API

### Health Check

Open a new PowerShell terminal and run:

```powershell
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Prixo API is running",
  "timestamp": "2026-01-06T..."
}
```

---

### Get All Products

```powershell
curl http://localhost:3000/api/products
```

**Expected**: List of 5 products (Amul Milk, Britannia Bread, Rice, Oil, Coffee)

---

### Get Product Prices

```powershell
curl "http://localhost:3000/api/products/USKU-MILK-001/prices?pincode=560001"
```

**Expected**: Prices from BigBasket, Amazon, Blinkit

---

### Compare Cart (Most Important!)

Create a file `test-comparison.json`:

```json
{
  "items": [
    {"usku": "USKU-MILK-001", "quantity": 2},
    {"usku": "USKU-BREAD-001", "quantity": 1}
  ],
  "pincode": "560001"
}
```

Then run:

```powershell
curl -X POST http://localhost:3000/api/comparison `
  -H "Content-Type: application/json" `
  -d "@test-comparison.json"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "platform": "blinkit",
        "total": 149,
        "savings": 33,
        "eta": "Delivers in 10-15 minutes",
        "availabilityRate": 100
      },
      {
        "platform": "bigbasket",
        "total": 157,
        "savings": 25
      },
      {
        "platform": "amazon",
        "total": 182,
        "savings": 0
      }
    ],
    "cheapestPlatform": "blinkit",
    "fastestPlatform": "blinkit",
    "maxSavings": 33
  }
}
```

---

## 🎨 View Data with GUI Tools

### Prisma Studio (Recommended)

Open a new terminal:

```powershell
npm run db:studio
```

Opens: **http://localhost:5555**

You can:
- Browse all tables
- View seeded data
- Edit records visually
- Test relationships

---

### pgAdmin (Advanced)

1. Open: **http://localhost:5050**
2. Login:
   - Email: `admin@prixo.com`
   - Password: `admin`
3. Add server:
   - Right-click "Servers" → Register → Server
   - **General Tab**:
     - Name: `Prixo Dev`
   - **Connection Tab**:
     - Host: `postgres` (or `localhost`)
     - Port: `5432`
     - Database: `prixo_dev`
     - Username: `prixo`
     - Password: `prixo123`
4. Click "Save"

Now you can write SQL queries, view table structures, etc.

---

## 🛠️ Common Commands Reference

### Docker Management

```powershell
# View running containers
docker compose ps

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Restart a service
docker compose restart postgres
docker compose restart redis

# Access PostgreSQL CLI
docker compose exec postgres psql -U prixo -d prixo_dev

# Access Redis CLI
docker compose exec redis redis-cli
```

---

### Database Management

```powershell
# Re-seed database (clears and repopulates)
npm run db:seed

# View database with GUI
npm run db:studio

# Push schema changes (after editing schema.prisma)
npm run db:push

# Generate Prisma Client (after schema changes)
npm run db:generate
```

---

### Development

```powershell
# Start dev server (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

---

## 🚨 Troubleshooting

### "Docker daemon not running"

**Solution**: Open Docker Desktop application and wait for it to start.

---

### "Port 5432 already in use"

**Solution**: Another PostgreSQL instance is running. Either:
1. Stop it: `net stop postgresql-x64-15` (as Administrator)
2. Or change port in `docker-compose.yml`

---

### "Can't connect to database"

**Solution**: Verify Docker containers are running:

```powershell
docker compose ps
```

All should show "Up". If not:

```powershell
docker compose down
docker compose up -d
docker compose logs postgres
```

---

### "Prisma Client error"

**Solution**: Regenerate Prisma Client:

```powershell
npm run db:generate
```

---

### Server won't start

**Solution**: Check if another process is using port 3000:

```powershell
netstat -ano | findstr :3000
```

If found, kill that process or change PORT in `.env`.

---

## 📚 Next Steps

Once everything is running:

1. **Connect React Native App**
   - Update API base URL in your frontend
   - Test product listing
   - Test comparison feature

2. **Add More Products**
   - Edit `prisma/seed.ts`
   - Add more products, platforms, prices
   - Run `npm run db:seed` again

3. **Build New Features**
   - User authentication (JWT)
   - Cart management API
   - Price alerts
   - Search improvements

4. **Deploy to Production**
   - Set up cloud PostgreSQL (AWS RDS, Supabase, etc.)
   - Configure Redis ElastiCache
   - Deploy to Render, Railway, or AWS

---

## 🎯 Testing Checklist

- [ ] Docker services running (`docker compose ps`)
- [ ] Database initialized (`npm run db:push`)
- [ ] Sample data loaded (`npm run db:seed`)
- [ ] Server running (`npm run dev`)
- [ ] Health check works (`curl http://localhost:3000/health`)
- [ ] Products API works (`curl http://localhost:3000/api/products`)
- [ ] Prices API works (with pincode)
- [ ] Comparison API works (POST request)
- [ ] Prisma Studio accessible (`npm run db:studio`)
- [ ] pgAdmin accessible (http://localhost:5050)

---

## 📞 Quick Reference URLs

- **API Base**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Prisma Studio**: http://localhost:5555
- **pgAdmin**: http://localhost:5050
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

---

## 🎉 You're All Set!

Your backend is now:
- ✅ Running on TypeScript
- ✅ Connected to PostgreSQL
- ✅ Using Prisma ORM
- ✅ Caching with Redis
- ✅ Ready for your React Native app

**Happy Coding! 🚀**
