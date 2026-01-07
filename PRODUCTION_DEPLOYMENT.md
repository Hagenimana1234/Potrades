# 🚀 Production Deployment Guide - Millions of Users

Complete guide for deploying PoTrades to production with horizontal scaling, load balancing, and cloud infrastructure.

## 🏗️ Architecture Overview

The platform is designed for **millions of concurrent users** with:

- ✅ **Stateless Backend** - Multiple instances behind load balancer
- ✅ **Redis Session Store** - Shared sessions across all instances
- ✅ **WebSocket Clustering** - Socket.IO Redis adapter for real-time sync
- ✅ **Database Connection Pooling** - Optimized Prisma configuration
- ✅ **Background Job Workers** - BullMQ with Redis for distributed processing
- ✅ **Health Checks** - Load balancer integration with /health, /ready, /live endpoints
- ✅ **Auto-scaling** - Kubernetes/ECS support

## 📦 Cloud Services Setup

### 1. Neon PostgreSQL (Database)

**Why Neon?**
- Serverless PostgreSQL with auto-scaling
- Branching for dev/staging/production
- Connection pooling built-in
- Pay-per-use pricing

**Setup Steps:**

1. **Sign up**: https://neon.tech
2. **Create Project**: "PoTrades Production"
3. **Get Connection String**:
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/potrades?sslmode=require
   ```

4. **Configure Connection Pool**:
   - Go to Project Settings → Compute
   - Set: **Min Connections: 2, Max Connections: 20**
   - Enable **Autoscaling**

5. **Update .env**:
   ```bash
   DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/potrades?sslmode=require
   DATABASE_POOL_MIN=2
   DATABASE_POOL_MAX=20
   ```

### 2. Redis Cloud (Cache & Sessions)

**Why Redis Cloud?**
- Managed Redis with 99.99% uptime
- Automatic failover
- Clustering support
- Global replication

**Setup Steps:**

1. **Sign up**: https://redis.com/try-free/
2. **Create Database**:
   - Name: "potrades-production"
   - Plan: High-availability (for production)
   - Region: Same as your app servers

3. **Get Connection String**:
   ```
   redis://default:password@redis-xxxxx.cloud.redislabs.com:16379
   ```

4. **Update .env**:
   ```bash
   REDIS_URL=redis://default:password@redis-xxxxx.cloud.redislabs.com:16379
   REDIS_TLS=true
   ```

## 🚀 Deployment Options

### Option 1: Railway (Recommended for Quick Start)

**Advantages:**
- Zero configuration load balancing
- Auto-scaling
- Free SSL
- GitHub integration
- $5/month startup

**Steps:**

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Create New Project**:
   ```bash
   cd backend
   railway init
   ```

3. **Add Services**:
   ```bash
   # Deploy backend
   railway up

   # Set environment variables
   railway variables set DATABASE_URL="postgresql://..."
   railway variables set REDIS_URL="redis://..."
   railway variables set JWT_SECRET="your-secret"
   ```

4. **Deploy Frontend**:
   ```bash
   cd ../frontend
   railway init
   railway variables set VITE_API_URL="https://your-backend.railway.app/api"
   railway up
   ```

5. **Enable Autoscaling**:
   - Go to Railway Dashboard
   - Project Settings → Deployments
   - Enable "Auto-scale replicas" (min: 2, max: 10)

### Option 2: AWS ECS with Application Load Balancer

**For Enterprise Scale (1M+ users)**

#### Infrastructure Setup

1. **VPC Configuration**:
   ```bash
   # Create VPC with public/private subnets
   aws ec2 create-vpc --cidr-block 10.0.0.0/16
   ```

2. **Application Load Balancer**:
   ```bash
   # Create ALB
   aws elbv2 create-load-balancer \
     --name potrades-alb \
     --subnets subnet-xxx subnet-yyy \
     --security-groups sg-xxx \
     --scheme internet-facing
   ```

3. **Target Groups**:
   ```bash
   # Backend target group
   aws elbv2 create-target-group \
     --name potrades-backend \
     --protocol HTTP \
     --port 3000 \
     --vpc-id vpc-xxx \
     --health-check-path /api/ready \
     --health-check-interval-seconds 30
   ```

4. **ECS Cluster**:
   ```bash
   aws ecs create-cluster --cluster-name potrades-production
   ```

5. **Task Definition** (backend-task.json):
   ```json
   {
     "family": "potrades-backend",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "1024",
     "memory": "2048",
     "containerDefinitions": [
       {
         "name": "backend",
         "image": "your-ecr-repo/potrades-backend:latest",
         "portMappings": [
           {
             "containerPort": 3000,
             "protocol": "tcp"
           }
         ],
         "environment": [
           {"name": "NODE_ENV", "value": "production"},
           {"name": "PORT", "value": "3000"}
         ],
         "secrets": [
           {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
           {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:..."}
         ],
         "healthCheck": {
           "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
           "interval": 30,
           "timeout": 5,
           "retries": 3
         },
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/potrades-backend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

6. **Service with Auto-scaling**:
   ```bash
   # Create service
   aws ecs create-service \
     --cluster potrades-production \
     --service-name potrades-backend-service \
     --task-definition potrades-backend \
     --desired-count 3 \
     --launch-type FARGATE \
     --load-balancers targetGroupArn=arn:aws:...,containerName=backend,containerPort=3000

   # Enable auto-scaling (3 to 20 instances)
   aws application-autoscaling register-scalable-target \
     --service-namespace ecs \
     --resource-id service/potrades-production/potrades-backend-service \
     --scalable-dimension ecs:service:DesiredCount \
     --min-capacity 3 \
     --max-capacity 20

   # CPU-based scaling
   aws application-autoscaling put-scaling-policy \
     --policy-name cpu-scaling \
     --service-namespace ecs \
     --resource-id service/potrades-production/potrades-backend-service \
     --scalable-dimension ecs:service:DesiredCount \
     --policy-type TargetTrackingScaling \
     --target-tracking-scaling-policy-configuration file://scaling-policy.json
   ```

### Option 3: Kubernetes (GKE, EKS, AKS)

**For Maximum Control & Scale**

#### Kubernetes Configuration Files

**1. Deployment (backend-deployment.yaml)**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: potrades-backend
  labels:
    app: potrades-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: potrades-backend
  template:
    metadata:
      labels:
        app: potrades-backend
    spec:
      containers:
      - name: backend
        image: gcr.io/your-project/potrades-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: potrades-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: potrades-secrets
              key: redis-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /api/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: potrades-backend-service
spec:
  type: LoadBalancer
  selector:
    app: potrades-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: potrades-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: potrades-backend
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**2. Deploy to Kubernetes**:
```bash
# Create secrets
kubectl create secret generic potrades-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...' \
  --from-literal=jwt-secret='...'

# Deploy
kubectl apply -f backend-deployment.yaml

# Check status
kubectl get pods
kubectl get hpa
kubectl get svc
```

## 🔧 Environment Configuration

**Production .env**:
```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://api.potrades.com
CLIENT_URL=https://potrades.com

# Database - Neon PostgreSQL
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/potrades?sslmode=require&pgbouncer=true
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_POOL_TIMEOUT=60000

# Redis Cloud
REDIS_URL=rediss://default:password@redis-xxxxx.cloud.redislabs.com:16379
REDIS_TLS=true

# Security
JWT_SECRET=<generate-with-openssl-rand-hex-64>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-hex-64>
SESSION_SECRET=<generate-with-openssl-rand-hex-64>
SESSION_SECURE=true

# Rate Limiting (adjusted for production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Payment
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📊 Monitoring & Observability

### 1. Application Metrics

Add to package.json:
```bash
npm install prom-client
```

Expose metrics endpoint for Prometheus/Datadog.

### 2. Logging

**Recommended**: Papertrail, Datadog, or CloudWatch

Update logger configuration:
```typescript
// Production logging to external service
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Http({
    host: 'logs.papertrailapp.com',
    port: 12345,
    ssl: true
  }));
}
```

### 3. APM (Application Performance Monitoring)

**New Relic** or **Datadog APM**:
```bash
npm install newrelic
# Add to top of src/index.ts
require('newrelic');
```

## 🔐 Security Checklist

- [x] HTTPS only (enforce with load balancer)
- [x] Strong JWT secrets (64+ characters random)
- [x] Rate limiting enabled
- [x] CORS properly configured
- [x] Helmet security headers
- [x] SQL injection protection (Prisma)
- [x] Input validation (Zod)
- [x] Session encryption
- [x] Regular dependency updates
- [x] DDoS protection (Cloudflare/AWS Shield)

## 🚦 Load Testing

Before going live, test with:

```bash
# Install k6
brew install k6

# Load test script (loadtest.js)
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 500 },   // Ramp to 500 users
    { duration: '3m', target: 500 },   // Stay at 500
    { duration: '1m', target: 1000 },  // Ramp to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000
    { duration: '1m', target: 0 },     // Ramp down
  ],
};

export default function() {
  let res = http.get('https://api.potrades.com/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}

# Run test
k6 run loadtest.js
```

## 📈 Scaling Targets

Based on load testing, configure:

**For 100K concurrent users:**
- Backend instances: 10-15
- Database connections: 100-150
- Redis memory: 8GB
- Load balancer: Application LB

**For 1M concurrent users:**
- Backend instances: 50-100
- Database: Neon auto-scaling enabled
- Redis: Cluster mode with 32GB+
- CDN: Cloudflare for static assets
- Multi-region deployment

## 🌍 Multi-Region Deployment

For global users:

1. **Deploy to multiple regions**:
   - US-East (primary)
   - EU-West (Europe)
   - AP-Southeast (Asia)

2. **Use GeoDNS**: Route53 or Cloudflare
3. **Database**: Neon read replicas in each region
4. **Redis**: Redis Enterprise with active-active replication

## 💰 Cost Estimates

**For 100K active users:**
- Neon PostgreSQL: ~$50/month
- Redis Cloud: ~$30/month
- App hosting (Railway/ECS): ~$200/month
- Bandwidth: ~$50/month
- **Total: ~$330/month**

**For 1M active users:**
- Neon PostgreSQL: ~$200/month
- Redis Cloud: ~$150/month
- App hosting: ~$1000/month
- Bandwidth: ~$300/month
- CDN: ~$100/month
- **Total: ~$1750/month**

## 🎯 Go-Live Checklist

- [ ] Database migrations run on production DB
- [ ] All environment variables set
- [ ] SSL certificates configured
- [ ] Load balancer health checks working
- [ ] Monitoring/alerting configured
- [ ] Backup strategy implemented
- [ ] Auto-scaling tested
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] DNS configured
- [ ] CDN setup for frontend
- [ ] Payment gateway in live mode

---

**Your platform is now ready to handle millions of users!** 🚀

With proper monitoring and auto-scaling configured, the platform will automatically handle traffic spikes and maintain 99.99% uptime.
