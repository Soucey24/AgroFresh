# Environment Setup Guide

**Complete setup instructions for all environments (Development & Production)**

---

## Part 1: Backend Node.js Environment

### Create .env file

**File:** `backend/.env`

```env
# ============================================
# Server Configuration
# ============================================
PORT=4000
NODE_ENV=development
SESSION_SECRET=your-secret-key-change-this-in-production

# ============================================
# Database Configuration (Supabase)
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct PostgreSQL connection (for session store)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# ============================================
# Frontend Configuration
# ============================================
FRONTEND_URL=http://localhost:3000

# ============================================
# ML Service Configuration
# ============================================
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_TIMEOUT=30000

# ============================================
# Payment Integration (Paystack/Sendstack)
# ============================================
PAYSTACK_PUBLIC_KEY=pk_test_...
PAYSTACK_SECRET_KEY=sk_test_...

# ============================================
# Delivery Integration (Sendstack)
# ============================================
SENDSTACK_API_KEY=your_sendstack_api_key
SENDSTACK_APP_ID=your_app_id
SENDSTACK_APP_SECRET=your_app_secret

# ============================================
# File Upload Configuration
# ============================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=debug
LOG_FILE=logs/app.log

# ============================================
# Email Configuration (Optional - for notifications)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@agrofreshgh.com

# ============================================
# CORS Configuration
# ============================================
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://agrofresh-theta.vercel.app
```

### Verify Backend .env

```bash
cd /workspaces/Agrofresh/backend

# Check if .env exists
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Check required variables
grep -q "SUPABASE_URL" .env && echo "✅ SUPABASE_URL set" || echo "❌ SUPABASE_URL missing"
grep -q "SUPABASE_SERVICE_ROLE_KEY" .env && echo "✅ SUPABASE_SERVICE_ROLE_KEY set" || echo "❌ SUPABASE_SERVICE_ROLE_KEY missing"
grep -q "ML_SERVICE_URL" .env && echo "✅ ML_SERVICE_URL set" || echo "❌ ML_SERVICE_URL missing"
```

---

## Part 2: Frontend React Environment

### Create .env file

**File:** `/workspaces/Agrofresh/.env` (root level)

```env
# ============================================
# API Configuration
# ============================================
VITE_API_URL=http://localhost:4000
VITE_API_TIMEOUT=30000

# ============================================
# Environment
# ============================================
VITE_ENV=development

# ============================================
# Application Info
# ============================================
VITE_APP_NAME=AgroFresh GH Market
VITE_APP_VERSION=1.0.0
```

### Build Configuration

**File:** `vite.config.ts` - Already configured, no changes needed

---

## Part 3: Python ML Service Environment

### Create .env file

**File:** `backend-ml/.env`

```env
# ============================================
# ML Service Configuration
# ============================================
ML_PORT=8001
ML_HOST=0.0.0.0
ML_DEBUG=True
ML_WORKERS=4

# ============================================
# Supabase Configuration
# ============================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct PostgreSQL Connection (optional, for testing)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# ============================================
# Model Configuration
# ============================================
YOLOV5_MODEL=yolov5s
IMAGE_MAX_SIZE_MB=5
BATCH_SIZE=4
CONFIDENCE_THRESHOLD=0.6

# ============================================
# API Configuration
# ============================================
API_RATE_LIMIT=100
CORS_ORIGINS=http://localhost:4000,http://localhost:5173,https://agrofresh-theta.vercel.app

# ============================================
# Cache Configuration
# ============================================
CACHE_TTL_SECONDS=3600
ENABLE_CACHE=True

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=INFO
LOG_FILE=logs/ml_service.log
```

### Verify ML Service .env

```bash
cd /workspaces/Agrofresh/backend-ml

# Check if .env exists
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# Check required variables
grep -q "SUPABASE_URL" .env && echo "✅ SUPABASE_URL set" || echo "❌ SUPABASE_URL missing"
grep -q "SUPABASE_SERVICE_ROLE_KEY" .env && echo "✅ SUPABASE_SERVICE_ROLE_KEY set" || echo "❌ SUPABASE_SERVICE_ROLE_KEY missing"
```

---

## Part 4: Getting Supabase Credentials

### Step 1: Log into Supabase

1. Go to [supabase.com](https://supabase.com)
2. Sign in with your account
3. Select your project

### Step 2: Find API Keys

1. In left sidebar, click **Settings** → **API**
2. You'll see:
   - **Project URL** → Copy this for `SUPABASE_URL`
   - **anon public** → Copy for `SUPABASE_ANON_KEY`
   - **service_role secret** → Copy for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Step 3: Get Database Connection URL

1. Go to **Settings** → **Database**
2. Under "Connection pooling", copy the connection string
3. Replace `[your-password]` with actual database password (from same page)
4. Use for `DATABASE_URL`

---

## Part 5: Production Environment Variables

### Backend Production (.env.production)

```env
# Server
PORT=4000
NODE_ENV=production
SESSION_SECRET=generate-strong-32-char-random-string-here

# Database
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_ANON_KEY=prod-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key-here
DATABASE_URL=postgresql://prod-connection-string

# Frontend
FRONTEND_URL=https://agrofresh-theta.vercel.app

# ML Service
ML_SERVICE_URL=https://ml-api.agrofreshgh.com
ML_SERVICE_TIMEOUT=30000

# Payment
PAYSTACK_PUBLIC_KEY=pk_live_production_key
PAYSTACK_SECRET_KEY=sk_live_production_key

# Delivery
SENDSTACK_API_KEY=production_key
SENDSTACK_APP_ID=prod_app_id
SENDSTACK_APP_SECRET=prod_app_secret

# Logging
LOG_LEVEL=error
LOG_FILE=/var/log/agrofresh/app.log

# CORS
CORS_ORIGINS=https://agrofresh-theta.vercel.app
```

### ML Service Production (.env.production)

```env
# Service
ML_PORT=8001
ML_HOST=0.0.0.0
ML_DEBUG=False
ML_WORKERS=4

# Supabase (same as backend)
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod-service-role-key
SUPABASE_ANON_KEY=prod-anon-key

# Models
YOLOV5_MODEL=yolov5s
IMAGE_MAX_SIZE_MB=5
BATCH_SIZE=4

# API
API_RATE_LIMIT=100
CORS_ORIGINS=https://agrofresh-theta.vercel.app

# Cache
ENABLE_CACHE=True
CACHE_TTL_SECONDS=3600

# Logging
LOG_LEVEL=WARNING
LOG_FILE=/var/log/agrofresh/ml_service.log
```

---

## Part 6: Environment Validation Script

Create `validate-env.sh`:

```bash
#!/bin/bash

echo "🔍 Checking Environment Configuration..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend checks
echo -e "\n${YELLOW}Backend (.env):${NC}"
BACKEND_ENV="/workspaces/Agrofresh/backend/.env"

check_var() {
  local file=$1
  local var=$2
  if grep -q "^$var=" "$file" 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $var"
  else
    echo -e "${RED}❌${NC} $var missing"
  fi
}

if [ -f "$BACKEND_ENV" ]; then
  check_var "$BACKEND_ENV" "SUPABASE_URL"
  check_var "$BACKEND_ENV" "SUPABASE_SERVICE_ROLE_KEY"
  check_var "$BACKEND_ENV" "ML_SERVICE_URL"
  check_var "$BACKEND_ENV" "FRONTEND_URL"
else
  echo -e "${RED}❌ backend/.env not found${NC}"
fi

# ML Service checks
echo -e "\n${YELLOW}ML Service (.env):${NC}"
ML_ENV="/workspaces/Agrofresh/backend-ml/.env"

if [ -f "$ML_ENV" ]; then
  check_var "$ML_ENV" "SUPABASE_URL"
  check_var "$ML_ENV" "SUPABASE_SERVICE_ROLE_KEY"
  check_var "$ML_ENV" "ML_PORT"
else
  echo -e "${RED}❌ backend-ml/.env not found${NC}"
fi

# Frontend checks
echo -e "\n${YELLOW}Frontend (.env):${NC}"
FRONTEND_ENV="/workspaces/Agrofresh/.env"

if [ -f "$FRONTEND_ENV" ]; then
  check_var "$FRONTEND_ENV" "VITE_API_URL"
else
  echo -e "${YELLOW}⚠️${NC}  Frontend .env optional (can use defaults)"
fi

echo -e "\n${GREEN}✅ Environment validation complete!${NC}"
```

Run it:

```bash
bash validate-env.sh
```

---

## Part 7: Local Development Setup Script

Create `setup-local-dev.sh`:

```bash
#!/bin/bash

echo "🚀 Setting up AgroFresh Development Environment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Backend Setup
echo -e "\n${BLUE}1. Setting up Backend...${NC}"
cd /workspaces/Agrofresh/backend
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"

# 2. Frontend Setup
echo -e "\n${BLUE}2. Setting up Frontend...${NC}"
cd /workspaces/Agrofresh
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

# 3. ML Service Setup
echo -e "\n${BLUE}3. Setting up ML Service...${NC}"
cd /workspaces/Agrofresh/backend-ml

# Create venv if not exists
if [ ! -d "venv" ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✅ ML Service dependencies installed${NC}"

# 4. Database Setup
echo -e "\n${BLUE}4. Running Database Migrations...${NC}"
echo "📝 Please execute DATABASE_MIGRATIONS.sql in Supabase SQL Editor"
echo "   Location: DATABASE_MIGRATIONS.sql"

# 5. Validation
echo -e "\n${BLUE}5. Validating Environments...${NC}"
cd /workspaces/Agrofresh
bash validate-env.sh

echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo -e "\n${BLUE}To start development:${NC}"
echo "  Terminal 1 (Frontend): cd /workspaces/Agrofresh && npm run dev"
echo "  Terminal 2 (Backend):  cd /workspaces/Agrofresh/backend && npm run dev"
echo "  Terminal 3 (ML):       cd /workspaces/Agrofresh/backend-ml && source venv/bin/activate && python app.py"
```

Run it:

```bash
bash setup-local-dev.sh
```

---

## Part 8: Docker Configuration (Optional)

### Backend Dockerfile

**File:** `backend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
```

### ML Service Dockerfile

**File:** `backend-ml/Dockerfile`

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=development
      - PORT=4000
    env_file:
      - ./backend/.env
    depends_on:
      - ml-service

  ml-service:
    build: ./backend-ml
    ports:
      - "8001:8001"
    environment:
      - ML_PORT=8001
    env_file:
      - ./backend-ml/.env
    volumes:
      - ./backend-ml/logs:/app/logs

  frontend:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:4000
    command: npm run dev

volumes:
  postgres_data:
```

Run with Docker:

```bash
docker-compose up -d
```

---

## Part 9: Troubleshooting

### Issue: Cannot connect to Supabase

**Solution:**
1. Verify `SUPABASE_URL` format: `https://xxxxx.supabase.co`
2. Check `SUPABASE_SERVICE_ROLE_KEY` is correct (not anon key)
3. Verify network connectivity: `curl https://your-project.supabase.co`
4. Check Supabase project is running (check dashboard)

### Issue: ML service won't start

**Solution:**
1. Check Python version: `python --version` → should be 3.10+
2. Verify venv activated: `which python` → should show venv path
3. Check dependencies: `pip list | grep fastapi`
4. Test imports: `python -c "import fastapi; import torch; print('OK')"`

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 4000
lsof -i :4000

# Kill process (replace PID)
kill -9 <PID>

# Alternative ML service port (if 8001 taken):
ML_PORT=8002 python app.py
```

### Issue: File permissions (.env)

**Solution:**
```bash
# Make sure .env is readable
chmod 600 backend/.env
chmod 600 backend-ml/.env

# Verify
ls -la backend/.env
```

---

## Part 10: Quick Reference

### Start All Services (Manual)

```bash
# Terminal 1: Frontend
cd /workspaces/Agrofresh
npm run dev

# Terminal 2: Backend
cd /workspaces/Agrofresh/backend
npm run dev

# Terminal 3: ML Service
cd /workspaces/Agrofresh/backend-ml
source venv/bin/activate
python app.py
```

### Start All Services (Docker)

```bash
cd /workspaces/Agrofresh
docker-compose up -d
```

### Check Service Health

```bash
# Frontend
curl http://localhost:5173

# Backend
curl http://localhost:4000/api/health

# ML Service
curl http://localhost:8001/api/health
```

### View Logs

```bash
# Backend
tail -f backend/logs/app.log

# ML Service
tail -f backend-ml/logs/ml_service.log
```

---

**Status:** Ready for Development ✅
