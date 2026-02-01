# Environment Setup Guide

This guide explains how to configure the `.env` file for the PoTrades Binary Options Trading Platform.

## Quick Start

1. Copy `.env.example` to `.env` (already done)
2. Update the values in `.env` with your actual credentials
3. Follow the detailed setup instructions below

---

## Required Configuration

### 1. Database (Neon PostgreSQL)

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Setup Steps:**
1. Go to [https://neon.tech](https://neon.tech)
2. Create a free account and new project
3. Create a database named `potrades`
4. Copy the connection string from the dashboard
5. Paste it into `DATABASE_URL`

**Free Tier:** 3 GB storage, 1 compute unit

---

### 2. Redis (Redis Cloud)

```env
REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:port
REDIS_TLS=true
```

**Setup Steps:**
1. Go to [https://redis.com/try-free/](https://redis.com/try-free/)
2. Create a free account
3. Create a new database
4. Copy the connection string (enable TLS for cloud)
5. Paste it into `REDIS_URL`
6. Set `REDIS_TLS=true` for cloud Redis

**Free Tier:** 30 MB storage, 30 concurrent connections

**Local Development:** Use `redis://localhost:6379` with `REDIS_TLS=false`

---

### 3. Market Data - Twelve Data API ⭐

```env
TWELVEDATA_API_KEY=your-twelvedata-api-key-here
```

**Setup Steps:**
1. Go to [https://twelvedata.com/](https://twelvedata.com/)
2. Click "Sign Up" and create a free account
3. Navigate to your [API Dashboard](https://twelvedata.com/account/api)
4. Copy your API key
5. Paste it into `TWELVEDATA_API_KEY`

**Supported Asset Types:**
- ✅ **FOREX**: EUR/USD, GBP/USD, USD/JPY, etc. (180+ currency pairs)
- ✅ **CRYPTO**: BTC/USD, ETH/USD, LTC/USD, etc. (2000+ cryptocurrencies)
- ✅ **STOCKS**: AAPL, GOOGL, MSFT, TSLA, etc. (10,000+ stocks)
- ✅ **ETFs**: SPY, QQQ, IWM, VOO, etc. (1000+ ETFs)

**API Plans:**

| Plan | API Calls/Day | Price | WebSocket | Best For |
|------|---------------|-------|-----------|----------|
| Free | 800 | $0/month | ❌ | Development/Testing |
| Basic | 8,000 | $8/month | ❌ | Small platforms |
| Pro | 30,000 | $30/month | ✅ | Production |
| Advanced | 120,000 | $80/month | ✅ | High volume |

**Recommended:** Start with Free for development, upgrade to Pro for production

**API Endpoints Used:**
- `/price` - Real-time price quotes
- `/time_series` - Historical OHLCV data
- WebSocket - Live price streaming (Pro+ plans)

**Rate Limiting:**
- Current setting: 1000ms between requests (1 request/second)
- Adjust `TWELVEDATA_RATE_LIMIT` in code if needed

---

### 4. Security Keys

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

**Generate Secure Keys:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Using OpenSSL
openssl rand -hex 64

# Using /dev/urandom (Linux/Mac)
head -c 64 /dev/urandom | base64
```

**IMPORTANT:**
- ⚠️ Never commit actual secrets to Git
- ⚠️ Use different secrets for development and production
- ⚠️ Change all default secrets before deploying

---

### 5. Payment Gateway (Optional)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup Steps:**
1. Go to [https://stripe.com](https://stripe.com)
2. Create an account
3. Get your test keys from [Dashboard > Developers > API keys](https://dashboard.stripe.com/test/apikeys)
4. Set up a webhook endpoint at `https://your-domain.com/api/webhooks/stripe`
5. Copy the webhook secret

**Development:** Use test keys (`sk_test_...`)
**Production:** Use live keys (`sk_live_...`)

---

## Optional Configuration

### Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@potrades.com
```

**Gmail Setup:**
1. Enable 2FA on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASSWORD`

**Alternatives:** SendGrid, AWS SES, Mailgun

---

### Monitoring (Sentry)

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**Setup Steps:**
1. Go to [https://sentry.io](https://sentry.io)
2. Create a project
3. Copy the DSN
4. Paste into `SENTRY_DSN`

**Free Tier:** 5,000 events/month

---

## Environment Variables Reference

### Application

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `PORT` | Server port | `3000` | ✅ |
| `API_URL` | Backend URL | `http://localhost:3000` | ✅ |
| `CLIENT_URL` | Frontend URL | `http://localhost:5173` | ✅ |

### Database

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `DATABASE_POOL_MIN` | Min pool connections | `2` | ❌ |
| `DATABASE_POOL_MAX` | Max pool connections | `10` | ❌ |

### Redis

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | Redis connection string | - | ✅ |
| `REDIS_TLS` | Enable TLS | `false` | ✅ |
| `REDIS_CLUSTER_MODE` | Cluster mode | `false` | ❌ |

### JWT

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Access token secret | - | ✅ |
| `JWT_REFRESH_SECRET` | Refresh token secret | - | ✅ |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` | ✅ |

### Market Data

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `TWELVEDATA_API_KEY` | Twelve Data API key | - | ✅ |
| `MARKET_DATA_PROVIDER` | Data provider | `twelvedata` | ✅ |

---

## Deployment Checklist

Before deploying to production:

- [ ] Update `NODE_ENV=production`
- [ ] Set strong, unique secrets (JWT, Session)
- [ ] Use production database (Neon)
- [ ] Use production Redis (Redis Cloud with TLS)
- [ ] Add Twelve Data API key (Pro plan recommended)
- [ ] Configure Stripe live keys
- [ ] Set up SMTP for emails
- [ ] Add Sentry DSN for monitoring
- [ ] Set `SESSION_SECURE=true` (HTTPS only)
- [ ] Update `API_URL` and `CLIENT_URL` to production domains
- [ ] Verify all rate limits are appropriate
- [ ] Test all integrations thoroughly

---

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL connection string format
- Check if IP is whitelisted (Neon: Settings > IP Allow)
- Ensure SSL mode is enabled: `?sslmode=require`

### Redis Connection Issues
- Verify Redis URL format
- Enable TLS for cloud Redis (`REDIS_TLS=true`)
- Check firewall rules

### Twelve Data API Issues
- Verify API key is correct
- Check rate limits (800 calls/day on free plan)
- Monitor usage in [Twelve Data Dashboard](https://twelvedata.com/account)
- Upgrade plan if hitting limits

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear build cache: `rm -rf dist && npm run build`
- Check TypeScript version: `npx tsc --version`

---

## Support

For issues or questions:
- Platform: [GitHub Issues](https://github.com/Hagenimana1234/Potrades/issues)
- Twelve Data: [Support](https://twelvedata.com/support)
- Neon: [Documentation](https://neon.tech/docs)
- Redis: [Documentation](https://redis.io/docs)

---

## Security Best Practices

1. **Never commit `.env` to Git** (already in `.gitignore`)
2. **Rotate secrets regularly** (every 90 days)
3. **Use environment-specific configs** (dev/staging/prod)
4. **Limit API key permissions** (read-only when possible)
5. **Monitor API usage** (set up alerts for unusual activity)
6. **Use HTTPS in production** (enable `SESSION_SECURE=true`)
7. **Implement rate limiting** (already configured)
8. **Audit logs regularly** (check access patterns)

---

**Last Updated:** 2025-01-07
**Platform Version:** 1.0.0
**Maintainer:** PoTrades Team
