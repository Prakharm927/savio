# 🚨 Stress Test Failed - Backend Not Running

## Issue

The stress tests failed because the **backend server is not running**.

```
✗ Health check failed (status 0 = connection refused)
```

---

## ✅ FIX: Start Backend in 3 Steps

### Step 1: Start Docker Desktop

1. **Open Docker Desktop** application
2. **Wait** for it to fully start (green icon in system tray)
3. **Verify**:
   ```powershell
   docker ps
   ```
   Should NOT show "error during connect"

---

### Step 2: Start Backend Services

```powershell
cd savio-backend

# Start PostgreSQL and Redis
docker compose up -d

# Wait 5 seconds for containers to be ready
Start-Sleep -Seconds 5

# Initialize database (first time only)
npm run db:push
npm run db:seed
```

**Expected output**:
```
✔ Container prixo-postgres  Started
✔ Container prixo-redis     Started
✔ Container prixo-pgadmin   Started
```

---

### Step 3: Start Development Server

```powershell
npm run dev
```

**Expected output**:
```
✅ Connected to PostgreSQL database
✅ Connected to Redis
🚀 Prixo backend running on port 3000
```

**Keep this terminal open!** Server needs to stay running.

---

## 🧪 Re-run Stress Test

**In a NEW terminal**:

```powershell
cd savio-backend
npm run stress-test
```

**Expected output**:
```
╔════════════════════════════════════════╗
║   Prixo Backend Stress Test Suite    ║
╚════════════════════════════════════════╝

=== Test 1: Health Check ===
✓ Health check passed (45ms)

=== Test 2: Products API ===
✓ Products API works (152ms)
  Found 5 products

=== Test 3: Rate Limiting ===
⚠ Rate limiting might not be active (development mode?)

=== Test 4: Concurrent Load ===
✓ Concurrent load test passed!
  Successful: 50/50
  Avg response time: 245ms

=== Test 5: Comparison API ===
✓ Comparison API works (389ms)
  Platforms compared: 3

═══════════════════════════════════════
Results:
  Passed: 5
  Failed: 0
═══════════════════════════════════════

🎉 All tests passed! Your backend is production-ready!
```

---

## 🔍 Verify Services Running

### Check Docker Containers

```powershell
docker compose ps
```

**Expected**:
```
NAME              STATUS
prixo-postgres    Up
prixo-redis       Up
prixo-pgadmin     Up
```

### Check Backend Server

```powershell
curl http://localhost:3000/health
```

**Expected**:
```json
{
  "success": true,
  "message": "Prixo API is running"
}
```

---

## 🐛 Still Not Working?

### Docker Desktop Not Starting

**Fix**: 
1. Restart computer
2. Open Docker Desktop
3. Wait for "Docker is running" message

### Port 3000 Already in Use

**Fix**:
```powershell
# Find process on port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Database Connection Failed

**Fix**:
```powershell
# Reset everything
docker compose down
docker compose up -d
Start-Sleep -Seconds 10
npm run db:push
npm run db:seed
npm run dev
```

---

## ✅ Complete Workflow

```powershell
# 1. Start Docker Desktop (manually via app)

# 2. In Terminal 1
cd savio-backend
docker compose up -d
Start-Sleep -Seconds 5
npm run db:push
npm run db:seed
npm run dev

# 3. In Terminal 2 (after server starts)
cd savio-backend
npm run stress-test

# 4. Expected: All 5 tests pass! 🎉
```

---

## 📝 Why Tests Failed

| Test | Status | Reason |
|------|--------|--------|
| Health Check | Failed (0) | Server not running |
| Products API | Failed (0) | Server not running |
| Rate Limiting | Warning | Server not running |
| Concurrent | Failed (0/50) | Server not running |
| Comparison | Failed (0) | Server not running |

**Status 0** = Connection refused = Server not listening on port 3000

---

**Start Docker Desktop, then run the 3-step fix above! 🚀**
