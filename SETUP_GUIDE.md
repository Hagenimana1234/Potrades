# 🚀 PoTrades Setup Guide

Complete step-by-step guide to get your production-grade binary options trading platform running.

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ PostgreSQL 14+ installed and running
- ✅ Redis 6+ installed and running
- ✅ Git installed

## 🔧 Installation Steps

### 1. Database Setup

**Option A: Using Local PostgreSQL**
```bash
# Create database
psql -U postgres
CREATE DATABASE potrades;
\q
```

**Option B: Using Cloud Database (Recommended for Production)**
- Sign up for [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
- Create a new PostgreSQL database
- Copy the connection string (starts with `postgresql://`)

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env file with your settings
nano .env  # or use your preferred editor
```

**Update your .env file:**
```bash
# REQUIRED: Update these values
DATABASE_URL=postgresql://user:password@localhost:5432/potrades
REDIS_URL=redis://localhost:6379

# IMPORTANT: Change these secrets in production!
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Optional: Keep defaults for development
PORT=3000
NODE_ENV=development
```

### 3. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init

# Seed database with initial data (admin, demo user, assets)
npm run prisma:seed
```

**After seeding, you'll see:**
```
✓ Admin user created: admin@potrades.com
✓ Demo user created: demo@potrades.com
✓ Asset created: BTC/USD
✓ Asset created: ETH/USD
... (more assets)
✓ System settings created
✅ Database seeded successfully!

Default credentials:
Admin: admin@potrades.com / admin123
Demo: demo@potrades.com / demo123
```

### 4. Start Redis

**Option A: Using Docker (Recommended)**
```bash
docker run -d -p 6379:6379 --name potrades-redis redis:alpine
```

**Option B: Using Local Redis**
```bash
# Start Redis server
redis-server

# In another terminal, verify it's running
redis-cli ping
# Should return: PONG
```

### 5. Start Backend Server

```bash
# Development mode with hot reload
npm run dev

# You should see:
# Starting PoTrades Backend...
# ✓ Database connected
# ✓ WebSocket server initialized
# ✓ Market data streams started
# ✓ Background jobs initialized
# ✓ Server running on port 3000
# 🚀 PoTrades Backend is ready!
```

The backend is now running at `http://localhost:3000`

### 6. Frontend Setup

Open a **new terminal** window:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will start at `http://localhost:5173`

## 🎉 Access the Platform

1. Open your browser and go to: **http://localhost:5173**

2. You'll see the login page

3. **Quick Login Options:**
   - Click "Admin" button for admin access
   - Click "Demo User" button for regular user access
   - Or login manually:
     - Admin: `admin@potrades.com` / `admin123`
     - Demo: `demo@potrades.com` / `demo123`

4. After login, you'll see the trading dashboard!

## 🎯 Testing the Platform

### Test Binary Options Trading

1. **Select an Asset:**
   - Click on the asset dropdown at the top
   - Choose any asset (e.g., BTC/USD, EUR/USD)

2. **Place a Trade:**
   - Select expiry time (1m, 2m, 3m, 5m)
   - Set trade amount (e.g., $10)
   - View the payout percentage
   - Click **UP** or **DOWN** to place trade

3. **Watch Real-Time:**
   - See the countdown timer
   - Chart updates in real-time
   - Trade settles automatically when timer reaches 0
   - Balance updates instantly

### Test Demo/Real Account Switching

1. Click the **Demo/Real toggle** at the top right
2. Balance switches between accounts
3. Place trades on either account

### Test Social Trading

1. Click "Social Trading" tab on the right panel
2. View top traders with their stats
3. Click "Follow" to copy a trader's trades

### Test Admin Features

Login as admin to access:
- User management
- Platform statistics
- Trade monitoring
- Balance adjustments
- Asset management
- Affiliate approvals

## 📊 Viewing the Database

```bash
cd backend
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555` where you can:
- View all database tables
- See users, trades, wallets, transactions
- Edit data directly
- Monitor real-time updates

## 🐛 Troubleshooting

### Backend won't start

**Error: "Can't reach database server"**
```bash
# Check if PostgreSQL is running
pg_isready

# Check your DATABASE_URL in .env
# Make sure connection string is correct
```

**Error: "Redis connection failed"**
```bash
# Check if Redis is running
redis-cli ping

# If using Docker:
docker ps | grep redis

# Restart Redis container:
docker restart potrades-redis
```

### Frontend shows blank page

**Check browser console (F12)**

Common fixes:
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

### Trades not settling

**Check backend logs**

Make sure:
1. Redis is running (background jobs need Redis)
2. Background worker is active
3. Check terminal for any errors

### WebSocket not connecting

**Check:**
1. Backend is running on port 3000
2. No firewall blocking WebSocket connections
3. Browser console for connection errors

## 🔄 Restarting Everything

If you need to restart the entire platform:

```bash
# Stop all services (Ctrl+C in each terminal)

# Restart in this order:
# Terminal 1: Redis
docker restart potrades-redis  # or redis-server

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

## 📦 Production Deployment

For production deployment, see the main [README.md](README.md) for:
- Environment configuration
- Security best practices
- Cloud deployment options
- Docker deployment
- Scaling strategies

## 🎓 Next Steps

Now that your platform is running:

1. **Explore Features:**
   - Place multiple trades
   - Test different assets
   - Try copy trading
   - Check transaction history

2. **Customize:**
   - Add more assets (see `backend/prisma/seed.ts`)
   - Adjust payout percentages
   - Modify UI colors/theme
   - Configure commission rates

3. **Integrate Payment:**
   - Add Stripe for deposits
   - Configure withdrawal methods
   - Set up commission payouts

4. **Add More Features:**
   - Email notifications
   - SMS alerts
   - Mobile app (React Native)
   - Advanced analytics

## 📞 Need Help?

- Check the main [README.md](README.md) for API documentation
- Review code comments in source files
- Check backend logs for detailed error messages
- Ensure all environment variables are set correctly

---

**You now have a fully functional, production-grade binary options trading platform!** 🎉

Start trading and explore all the features. The platform is ready for real-world use with proper security, scalability, and performance.
