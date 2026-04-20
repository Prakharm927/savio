# 🚀 Complete Testing Guide

## 📱 Test with Expo Go (Recommended)

### Your IP Address: **192.168.1.100**

---

### Quick Start (3 Steps)

#### 1. Update .env

Edit `savio/.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

**Or run automatic script**:
```powershell
cd savio
.\setup-expo-go.ps1
```

---

#### 2. Start Backend & Frontend

**Terminal 1** - Backend:
```powershell
cd savio-backend
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

**Terminal 2** - Frontend:
```powershell
cd savio
npx expo start --clear
```

---

#### 3. Open on Phone

1. Install **Expo Go** app (App Store/Play Store)
2. Scan QR code from terminal
3. App loads on your phone!

---

## ✅ Verify Everything Works

### Test 1: Backend Health

```powershell
curl http://192.168.1.100:3000/health
```

**Expected**:
```json
{
  "success": true,
  "message": "Prixo API is running"
}
```

---

### Test 2: Stress Test

```powershell
cd savio-backend
npm run stress-test
```

**Expected**: All 5 tests pass

---

### Test 3: App on Phone

1. **Products Tab**: Should show products from database
2. **Tap Product**: Comparison modal appears
3. **Price Comparison**: Shows Amazon, Flipkart, JioMart, BigBasket

---

## 🎯 Complete Workflow

```powershell
# 1. Start all services
cd savio-backend
docker compose up -d && npm run db:seed && npm run dev

# In new terminal
cd savio
npx expo start --clear

# 2. Verify backend
curl http://192.168.1.100:3000/health

# 3. Run stress test
cd savio-backend  
npm run stress-test

# 4. Open Expo Go on phone and scan QR
```

---

## 📊 Expected Performance

| Test | Expected | Status |
|------|----------|--------|
| Backend Health | <100ms | ✅ |
| Products API | <200ms | ✅ |
| Concurrent (50) | 100% success | ✅ |
| Comparison | <500ms | ✅ |
| App Load | 5-10s | ✅ |

---

## 📚 Documentation

- [EXPO_GO_TESTING.md](file:///c:/Users/prakh/OneDrive/Desktop/Savio/savio/EXPO_GO_TESTING.md) - Detailed Expo Go guide
- [TESTING.md](file:///c:/Users/prakh/OneDrive/Desktop/Savio/savio-backend/TESTING.md) - Backend stress testing
- [PRODUCTION_DEPLOYMENT.md](file:///c:/Users/prakh/OneDrive/Desktop/Savio/savio-backend/PRODUCTION_DEPLOYMENT.md) - Scaling guide

---

## 🐛 Quick Troubleshooting

### "Network Error" in App

✅ **Fix**: Verify `.env` has `http://192.168.1.100:3000`

### Products Not Loading

✅ **Fix**: Run `npm run db:seed` in backend

### Can't Scan QR Code

✅ **Fix**: Make sure phone and computer are on same WiFi

---

## ✨ Features to Test

### 1. Product Listing
- Scroll through products
- Check images load
- Verify prices show

### 2. Product Comparison  
- Tap any product
- See comparison across platforms
- Check cheapest/fastest badges

### 3. Cart
- Add items to cart
- Update quantities
- View cart comparison

### 4. Search (if implemented)
- Search for products
- Filter by category

---

## 🎉 Success Checklist

- [ ] Docker services running
- [ ] Backend at http://192.168.1.100:3000
- [ ] Database seeded with products
- [ ] Stress test passes (5/5)
- [ ] .env updated with IP
- [ ] Expo running
- [ ] App loaded on phone via Expo Go
- [ ] Products visible in app
- [ ] Comparison modal works
- [ ] Cart functionality works

---

**Everything is ready! Start testing on your phone! 📱🚀**
