# 🚀 AgroFresh Deployment & Launch Guide

**Date Created**: May 4, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

---

## 📋 Pre-Deployment Checklist

### ✅ ML Models (Complete)
- [x] ProduceQualityScorer v1.0 (YOLOv5-inspired)
- [x] HarvestPredictor v1.0 (Regional calibrated)
- [x] FreshnessCalculator v1.0 (Storage-aware)
- [x] PriceForecaster v1.0 (Seasonal + quality)
- [x] All 17 unit tests passing

### ✅ Backend Integration (Complete)
- [x] MLService.js client initialized
- [x] Express routes wired
- [x] Controllers implemented
- [x] Supabase persistence configured
- [x] Error handling in place

### ✅ Frontend UI (Complete)
- [x] Farmers.tsx ML button integration
- [x] Admin Crops.tsx ML features
- [x] API helpers implemented
- [x] Display components added
- [x] State management configured

### ✅ Documentation (Complete)
- [x] README_COMPLETE.md (comprehensive)
- [x] README.md (quick start)
- [x] API documentation
- [x] ML model specifications
- [x] Environment setup guide

---

## 🎯 Deployment Steps

### Step 1: Environment Configuration

#### 1.1 Backend (.env)
```bash
# Backend/.env
cat > backend/.env << 'EOF'
# Core
PORT=3000
NODE_ENV=production
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>

# ML Service
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_TIMEOUT=30000

# Authentication
JWT_SECRET=<generate-secure-secret>
SESSION_SECRET=<generate-secure-secret>

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Database
DB_HOST=<host>
DB_USER=<user>
DB_PASS=<password>
DB_NAME=agrofresh
EOF
```

#### 1.2 ML Service (.env)
```bash
# Backend-ML/.env
cat > backend-ml/.env << 'EOF'
PORT=8001
ENVIRONMENT=production
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-service-role-key>
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
LOG_LEVEL=INFO
EOF
```

#### 1.3 Frontend (.env)
```bash
# .env.production
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://api.agrofresh.com
VITE_ML_SERVICE_URL=https://ml.agrofresh.com
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
EOF
```

---

### Step 2: Database Setup

```bash
# 1. Create Supabase project
# Go to https://supabase.com and create new project

# 2. Run migrations
# Copy DATABASE_MIGRATIONS.sql to Supabase SQL Editor and execute

# 3. Verify tables created:
# - users
# - crops
# - ai_predictions
# - image_analysis
# - orders
# - payments

# 4. Set up RLS policies
# Supabase Dashboard → Authentication → Users
# Verify security policies allow reads/writes as needed
```

---

### Step 3: Backend Deployment

#### Option A: Railway

```bash
# 1. Push to GitHub
git add .
git commit -m "Production deployment v1.0"
git push origin main

# 2. Connect Railway project
# Connect to GitHub → Select Agrofresh repo

# 3. Create Procfile (in root)
cat > Procfile << 'EOF'
web: cd backend && npm install && npm start
EOF

# 4. Set environment variables in Railway dashboard
# Copy values from backend/.env

# 5. Deploy
railway up
```

#### Option B: Heroku

```bash
# 1. Create Heroku app
heroku create agrofresh-api

# 2. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=<url>
# ... (set all vars from .env)

# 3. Create Procfile
web: node backend/app.js

# 4. Deploy
git push heroku main
```

---

### Step 4: ML Service Deployment

#### Option A: Railway

```bash
# 1. In Railway dashboard, create new service
# Service type: Python
# Root directory: backend-ml

# 2. Set start command:
# uvicorn app:app --host 0.0.0.0 --port $PORT

# 3. Set environment variables
# Copy backend-ml/.env values

# 4. Deploy automatically from GitHub
```

#### Option B: Render

```bash
# 1. Create new Web Service on Render.com

# 2. Connect GitHub repository

# 3. Set build command:
# pip install -r requirements.txt

# 4. Set start command:
# uvicorn app:app --host 0.0.0.0 --port $PORT

# 5. Add Environment Variables from backend-ml/.env

# 6. Deploy
```

---

### Step 5: Frontend Deployment

#### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy frontend
cd src
vercel

# 4. Set production environment variables
# Dashboard → Settings → Environment Variables

# 5. Enable automatic deployments from main branch
# Dashboard → Git → Production
```

#### Alternative: Netlify

```bash
# 1. Connect GitHub repository on netlify.com

# 2. Build settings:
# Base: .
# Build command: pnpm build
# Publish directory: dist

# 3. Set environment variables:
# Environment → Edit variables

# 4. Configure redirects (_redirects file)
# /*  /index.html  200
```

---

## 🔗 Domain Configuration

### SSL Certificates
```bash
# All services should use HTTPS in production
# Certificates automatically provisioned by:
# - Vercel (frontend)
# - Railway (backend & ML)
# - Render (ML alternative)
```

### DNS Setup
```
# Add DNS records to your domain registrar:

# Frontend (Vercel)
CNAME  www.agrofresh.com -> cname.vercel-dns.com

# Backend API (Railway)
CNAME  api.agrofresh.com -> <railway-domain>

# ML Service (Railway/Render)
CNAME  ml.agrofresh.com -> <render-domain>
```

### CORS Configuration
```javascript
// backend/app.js
const cors = require('cors');
const allowedOrigins = [
  'https://agrofresh.com',
  'https://www.agrofresh.com',
  'http://localhost:5173'  // dev
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## 🧪 Post-Deployment Testing

### 1. Health Checks

```bash
# Frontend
curl https://agrofresh.com

# Backend
curl https://api.agrofresh.com/health

# ML Service
curl https://ml.agrofresh.com/api/health
```

### 2. API Endpoint Testing

```bash
# Test harvest prediction
curl -X POST https://api.agrofresh.com/api/ml/predict-harvest \
  -H "Content-Type: application/json" \
  -d '{
    "crop_type": "tomato",
    "planting_date": "2026-03-15",
    "region": "Ashanti"
  }'

# Test crop types
curl https://api.agrofresh.com/api/crops/ml/crop-types
```

### 3. Database Verification

```sql
-- In Supabase SQL Editor
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM crops;
SELECT COUNT(*) FROM ai_predictions;
SELECT COUNT(*) FROM image_analysis;
```

### 4. File Upload Testing

```bash
# Upload test image
curl -X POST https://api.agrofresh.com/api/crops/1/analyze-quality \
  -F "image=@test_crop.jpg"
```

---

## 📊 Monitoring & Logging

### Backend Monitoring
- **Service**: Railway/Heroku Dashboard
- **Check**: Logs, memory usage, CPU
- **Auto-restart**: Enabled

### ML Service Monitoring
- **Service**: Railway/Render Dashboard
- **Check**: CPU, memory, response times
- **Alerts**: Set for errors

### Frontend Monitoring
- **Service**: Vercel Analytics
- **Check**: Page load times, errors
- **Real User Monitoring**: Enabled

### Database Monitoring
- **Service**: Supabase Dashboard
- **Check**: Query performance, storage usage
- **Backups**: Automated daily

---

## 🔐 Security Checklist

- [ ] All environment variables set (no hardcoded secrets)
- [ ] HTTPS enabled on all domains
- [ ] CORS configured for allowed origins only
- [ ] Database RLS policies active
- [ ] Password hashing verified (bcryptjs)
- [ ] JWT tokens configured with strong SECRET
- [ ] File upload validation active (type + size)
- [ ] Rate limiting configured
- [ ] Supabase backup enabled
- [ ] Error logs don't expose sensitive data

---

## ⚡ Performance Optimization

### Frontend
```bash
# Build with optimizations
pnpm build

# Analyze bundle
pnpm run analyze
```

### Backend
```bash
# Enable gzip compression
app.use(require('compression')());

# Use pooled database connections
max_connections = 20
```

### ML Service
```bash
# Use uvicorn with production workers
gunicorn app:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

---

## 📱 Mobile Compatibility

```javascript
// Ensure responsive design
// Test on devices:
- iPhone 12/14/15
- Samsung Galaxy
- Tablet (iPad)
```

---

## 🚨 Incident Procedures

### If Backend Fails
```bash
# 1. Check logs: Railway/Heroku dashboard
# 2. Restart service: Dashboard → Restart
# 3. Check database: Supabase status
# 4. Rollback if needed: git revert & push
```

### If ML Service Fails
```bash
# 1. Frontend displays fallback message
# 2. Check Python errors in logs
# 3. Verify API connectivity
# 4. Restart ML service
```

### If Database Down
```bash
# 1. Supabase auto-failover activates
# 2. Check backup status
# 3. Use Supabase support if needed
```

---

## 📞 Support Channels

- **GitHub Issues**: https://github.com/Dee-Rock/Agrofresh/issues
- **Email**: delalirock5@gmail.com
- **On-call**: Set up PagerDuty for critical alerts

---

## ✅ Final Checklist

- [ ] All environments configured
- [ ] Database migrations completed
- [ ] Services deployed and running
- [ ] DNS records propagated
- [ ] SSL certificates valid
- [ ] Monitoring set up
- [ ] Backup verified
- [ ] Security review complete
- [ ] Team trained
- [ ] Go-live approved

---

## 🎉 Deployment Complete!

Your AgroFresh platform is now live in production:

- **Frontend**: https://agrofresh.com
- **API**: https://api.agrofresh.com
- **ML Service**: https://ml.agrofresh.com

**Next Steps**:
1. Monitor application 24/7
2. Gather user feedback
3. Plan Phase 2 features
4. Schedule team review meeting

---

**Deployed**: May 4, 2026  
**Version**: 1.0.0  
**Status**: ✅ Live in Production
