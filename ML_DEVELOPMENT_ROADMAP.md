# AgroFresh ML Development Roadmap

## Project Overview
Transform AgroFresh from a basic marketplace into an *intelligent agricultural marketplace* with AI-driven features for harvest timing, freshness prediction, quality assessment, and price optimization.

---

## Vision Alignment

### Chapter 3 Requirements:
- ✅ Harvest timing prediction (crop-specific ML)
- ✅ Freshness duration forecasting
- ✅ Expiry period calculation
- ✅ Price forecasting (market demand analysis)
- ✅ YOLOv5 image quality assessment
- ✅ Matplotlib data visualization
- ✅ AI Predictions database entity

### Current Status Assessment:
| Component | Status | Coverage |
|-----------|--------|----------|
| Database (Supabase) | ✅ Active | 60% (missing AI tables) |
| Payment System | ✅ Complete | 100% |
| Delivery Integration | ✅ Complete | 100% |
| Authentication | ✅ Complete | 100% |
| Core CRUD (Crops, Orders) | ✅ Complete | 100% |
| **AI/ML Layer** | ❌ Missing | 0% |
| Image Quality Scoring | ❌ Missing | 0% |
| Predictive Models | ❌ Missing | 0% |
| Analytics Dashboard | ⚠️ Partial | 30% |

---

## Implementation Timeline

### Phase 1: Foundation & Database (Week 1-2)
**Goal:** Set up ML infrastructure and database

#### Tasks:
- [ ] Create Python virtual environment
- [ ] Set up FastAPI server structure
- [ ] Create database migration for AI tables
- [ ] Implement Supabase connection layer
- [ ] Add crop type reference data
- [ ] Create AI predictions table
- [ ] Set up image analysis storage

**Deliverables:**
- `backend-ml/` project folder
- Database migration scripts
- `.env` template for ML service
- Health check endpoint

**Estimated Effort:** 40-50 hours

---

### Phase 2: Image Quality & Computer Vision (Week 2-3)
**Goal:** Implement YOLOv5-based produce quality scoring

#### Tasks:
- [ ] Download and cache YOLOv5 model
- [ ] Implement image preprocessing pipeline
- [ ] Create defect detection logic
- [ ] Build quality scoring algorithm
- [ ] Implement color analysis
- [ ] Create image store/retrieval flow
- [ ] Add API endpoint for image analysis

**Deliverables:**
- `models/quality_model.py`
- Image analysis pipeline
- `/api/ml/analyze-quality` endpoint
- Quality metrics database storage

**Estimated Effort:** 60-80 hours

---

### Phase 3: Predictive Models (Week 3-4)
**Goal:** Build harvest timing, freshness, and expiry models

#### Tasks:
- [ ] Implement harvest timing predictor
- [ ] Create freshness duration calculator
- [ ] Build expiry date predictor
- [ ] Add environmental factor adjustments
- [ ] Implement confidence scoring
- [ ] Create API endpoints for each model
- [ ] Store predictions in database

**Deliverables:**
- `models/harvest_predictor.py`
- `models/freshness_calculator.py`
- `models/expiry_predictor.py`
- `/api/ml/predict-harvest` endpoint
- `/api/ml/predict-freshness` endpoint
- `/api/ml/predict-expiry` endpoint

**Estimated Effort:** 50-60 hours

---

### Phase 4: Price Forecasting (Week 4-5)
**Goal:** Implement market-aware price recommendations

#### Tasks:
- [ ] Create demand signal analyzer
- [ ] Implement historical price analysis
- [ ] Build seasonal adjustment logic
- [ ] Create price recommendation engine
- [ ] Add market region support
- [ ] Implement trend analysis
- [ ] Create `/api/ml/forecast-price` endpoint

**Deliverables:**
- `models/price_forecaster.py`
- Market forecast tables in DB
- `/api/ml/forecast-price` endpoint
- Price history tracking

**Estimated Effort:** 40-50 hours

---

### Phase 5: Node Backend Integration (Week 5)
**Goal:** Connect ML service to existing Express API

#### Tasks:
- [ ] Create ML service client in Node
- [ ] Add prediction calls to crop endpoints
- [ ] Implement batch prediction processing
- [ ] Add caching for predictions
- [ ] Create admin endpoints for model retraining
- [ ] Implement error handling & fallbacks
- [ ] Add rate limiting for ML endpoints

**Deliverables:**
- `backend/services/mlService.js`
- Updated crop routes with predictions
- Batch processing queue
- Prediction caching layer

**Estimated Effort:** 30-40 hours

---

### Phase 6: Frontend Display & UI (Week 6)
**Goal:** Visualize AI predictions for farmers and buyers

#### Tasks:
- [ ] Create prediction display components
- [ ] Add quality score visualization
- [ ] Implement harvest calendar
- [ ] Create price recommendation cards
- [ ] Build analytics dashboard
- [ ] Add matplotlib chart rendering
- [ ] Implement mobile-responsive design

**Deliverables:**
- Prediction components (React)
- Analytics dashboards
- Mobile views
- Data visualization components

**Estimated Effort:** 50-60 hours

---

### Phase 7: Testing & Optimization (Week 7)
**Goal:** Validate accuracy and optimize performance

#### Tasks:
- [ ] Unit test ML models
- [ ] Integration test endpoints
- [ ] Load testing for ML service
- [ ] Model accuracy benchmarking
- [ ] A/B test price recommendations
- [ ] Performance optimization
- [ ] Documentation finalization

**Deliverables:**
- Test suite with 80%+ coverage
- Performance benchmarks
- Optimization report
- Model accuracy metrics

**Estimated Effort:** 40-50 hours

---

## Technical Architecture

### Microservices Setup
```
AgroFresh System
├── Frontend (React + TypeScript)
│   └── Displays predictions, quality scores, recommendations
├── Node Backend (Express)
│   ├── REST API (user, crop, order, payment, delivery)
│   ├── ML Service Client
│   └── Prediction caching
├── ML Service (FastAPI + Python)
│   ├── Image quality analysis (YOLOv5)
│   ├── Harvest prediction
│   ├── Freshness calculation
│   ├── Price forecasting
│   └── Data analysis
└── Database (Supabase PostgreSQL)
    ├── Core tables (users, crops, orders, payments)
    ├── AI tables (predictions, image_analysis, market_forecasts)
    └── Analytics tables
```

### Data Flow for Crop Listing
```
Farmer uploads crop
  ↓
Image upload → ML Service (quality analysis)
  ↓
Quality score stored → Database
  ↓
Crop metadata → Predictive models
  ↓
Predictions generated → Database
  ↓
Frontend displays: Quality, Harvest date, Freshness, Price recommendation
  ↓
Buyer sees AI-enhanced listing
```

---

## Technology Stack

### Backend (Python ML Service)
- **Framework:** FastAPI 0.104+
- **Server:** Uvicorn
- **ML/CV:** PyTorch, YOLOv5, scikit-learn
- **Data:** NumPy, Pandas
- **Visualization:** Matplotlib
- **Database:** Supabase (via Python client)
- **Async:** asyncio, aiofiles

### Integration (Node Backend)
- **HTTP Client:** axios
- **Caching:** redis (optional)
- **Queuing:** bull (optional)

### Database Schema
- PostgreSQL (Supabase)
- 3 new tables for AI
- 5 new indexes for performance

---

## Key Metrics & Success Criteria

### Phase Completion Targets:
- Phase 1: Database ready for predictions (100% coverage)
- Phase 2: Quality scoring accuracy ≥ 85%
- Phase 3: Prediction confidence ≥ 70%
- Phase 4: Price forecast ±10% accuracy
- Phase 5: <500ms response time for predictions
- Phase 6: All features visible in UI
- Phase 7: Production-ready deployment

### Quality Benchmarks:
- API response time: <1 second
- ML model accuracy: 75%+ for all predictors
- Database query time: <100ms
- Error rate: <1%

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| YOLOv5 model too slow | Medium | High | Use model quantization, caching, async processing |
| Data quality issues | High | Medium | Implement data validation, fallback logic |
| ML-Node communication failure | Low | High | Add retry logic, fallback to basic predictions |
| Database migration errors | Medium | High | Test on staging first, rollback plan |
| Model accuracy issues | Medium | Medium | Start with simpler models, iterate |

---

## Deployment Strategy

### Development
- Python FastAPI on localhost:8001
- Node Express on localhost:4000
- Supabase local database

### Staging
- FastAPI on stage-ml.agrofresh.dev
- Express on stage-api.agrofresh.dev
- Staging Supabase project

### Production
- FastAPI on ml.agrofresh.dev (Docker container)
- Express on api.agrofresh.dev
- Production Supabase project with backups

---

## Team & Responsibilities

### ML Engineer
- Develop predictive models
- Optimize YOLOv5 pipeline
- Handle data science tasks

### Backend Engineer
- Integration with Node
- API design
- Database management

### Frontend Engineer
- Prediction UI components
- Visualization/charts
- Mobile optimization

### DevOps Engineer
- Docker containerization
- Deployment pipeline
- Monitoring & logging

---

## Next Steps
1. ✅ Read this roadmap
2. ⏭️ Set up backend-ml project structure
3. ⏭️ Create Python virtual environment
4. ⏭️ Run database migration
5. ⏭️ Start Phase 1 implementation

---

## References
- Chapter 3: DESIGN AND METHODOLOGY (docs/diagrams/chapter3_pages/)
- YOLOv5 Docs: https://github.com/ultralytics/yolov5
- FastAPI Docs: https://fastapi.tiangolo.com/
- Supabase Python: https://supabase.com/docs/reference/python/introduction

---

**Last Updated:** April 29, 2026
**Status:** Ready for Development
**Estimated Total Duration:** 7 weeks (with full team)
