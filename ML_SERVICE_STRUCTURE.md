# ML Service Structure & Setup Guide

## Directory Structure

Create this folder structure in your workspace:

```
/workspaces/Agrofresh/backend-ml/
├── README.md                      # ML service documentation
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment template
├── .env                           # (gitignored) Local env
├── .gitignore                     # Git ignore rules
│
├── app.py                         # FastAPI main application
├── config.py                      # Configuration management
│
├── models/                        # ML models & logic
│   ├── __init__.py
│   ├── quality_model.py           # YOLOv5 quality scoring
│   ├── harvest_predictor.py       # Harvest timing
│   ├── freshness_calculator.py    # Freshness duration
│   └── price_forecaster.py        # Price recommendations
│
├── routes/                        # FastAPI routes
│   ├── __init__.py
│   ├── predictions.py             # /api/ml/... endpoints
│   └── health.py                  # /api/health endpoint
│
├── services/                      # Business logic
│   ├── __init__.py
│   ├── supabase_service.py        # Database operations
│   ├── image_service.py           # Image processing
│   └── cache_service.py           # Caching layer
│
├── utils/                         # Utilities
│   ├── __init__.py
│   ├── logger.py                  # Logging setup
│   ├── validators.py              # Input validation
│   └── exceptions.py              # Custom exceptions
│
├── tests/                         # Test suite
│   ├── __init__.py
│   ├── test_quality_model.py
│   ├── test_predictors.py
│   └── test_integration.py
│
├── data/                          # Data files
│   ├── crop_types.json
│   ├── harvest_days.json
│   └── freshness_reference.json
│
├── logs/                          # Application logs
│   └── .gitkeep
│
└── venv/                          # Virtual environment (gitignored)
    └── .gitkeep
```

---

## Step-by-Step Setup

### 1. Create Directory Structure

```bash
cd /workspaces/Agrofresh
mkdir -p backend-ml/{models,routes,services,utils,tests,data,logs}
cd backend-ml

# Create __init__.py files
touch models/__init__.py
touch routes/__init__.py
touch services/__init__.py
touch utils/__init__.py
touch tests/__init__.py
```

### 2. Create Virtual Environment

```bash
cd /workspaces/Agrofresh/backend-ml

# Create and activate venv
python3 -m venv venv
source venv/bin/activate

# On Windows:
# venv\Scripts\activate

# Verify Python version (should be 3.10+)
python --version
```

### 3. Create requirements.txt

```bash
# Create the file - see ML_REQUIREMENTS_PIP.md for full content
cd /workspaces/Agrofresh/backend-ml
cat > requirements.txt << 'EOF'
# Web Framework
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.4.2
python-multipart==0.0.6

# ML & Computer Vision
torch==2.0.1
torchvision==0.15.1
yolov5==7.0.13
opencv-python==4.8.1.78
Pillow==10.0.0

# Data Processing
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0

# Database
supabase==2.0.0
postgrest-py==0.13.0

# Environment & Config
python-dotenv==1.0.0
pydantic-settings==2.0.3

# Utilities
requests==2.31.0

# Development (optional)
pytest==7.4.0
pytest-asyncio==0.21.0
black==23.10.0
flake8==6.1.0
EOF

# Install dependencies
pip install -r requirements.txt
```

### 4. Create .env Files

```bash
# Create example .env file
cat > .env.example << 'EOF'
# ML Service Configuration
ML_PORT=8001
ML_HOST=0.0.0.0
ML_DEBUG=True
ML_WORKERS=4

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# Model Configuration
YOLOV5_MODEL=yolov5s
IMAGE_MAX_SIZE_MB=5
BATCH_SIZE=4

# API Configuration
API_RATE_LIMIT=100
CORS_ORIGINS=http://localhost:4000,http://localhost:5173,https://agrofresh-theta.vercel.app

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/ml_service.log

# Cache Configuration
CACHE_TTL_SECONDS=3600
ENABLE_CACHE=True

# Prediction Configuration
CONFIDENCE_THRESHOLD=0.6
EOF

# Copy template to .env (you'll edit this)
cp .env.example .env
```

### 5. Create app.py

```bash
cat > app.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from routes import predictions, health
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Setup logger
logger = setup_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AgroFresh ML Service",
    description="AI-powered agricultural predictions",
    version="1.0.0"
)

# CORS Middleware
origins = os.getenv('CORS_ORIGINS', 'http://localhost:4000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(predictions.router, prefix="/api/ml", tags=["predictions"])

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 ML Service starting up...")
    # Initialize models, connection pools, etc.

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 ML Service shutting down...")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('ML_PORT', 8001))
    debug = os.getenv('ML_DEBUG', 'False') == 'True'
    
    uvicorn.run(
        "app:app",
        host=os.getenv('ML_HOST', '0.0.0.0'),
        port=port,
        reload=debug,
        workers=1 if debug else int(os.getenv('ML_WORKERS', 4))
    )
EOF
```

### 6. Create config.py

```bash
cat > config.py << 'EOF'
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Service
    ml_port: int = int(os.getenv('ML_PORT', 8001))
    ml_host: str = os.getenv('ML_HOST', '0.0.0.0')
    debug: bool = os.getenv('ML_DEBUG', 'False') == 'True'
    
    # Supabase
    supabase_url: str = os.getenv('SUPABASE_URL', '')
    supabase_key: str = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    
    # Models
    yolov5_model: str = os.getenv('YOLOV5_MODEL', 'yolov5s')
    image_max_size_mb: int = int(os.getenv('IMAGE_MAX_SIZE_MB', 5))
    
    # API
    api_rate_limit: int = int(os.getenv('API_RATE_LIMIT', 100))
    cors_origins: list = os.getenv('CORS_ORIGINS', 'http://localhost:4000').split(',')
    
    # Logging
    log_level: str = os.getenv('LOG_LEVEL', 'INFO')
    log_file: str = os.getenv('LOG_FILE', 'logs/ml_service.log')
    
    # Cache
    cache_ttl_seconds: int = int(os.getenv('CACHE_TTL_SECONDS', 3600))
    enable_cache: bool = os.getenv('ENABLE_CACHE', 'True') == 'True'
    
    class Config:
        env_file = '.env'

settings = Settings()
EOF
```

### 7. Create utils/logger.py

```bash
cat > utils/logger.py << 'EOF'
import logging
import json
from datetime import datetime
from config import settings

def setup_logger(name):
    """Setup structured logging"""
    logger = logging.getLogger(name)
    logger.setLevel(settings.log_level)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(console_handler)
    
    # File handler
    file_handler = logging.FileHandler(settings.log_file)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(file_handler)
    
    return logger
EOF
```

### 8. Create routes/health.py

```bash
cat > routes/health.py << 'EOF'
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "AgroFresh ML Service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@router.get("/health/detailed")
async def detailed_health():
    """Detailed health check with component status"""
    return {
        "status": "ok",
        "components": {
            "api": "operational",
            "models": "loaded",
            "database": "connected",
            "cache": "operational"
        }
    }
EOF
```

### 9. Create .gitignore

```bash
cat > .gitignore << 'EOF'
# Environment
.env
.env.local
.env.*.local

# Virtual environment
venv/
env/
ENV/
__pycache__/
*.py[cod]
*$py.class

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Logs
logs/
*.log

# Data files
*.pkl
*.h5
models/weights/
data/cache/

# OS
.DS_Store
Thumbs.db

# Tests
.pytest_cache/
.coverage
htmlcov/

# Build
dist/
build/
*.egg-info/
EOF
```

### 10. Test the Setup

```bash
# Activate venv
source venv/bin/activate

# Edit .env with your Supabase credentials
nano .env

# Test import
python -c "import fastapi; import torch; import yolov5; print('✅ All imports successful')"

# Test app startup (should run on port 8001)
python app.py

# In another terminal, test health endpoint
curl http://localhost:8001/api/health

# Should return:
# {"status":"ok","service":"AgroFresh ML Service","timestamp":"2026-04-29T...","version":"1.0.0"}
```

---

## Create Data Reference Files

### data/crop_types.json

```bash
cat > data/crop_types.json << 'EOF'
{
  "crops": [
    {
      "name": "tomato",
      "category": "vegetables",
      "days_to_harvest": 70,
      "freshness_days": 10,
      "emoji": "🍅"
    },
    {
      "name": "lettuce",
      "category": "vegetables",
      "days_to_harvest": 50,
      "freshness_days": 12,
      "emoji": "🥬"
    },
    {
      "name": "yam",
      "category": "roots",
      "days_to_harvest": 150,
      "freshness_days": 180,
      "emoji": "🍠"
    }
  ]
}
EOF
```

---

## Verification Checklist

After setup, verify:

- [ ] Virtual environment created and activated
- [ ] `python --version` shows 3.10+
- [ ] `pip list | grep fastapi` shows FastAPI installed
- [ ] `.env` file created with valid credentials
- [ ] `app.py` exists and is runnable
- [ ] `routes/`, `models/`, `services/`, `utils/` folders exist
- [ ] Health endpoint responds (after running app)
- [ ] No import errors in Python console
- [ ] Git properly ignores `.env` and `venv/`

---

## Next Steps

1. ✅ Complete this setup (you are here)
2. → Create model files (quality_model.py, etc.)
3. → Create route handlers (predictions.py)
4. → Implement services (supabase_service.py)
5. → Test each component
6. → Integrate with Node backend

---

## Troubleshooting

### Python version too old
```bash
# Install Python 3.10+ or use pyenv
pyenv install 3.10.13
pyenv local 3.10.13
```

### Torch/GPU issues
```bash
# CPU-only installation (faster for initial setup)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### YOLOv5 model download fails
```bash
# Download model manually
python -c "import yolov5; model = yolov5.load('yolov5s'); print('Done')"
# Model saves to ~/.cache/torch/hub/
```

### FastAPI won't start
```bash
# Check if port 8001 is in use
lsof -i :8001
# Kill if needed: kill -9 <PID>
```

---

**Status:** Ready for model implementation  
**Reference:** See ML_MODULE_TEMPLATES.md for code templates for each module
