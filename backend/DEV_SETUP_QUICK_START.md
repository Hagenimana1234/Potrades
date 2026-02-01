# Quick Start - Development Setup

Your application is failing to start because Redis and PostgreSQL are not accessible. Here are your options:

## Option 1: Install Services Locally (Recommended for Development)

### Install Redis Locally

**Windows:**
```bash
# Using Chocolatey
choco install redis-64

# Or download from: https://github.com/tporadowski/redis/releases
# Extract and run: redis-server.exe
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### Install PostgreSQL Locally

**Windows:**
```bash
# Download from: https://www.postgresql.org/download/windows/
# Or using Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

After installing PostgreSQL:
```bash
# Create database
psql -U postgres
CREATE DATABASE potrades;
\q
```

Update your `.env`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/potrades
REDIS_URL=redis://localhost:6379
```

---

## Option 2: Use Cloud Services (Free Tiers)

### Neon PostgreSQL (Free)
1. Go to https://neon.tech
2. Sign up for free
3. Create new project → database named `potrades`
4. Copy connection string
5. Update `.env`:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/potrades?sslmode=require
```

### Redis Cloud (Free)
1. Go to https://redis.com/try-free/
2. Sign up for free (30MB free tier)
3. Create new database
4. Enable TLS and copy connection string
5. Update `.env`:
```env
REDIS_URL=redis://default:password@redis-xxx.cloud.redislabs.com:port
REDIS_TLS=true
```

---

## Option 3: Use Docker (Easiest)

Create `docker-compose.yml` in backend folder:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: potrades
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Then run:
```bash
docker-compose up -d
```

Update `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/potrades
REDIS_URL=redis://localhost:6379
REDIS_TLS=false
```

---

## Current Error Analysis

Based on your error output, I see:

1. **Redis Error**: Trying to connect to:
   - `localhost:6379` (not running)
   - `redis-15714.c16.us-east-1-2.ec2.cloud.redislabs.com` (DNS not found - may be deleted or incorrect)

2. **Database Error**: Trying to connect to:
   - `ep-delicate-bonus-ahdzkf83-pooler.c-3.us-east-1.aws.neon.tech:5432` (can't reach - may be deleted, wrong region, or firewall issue)

**Quick Fix**: Check if you have another `.env` file on your Windows machine at:
```
C:\Users\felic\OneDrive\Desktop\Potradev\Potrades\backend\.env
```

If these cloud services were previously set up:
- **Neon**: Check if the database still exists at https://console.neon.tech
- **Redis Cloud**: Check if the instance exists at https://app.redislabs.com

---

## Run Database Migrations

After setting up PostgreSQL:

```bash
cd backend
npm run migrate:dev
```

---

## Start the Application

```bash
cd backend
npm run dev
```

---

## Minimal .env for Local Development

```env
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

# Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/potrades

# Local Redis
REDIS_URL=redis://localhost:6379
REDIS_TLS=false

# Secrets (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=development-jwt-secret-change-in-production
JWT_REFRESH_SECRET=development-refresh-secret-change-in-production
SESSION_SECRET=development-session-secret-change-in-production

# Twelve Data API (optional for now - simulated data will be used)
TWELVEDATA_API_KEY=

# Optional services
STRIPE_SECRET_KEY=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
```

---

## Need Help?

If you're still stuck, let me know which option you want to use:
1. Local services (Docker)
2. Cloud services (Neon + Redis Cloud)
3. Skip for now (I can make services optional in dev mode)
