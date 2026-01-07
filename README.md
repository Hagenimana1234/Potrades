# PoTrades - Production-Grade Binary Options Trading Platform

A complete, production-ready binary options trading platform similar to Pocket Option and Quotex, featuring real-time trading, copy trading, affiliate system, and comprehensive admin controls.

## 🎯 Features

### Trading Engine
- ✅ Real-time binary options trading (UP/DOWN)
- ✅ Multiple asset types (Crypto, Forex, Commodities, Indices)
- ✅ Customizable expiry times (5s to 1 hour)
- ✅ Real-time price streaming via WebSocket
- ✅ Automatic trade settlement
- ✅ Demo and Real wallet support
- ✅ Anti-cheat server-side validation

### User Features
- ✅ JWT authentication with refresh tokens
- ✅ 2FA (TOTP) ready
- ✅ Multi-wallet system (Demo/Real)
- ✅ Transaction history and audit logs
- ✅ Referral system
- ✅ KYC status management

### Copy Trading
- ✅ Master trader profiles with statistics
- ✅ Follower auto-copy with risk management
- ✅ Fixed amount or percentage-based copying
- ✅ Profit sharing logic
- ✅ Daily loss limits
- ✅ Performance tracking

### Affiliate System
- ✅ Multi-tier commission structure
- ✅ CPA and Revenue Share models
- ✅ Commission tracking and approval workflow
- ✅ Affiliate dashboard with statistics
- ✅ Automated commission calculations

### Admin Panel
- ✅ User management (suspend, ban, KYC approval)
- ✅ Trade monitoring and risk management
- ✅ Balance adjustments
- ✅ Asset and payout management
- ✅ Copy trader approvals
- ✅ Affiliate and commission management
- ✅ Platform analytics and exposure monitoring
- ✅ Audit logs
- ✅ System settings

### Security & Performance
- ✅ Rate limiting (express-rate-limit)
- ✅ Input sanitization
- ✅ CSRF & XSS protection (Helmet)
- ✅ SQL injection protection (Prisma)
- ✅ Atomic wallet transactions
- ✅ Redis caching
- ✅ Background job processing (BullMQ)
- ✅ Horizontal scaling support
- ✅ WebSocket clustering ready

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js + TypeScript
- PostgreSQL (Prisma ORM)
- Redis (caching, sessions)
- Socket.IO (WebSocket)
- BullMQ (background jobs)
- JWT (authentication)
- Winston (logging)

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- TanStack Query (data fetching)
- Tailwind CSS (styling)
- TradingView Lightweight Charts
- Socket.IO Client

### Database Schema

The platform uses a comprehensive PostgreSQL schema with the following main entities:

- **User Management**: users, sessions, audit_logs
- **Wallet & Finance**: wallets, transactions, deposits, withdrawals
- **Trading**: assets, prices, trades
- **Copy Trading**: copy_traders, copy_relationships
- **Affiliate**: affiliates, commissions
- **System**: system_settings, risk_limits, risk_alerts, notifications

See `backend/prisma/schema.prisma` for the complete schema.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+
- Git

### Installation

1. **Clone the repository**
```bash
cd Potrades
```

2. **Backend Setup**
```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials and secrets
```

3. **Database Setup**
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database with initial data
npm run prisma:seed
```

4. **Start Redis**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or install locally
# Follow: https://redis.io/docs/getting-started/
```

5. **Start Backend**
```bash
npm run dev
```

The backend will start on `http://localhost:3000`

6. **Frontend Setup** (in a new terminal)
```bash
cd frontend
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### Default Credentials

After seeding:
- **Admin**: `admin@potrades.com` / `admin123`
- **Demo User**: `demo@potrades.com` / `demo123`

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

#### POST /auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "referralCode": "OPTIONAL"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "referralCode": "ABC123"
  }
}
```

#### POST /auth/login
Login user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "role": "USER"
    }
  }
}
```

### Trading

#### POST /trades
Place a new trade. (Requires authentication)

**Request:**
```json
{
  "assetId": "asset_id",
  "direction": "UP",
  "amount": 10,
  "expirySeconds": 60,
  "walletType": "DEMO"
}
```

#### GET /trades
Get user's trade history.

#### GET /trades/stats
Get user's trading statistics.

#### GET /assets
Get all tradeable assets.

### See backend/src/routes/index.ts for complete API reference.

## 🔌 WebSocket Events

### Client to Server

**subscribe:price** - Subscribe to asset price updates
```json
{ "assetId": "asset_id" }
```

**subscribe:all-prices** - Subscribe to all active asset prices

**subscribe:trades** - Subscribe to user's trade updates (requires auth)

**subscribe:wallet** - Subscribe to user's wallet updates (requires auth)

### Server to Client

**price:update** - Real-time price update
```json
{
  "assetId": "asset_id",
  "symbol": "BTC/USD",
  "price": 42000.50,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**trade:update** - Trade status update

**wallet:update** - Wallet balance update

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/potrades
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
DEMO_INITIAL_BALANCE=10000
DEFAULT_REVENUE_SHARE_PERCENT=30
DEFAULT_CPA_AMOUNT=100
```

## 📦 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist folder with nginx/apache
```

### Docker Deployment

```bash
docker-compose up -d
```

### Recommended Cloud Services:
- **Database**: Neon, Supabase, AWS RDS
- **Redis**: Redis Cloud, AWS ElastiCache
- **Backend**: Railway, Render, AWS ECS
- **Frontend**: Vercel, Netlify, Cloudflare Pages

## 🔒 Security Considerations

1. Always use HTTPS in production
2. Set strong JWT secrets
3. Enable rate limiting
4. Implement proper CORS policies
5. Regular security audits
6. Keep dependencies updated
7. Use environment-specific configs
8. Implement proper logging and monitoring
9. Set up automated backups
10. Use a Web Application Firewall (WAF)

## 📈 Scaling

The platform is designed for horizontal scaling:

1. **Stateless Backend**: Multiple backend instances behind load balancer
2. **Redis Session Store**: Shared sessions across instances
3. **WebSocket Clustering**: Use Socket.IO Redis adapter
4. **Background Jobs**: BullMQ with Redis supports multiple workers
5. **Database Connection Pooling**: Prisma handles connection pooling

## 🐛 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL is correct
   - Ensure PostgreSQL is running

2. **Redis connection error**
   - Check Redis is running: `redis-cli ping`
   - Verify REDIS_URL is correct

3. **WebSocket not connecting**
   - Check CORS configuration
   - Verify WebSocket URL in frontend

4. **Trades not settling**
   - Check background jobs are running
   - Verify BullMQ worker is active

## 📄 License

Proprietary software. All rights reserved.

---

Built with ❤️ for serious trading platforms
