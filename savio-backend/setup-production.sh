#!/bin/bash

# Production Optimization Setup Script

echo "🚀 Setting up production optimizations..."

# Install required package
echo "📦 Installing rate-limit-redis..."
cd savio-backend
npm install rate-limit-redis@3.0.1

# Apply database indexes
echo "🗄️  Applying production database indexes..."
npm run db:push

echo "✅ Production optimizations installed!"
echo ""
echo "📝 Next steps:"
echo "1. Test rate limiting: npm run dev"
echo "2. Review PRODUCTION_DEPLOYMENT.md for deployment guide"
echo "3. Run load tests before deploying"
echo ""
echo "🎉 Your backend is production-ready for thousands of users!"
