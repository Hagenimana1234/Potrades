# Environment Variables Documentation

Complete guide to all environment variables required for the Production-Grade Synthetic Forex, Crypto OTC & Binary Trading Platform.

---

## 📋 Table of Contents

1. [Backend Environment Variables](#backend-environment-variables)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Production Deployment](#production-deployment)
4. [Security Best Practices](#security-best-practices)

---

## Backend Environment Variables

### Core Application Settings

```bash
# Server Configuration
NODE_ENV=development|production|test
PORT=3000
INSTANCE_ID=instance-1  # Auto-generated if not set

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

### Database Configuration

```bash
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@localhost:5432/potrades?schema=public"

# Connection Pool Settings (optional)
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Redis Configuration

```bash
# Redis for Sessions, Cache, WebSocket Clustering, BullMQ
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
```

### JWT & Security

```bash
# JWT Secrets (CRITICAL - Use strong random strings in production)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-in-production

# Token Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Secret
SESSION_SECRET=your-session-secret-change-this-in-production
```

### External API Keys

```bash
# Market Data APIs
BINANCE_API_KEY=  # Optional - Binance API for crypto prices
BINANCE_API_SECRET=  # Optional

TWELVEDATA_API_KEY=  # Optional - Twelve Data API for forex prices
# Get free API key at: https://twelvedata.com/
```

### Payment Gateway Configuration

```bash
# Flutterwave (for deposits/withdrawals)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST-xxxxx

# Paystack (alternative payment gateway)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
```

### Email Service (SMTP)

```bash
# Email Configuration for Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true for port 465, false for other ports
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Sender Information
EMAIL_FROM=noreply@potrades.com
EMAIL_FROM_NAME=PoTrades Platform
```

### SMS Service

```bash
# Twilio SMS (for SMS notifications)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Africa's Talking SMS (alternative)
AFRICASTALKING_USERNAME=sandbox
AFRICASTALKING_API_KEY=xxxxx
```

### Cloud Storage (Optional)

```bash
# AWS S3 for file uploads (KYC documents, profile pictures)
AWS_ACCESS_KEY_ID=AKIAXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=potrades-uploads

# Cloudinary (alternative)
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
```

### Admin Configuration

```bash
# Default Admin Account (created on first startup)
ADMIN_EMAIL=admin@potrades.com
ADMIN_PASSWORD=change-this-secure-password
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator
```

### Logging & Monitoring

```bash
# Log Level
LOG_LEVEL=info|debug|warn|error

# Sentry (for error tracking)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

### Rate Limiting

```bash
# API Rate Limits (requests per minute)
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window

# Trade Rate Limit
TRADE_RATE_LIMIT_MAX=10  # Max trades per minute per user
```

---

## Frontend Environment Variables

### API Configuration

```bash
# Backend API URL
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000

# Environment
VITE_ENV=development|production
```

### Payment Gateway (Client-side keys)

```bash
# Flutterwave Public Key
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx

# Paystack Public Key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
```

### Analytics & Monitoring

```bash
# Google Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Sentry (error tracking)
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

---

## Production Deployment

### Required Environment Variables (Production)

**CRITICAL - Must be changed in production:**

```bash
# Security Keys (GENERATE NEW STRONG RANDOM STRINGS)
JWT_SECRET=<GENERATE_STRONG_32_CHAR_RANDOM_STRING>
JWT_REFRESH_SECRET=<GENERATE_STRONG_32_CHAR_RANDOM_STRING>
SESSION_SECRET=<GENERATE_STRONG_32_CHAR_RANDOM_STRING>

# Database (Use managed PostgreSQL service)
DATABASE_URL="postgresql://user:pass@production-db-host:5432/potrades?schema=public&connection_limit=20"

# Redis (Use managed Redis service - AWS ElastiCache, Redis Cloud, etc.)
REDIS_URL=redis://production-redis-host:6379

# Node Environment
NODE_ENV=production

# API URLs
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Environment Variable Priority

1. System environment variables (highest priority)
2. `.env` file in project root
3. Default values in code (lowest priority)

### Setting Environment Variables

#### Development (.env file)

```bash
# Create .env file in backend directory
cp .env.example .env

# Edit .env with your values
nano .env
```

#### Production (Server)

**Option 1: Using systemd service**

```bash
# /etc/systemd/system/potrades.service
[Service]
Environment="NODE_ENV=production"
Environment="DATABASE_URL=postgresql://..."
Environment="REDIS_URL=redis://..."
# ... other variables
```

**Option 2: Using Docker**

```bash
# docker-compose.yml
services:
  backend:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
```

**Option 3: Cloud Platform (Heroku, AWS, etc.)**

```bash
# Heroku example
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=postgresql://...
heroku config:set JWT_SECRET=your-secret
```

---

## Security Best Practices

### 1. **Never Commit Secrets to Git**

```bash
# Always add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### 2. **Generate Strong Secrets**

```bash
# Generate random 32-character string (Linux/Mac)
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. **Use Different Secrets for Each Environment**

- Development: Can use simple secrets
- Staging: Use different secrets than production
- Production: Use strong, unique secrets

### 4. **Rotate Secrets Regularly**

- JWT secrets: Rotate every 90 days
- API keys: Rotate when team members leave
- Database passwords: Rotate every 180 days

### 5. **Use Secret Management Services (Production)**

Consider using:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

### 6. **Environment Variable Validation**

The application validates critical environment variables on startup:
- JWT_SECRET (required in production)
- DATABASE_URL (required)
- REDIS_URL (required for production)

Missing critical variables will prevent startup.

---

## External API Service Setup

### Binance API (Crypto Prices)

1. Create account at https://www.binance.com
2. Go to API Management
3. Create API Key (read-only permissions sufficient)
4. Add to `.env`:
   ```bash
   BINANCE_API_KEY=your-api-key
   ```

**Note:** Binance API is free for price data. No API key required for basic price fetching.

### Twelve Data API (Forex Prices)

1. Sign up at https://twelvedata.com/
2. Free tier: 800 API calls per day
3. Get API key from dashboard
4. Add to `.env`:
   ```bash
   TWELVEDATA_API_KEY=your-api-key
   ```

### Flutterwave (Payment Gateway)

1. Sign up at https://flutterwave.com
2. Get test keys from settings
3. Add to `.env`:
   ```bash
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-test-xxxxx
   FLUTTERWAVE_SECRET_KEY=FLWSECK-test-xxxxx
   FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST-xxxxx
   ```

### Gmail SMTP (Email Notifications)

1. Enable 2FA on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```

---

## Testing Environment Variables

### Check if variables are loaded:

```bash
# Backend
cd backend
npm run dev

# Look for startup logs:
# ✓ Database connected
# ✓ Redis connected
# ✓ External APIs configured
```

### Test individual services:

```bash
# Test database connection
npx prisma studio

# Test Redis connection
redis-cli ping

# Test email sending (in your app)
POST /api/auth/test-email
```

---

## Environment Files Structure

```
potrades/
├── backend/
│   ├── .env                 # Backend environment variables
│   ├── .env.example         # Template with dummy values
│   └── .env.production      # Production values (never commit!)
│
├── frontend/
│   ├── .env                 # Frontend environment variables
│   ├── .env.example         # Template with dummy values
│   └── .env.production      # Production values (never commit!)
│
└── ENVIRONMENT_VARIABLES.md # This file
```

---

## Troubleshooting

### Issue: "JWT_SECRET is not defined"

**Solution:** Add JWT_SECRET to your .env file
```bash
JWT_SECRET=your-secret-key-here
```

### Issue: "Cannot connect to database"

**Solution:** Check DATABASE_URL format
```bash
# Correct format:
DATABASE_URL="postgresql://username:password@host:port/database"
```

### Issue: "Redis connection failed"

**Solution:**
1. Ensure Redis is running: `redis-cli ping`
2. Check REDIS_URL: `REDIS_URL=redis://localhost:6379`

### Issue: "External API rate limit exceeded"

**Solution:**
- Binance: Respect rate limits (100ms delay implemented)
- Twelve Data: Free tier is 800 calls/day. Consider caching or upgrading.

---

## Support

For issues with environment variables:
1. Check logs: `npm run dev` in backend
2. Verify .env file exists and has correct format
3. Ensure no spaces around `=` in .env files
4. Check for typos in variable names

---

## Production Checklist

Before deploying to production:

- [ ] Change all secrets (JWT_SECRET, SESSION_SECRET, etc.)
- [ ] Use production database (managed PostgreSQL)
- [ ] Use production Redis (managed service)
- [ ] Configure production payment gateway keys
- [ ] Set up email SMTP with production domain
- [ ] Configure SSL/TLS certificates
- [ ] Set NODE_ENV=production
- [ ] Enable error monitoring (Sentry)
- [ ] Set up log aggregation
- [ ] Configure automatic backups
- [ ] Test all external API integrations
- [ ] Review and set appropriate rate limits
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerts

---

**Last Updated:** 2025-01-09

**Platform Version:** 1.0.0

**Documentation maintained by:** PoTrades Development Team
