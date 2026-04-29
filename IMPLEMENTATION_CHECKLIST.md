# AgroFresh AI/ML Implementation Checklist

**Use this checklist to track progress through all development phases**

Last Updated: April 29, 2026  
Target Completion: June 2026 (8 weeks)

---

## PHASE 1: Database & Schema (Week 1)

### Database Setup
- [ ] Create Supabase account (if not exists)
- [ ] Copy `DATABASE_MIGRATIONS.sql` content
- [ ] Open Supabase SQL Editor
- [ ] Paste and execute all SQL commands
- [ ] Verify tables created:
  - [ ] `crop_types` - populated with 20 crops
  - [ ] `ai_predictions` - empty, ready for data
  - [ ] `image_analysis` - empty, ready for data
  - [ ] `market_forecasts` - empty, ready for data
  - [ ] `prediction_history` - empty (for tracking)
  - [ ] `ml_metrics` - empty (for evaluation)
- [ ] Verify views created:
  - [ ] `v_crop_latest_predictions`
  - [ ] `v_crops_needing_predictions`
  - [ ] `v_market_insights`
- [ ] Verify indexes created (check query performance)
- [ ] Test RLS policies (Row Level Security)

### Schema Updates to Crops Table
- [ ] `crop_type_id` - FOREIGN KEY to crop_types
- [ ] `planting_date` - DATE column
- [ ] `harvest_date_predicted` - DATE column
- [ ] `quality_score` - FLOAT column
- [ ] `freshness_status` - VARCHAR column
- [ ] `storage_temperature` - INT column
- [ ] `storage_humidity` - INT column
- [ ] `predicted_expiry` - DATE column
- [ ] `last_prediction_run` - TIMESTAMP column

### Verification
- [ ] Can insert test data into `crop_types`
- [ ] Can retrieve crop_types via supabase client
- [ ] Can query views without errors
- [ ] Indexes are working (check query plans)

**Status:** _____ | **Owner:** Backend | **Due:** Day 7

---

## PHASE 2: Python ML Service Setup (Week 2)

### Directory Structure
- [ ] Create `/workspaces/Agrofresh/backend-ml/` directory
- [ ] Create subdirectories:
  - [ ] `backend-ml/models/`
  - [ ] `backend-ml/routes/`
  - [ ] `backend-ml/services/`
  - [ ] `backend-ml/utils/`
  - [ ] `backend-ml/tests/`
  - [ ] `backend-ml/data/`
  - [ ] `backend-ml/logs/`
- [ ] Create `__init__.py` in each package

### Virtual Environment
- [ ] Create Python 3.10+ venv: `python3 -m venv backend-ml/venv`
- [ ] Activate venv: `source backend-ml/venv/bin/activate`
- [ ] Verify Python version: `python --version` → 3.10+
- [ ] Verify pip is working: `pip --version`

### Dependencies
- [ ] Create `backend-ml/requirements.txt` (from template)
- [ ] Install all deps: `pip install -r backend-ml/requirements.txt`
- [ ] Verify critical imports:
  - [ ] `import fastapi` → No error
  - [ ] `import torch` → No error
  - [ ] `import yolov5` → No error (may download model)
  - [ ] `import supabase` → No error

### Configuration Files
- [ ] Create `backend-ml/.env.example` (from template)
- [ ] Copy to `.env`: `cp .env.example .env`
- [ ] Edit `.env` with actual values:
  - [ ] `SUPABASE_URL=` (from Supabase dashboard)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY=` (from Supabase dashboard)
  - [ ] `ML_PORT=8001`
  - [ ] `ML_DEBUG=True` (for development)

### Core Application Files
- [ ] Create `backend-ml/app.py` (from template)
- [ ] Create `backend-ml/config.py` (from template)
- [ ] Create `backend-ml/.gitignore` (ignore venv, .env, logs)
- [ ] Create `backend-ml/README.md` with local setup instructions

### Utility Modules
- [ ] Create `backend-ml/utils/logger.py` (from template)
- [ ] Create `backend-ml/utils/validators.py` (input validation)
- [ ] Create `backend-ml/utils/exceptions.py` (custom exceptions)

### Health Check Endpoint
- [ ] Create `backend-ml/routes/health.py` (from template)
- [ ] Test endpoint: `curl http://localhost:8001/api/health`
- [ ] Response should include status 'ok'

### Verification
- [ ] App starts without errors: `python app.py`
- [ ] Health endpoint responds
- [ ] No startup warnings (except optional ones)
- [ ] Logs show "✅ startup"

**Status:** _____ | **Owner:** ML Engineer | **Due:** Day 14

---

## PHASE 3: ML Model Implementation (Weeks 3-4)

### YOLOv5 Quality Model
- [ ] Create `backend-ml/models/quality_model.py` (from template)
- [ ] Define defect classes and penalty mappings
- [ ] Test YOLOv5 model downloads
- [ ] Implement `score_image()` method
- [ ] Implement color analysis (`analyze_color()`)
- [ ] Implement freshness estimation (`analyze_freshness()`)
- [ ] Test with sample images:
  - [ ] Test with good quality image → score 80+
  - [ ] Test with defective image → score < 60
  - [ ] Test with high saturation image → "fresh"
- [ ] Verify model_version output

### Harvest Timing Predictor
- [ ] Create `backend-ml/models/harvest_predictor.py` (from template)
- [ ] Define crop harvest day ranges (min, typical, max)
- [ ] Add 20+ Ghana crops to CROP_DATA
- [ ] Implement regional adjustments by climate
- [ ] Test predictions:
  - [ ] Tomato planted Mar 15 → ~May 24 (±5 days)
  - [ ] Yam planted Jan 1 → ~Jun 20 (±7 days)
  - [ ] Different regions show different dates
- [ ] Verify confidence scores (0.6-0.95)

### Freshness Duration Calculator
- [ ] Create `backend-ml/models/freshness_calculator.py` (from template)
- [ ] Define freshness reference data (refrigerated vs room temp)
- [ ] Implement humidity adjustment logic
- [ ] Implement degradation curves
- [ ] Test calculations:
  - [ ] Tomato refrigerated → 10 days
  - [ ] Lettuce room temp → 2-3 days
  - [ ] Yam cool storage → 30+ days
- [ ] Verify degradation curve generation

### Price Forecaster
- [ ] Create `backend-ml/models/price_forecaster.py` (from template)
- [ ] Define base prices by crop and region
- [ ] Define demand multipliers (simple heuristics)
- [ ] Implement quality adjustment factor
- [ ] Implement demand adjustment factor
- [ ] Test forecasts:
  - [ ] High quality → price ↑
  - [ ] High demand region → price ↑
  - [ ] Low demand → price ↓
- [ ] Verify trend detection (rising/stable/falling)

### Model Testing
- [ ] Unit test each model in isolation
- [ ] Verify error handling for bad inputs
- [ ] Check for memory leaks (optional but recommended)
- [ ] Performance test each model:
  - [ ] Image analysis < 3 sec
  - [ ] Harvest prediction < 500ms
  - [ ] Freshness calc < 500ms
  - [ ] Price forecast < 500ms

**Status:** _____ | **Owner:** ML Engineer | **Due:** Day 28

---

## PHASE 4: API Routes & Integration (Week 5)

### FastAPI Routes
- [ ] Create `backend-ml/routes/predictions.py` (from template)
- [ ] Implement POST `/api/ml/analyze-quality` endpoint
- [ ] Implement POST `/api/ml/predict-harvest` endpoint
- [ ] Implement POST `/api/ml/predict-freshness` endpoint
- [ ] Implement POST `/api/ml/forecast-price` endpoint
- [ ] Implement GET `/api/ml/crop-types` endpoint
- [ ] Add error handling to all endpoints
- [ ] Add logging to all endpoints

### Supabase Service Integration
- [ ] Create `backend-ml/services/supabase_service.py`
- [ ] Implement insert predictions method
- [ ] Implement insert analysis method
- [ ] Implement fetch methods for lookups
- [ ] Test database operations
- [ ] Verify data persists correctly

### Node.js Express Integration
- [ ] Create `backend/services/mlService.js` (from integration guide)
- [ ] Install axios if needed: `npm install axios`
- [ ] Implement health check method
- [ ] Implement quality analysis method
- [ ] Implement harvest prediction method
- [ ] Implement freshness prediction method
- [ ] Implement price forecast method
- [ ] Test Express → ML service calls
- [ ] Verify Supabase data storage from Express

### ML Service to Express
- [ ] Update `backend/routes/crops.js`:
  - [ ] POST `/api/crops/:id/analyze-quality`
  - [ ] POST `/api/crops/:id/predict-harvest`
  - [ ] POST `/api/crops/:id/predict-freshness`
  - [ ] POST `/api/crops/:id/forecast-price`
  - [ ] GET `/api/crops/:id/predictions`
- [ ] Add authentication checks
- [ ] Add error responses
- [ ] Test all endpoints

### Environment Configuration
- [ ] Add to `backend/.env`:
  - [ ] `ML_SERVICE_URL=http://localhost:8001`
  - [ ] `ML_SERVICE_TIMEOUT=30000`
- [ ] Add to `backend-ml/.env`:
  - [ ] All SUPABASE variables
  - [ ] All ML config variables

### Testing
- [ ] Start both services (ML on port 8001, Express on port 4000)
- [ ] Test ML service health: `curl http://localhost:8001/api/health`
- [ ] Test Express health: `curl http://localhost:4000/api/health`
- [ ] Upload test image → quality analysis
- [ ] Prediction request → data stored in Supabase
- [ ] Verify predictions retrievable via Express API

**Status:** _____ | **Owner:** Backend | **Due:** Day 35

---

## PHASE 5: Frontend Integration (Weeks 6-7)

### API Client Updates
- [ ] Update `src/api.js`:
  - [ ] `getPredictions(cropId)`
  - [ ] `analyzeQuality(cropId, imageFile)`
  - [ ] `runFullPredictions(cropId)`
  - [ ] `predictHarvest(cropType, plantingDate)`
  - [ ] `forecastPrice(cropType, region, price)`

### Farmer Dashboard
- [ ] Update `src/pages/Farmers.tsx`:
  - [ ] Display harvest predictions
  - [ ] Show predicted expiry dates
  - [ ] Display quality scores
  - [ ] Show price recommendations
- [ ] Add prediction refresh button
- [ ] Add loading states
- [ ] Add error handling

### Product Listing Display
- [ ] Update `src/components/ProductCard.tsx`:
  - [ ] Display quality score badge
  - [ ] Display freshness status
  - [ ] Show market price vs recommended price
  - [ ] Add freshness indicator icon

### Admin Crops Page
- [ ] Update `src/pages/admin/Crops.tsx`:
  - [ ] Show quality metrics
  - [ ] Show prediction status
  - [ ] Display prediction timestamps
  - [ ] Add "Run Predictions" button

### Crop Edit Form
- [ ] Add "planting_date" input
- [ ] Add "crop_type_id" selector
- [ ] Add "storage_temperature" input
- [ ] Add "storage_humidity" input
- [ ] Show predicted harvest on form
- [ ] Show predicted expiry on form

### Market Insights Page (NEW)
- [ ] Create `src/pages/MarketInsights.tsx`
- [ ] Display regional market forecasts
- [ ] Show supply/demand charts
- [ ] Show price trends by crop
- [ ] Display premium/discount opportunities

### Buyer Product Search
- [ ] Add quality score filter
- [ ] Add freshness status filter
- [ ] Sort by quality score
- [ ] Highlight best deals (price vs quality)

### Testing
- [ ] All predictions display without errors
- [ ] Loading states appear during requests
- [ ] Error messages display if ML service down
- [ ] Predictions update on manual refresh
- [ ] Mobile responsive design works

**Status:** _____ | **Owner:** Frontend | **Due:** Day 42

---

## PHASE 6: Testing & Optimization (Week 8)

### Unit Tests
- [ ] Test `quality_model.py`:
  - [ ] Test score_image() with various inputs
  - [ ] Verify score range (0-100)
  - [ ] Check defect detection accuracy
- [ ] Test `harvest_predictor.py`:
  - [ ] Verify date calculations
  - [ ] Check regional adjustments
  - [ ] Validate confidence scores
- [ ] Test `freshness_calculator.py`:
  - [ ] Verify expiry calculations
  - [ ] Check humidity adjustments
  - [ ] Validate degradation curves
- [ ] Test `price_forecaster.py`:
  - [ ] Verify price calculations
  - [ ] Check demand multipliers
  - [ ] Validate trend detection

### Integration Tests
- [ ] Test Express → ML service calls
- [ ] Test ML → Supabase storage
- [ ] Test Express → Supabase retrieval
- [ ] Test API error responses
- [ ] Test rate limiting

### Performance Tests
- [ ] Benchmark image analysis: measure time
- [ ] Benchmark predict-harvest: measure time
- [ ] Benchmark predict-freshness: measure time
- [ ] Benchmark forecast-price: measure time
- [ ] Verify all < 3 seconds
- [ ] Load test with 100 concurrent requests
- [ ] Memory profiling (check for leaks)

### Data Quality Validation
- [ ] Compare predictions with actual outcomes (if available)
- [ ] Calculate accuracy metrics (MAE, RMSE)
- [ ] Verify confidence scores are calibrated
- [ ] Identify model biases

### Frontend QA
- [ ] Test on mobile devices
- [ ] Test on Safari, Chrome, Firefox
- [ ] Test with slow network (throttle to 3G)
- [ ] Test accessibility (keyboard nav, screen readers)

### Documentation
- [ ] Update README with setup instructions
- [ ] Document all API endpoints
- [ ] Create troubleshooting guide
- [ ] Add examples for each model

**Status:** _____ | **Owner:** QA | **Due:** Day 50

---

## PHASE 7: Monitoring & Refinement (Weeks 5-8, ongoing)

### Logging & Monitoring
- [ ] Set up structured logging
- [ ] Create monitoring dashboard (optional)
- [ ] Track prediction accuracy over time
- [ ] Monitor API response times
- [ ] Track prediction usage patterns

### Model Feedback Loop
- [ ] Collect actual harvest dates vs predictions
- [ ] Collect actual expiry dates vs predictions
- [ ] Collect actual market prices vs forecasts
- [ ] Retrain models if accuracy drops

### Performance Optimization
- [ ] Cache predictions (TTL: 24 hours)
- [ ] Batch process images if needed
- [ ] Optimize database queries
- [ ] Consider GPU if on high-volume system

### User Feedback
- [ ] Collect farmer feedback on recommendations
- [ ] Survey accuracy perceptions
- [ ] Track adoption rates
- [ ] Adjust models based on feedback

---

## Blockers & Risks

### High-Risk Items
- [ ] YOLOv5 doesn't generalize to Ghana produce
  - **Mitigation:** Test on real farm images early
- [ ] Supabase performance issues at scale
  - **Mitigation:** Add caching layer, optimize queries
- [ ] ML service crashes under load
  - **Mitigation:** Implement circuit breaker, async queueing

### Medium-Risk Items
- [ ] Feature creep (new models requested)
  - **Mitigation:** Strict scope, schedule for Phase 7+
- [ ] Integration takes longer than expected
  - **Mitigation:** Start integration early (Week 3)

### Blockers (Document here as they arise)
- [x] Item 1: Status
- [ ] Item 2: Status

---

## Success Metrics

### Quantitative
- [ ] YOLOv5 accuracy ≥ 85%
- [ ] Harvest prediction MAE ≤ ±5 days
- [ ] Freshness prediction MAE ≤ ±2 days
- [ ] Price forecast RMSE < 10%
- [ ] API latency < 3 seconds
- [ ] System uptime ≥ 99.5%
- [ ] 90%+ test passing

### Qualitative
- [ ] Farmers report better pricing decisions
- [ ] Buyers feel confident in quality
- [ ] Platform differentiation vs competitors
- [ ] Code is maintainable & documented

---

## Sign-Off

| Role | Name | Date | Sign |
|------|------|------|------|
| Project Lead | _____ | _____ | _____ |
| Backend Lead | _____ | _____ | _____ |
| ML Engineer | _____ | _____ | _____ |
| Frontend Lead | _____ | _____ | _____ |
| QA Lead | _____ | _____ | _____ |

---

## Notes & Comments

```
[Use this space for ongoing notes, decisions, and updates]

Week 1: Database migration completed successfully
Week 2: ...
```

---

**Print or share this checklist with your team.**  
**Update status regularly (weekly).**  
**Reference:** See DEVELOPMENT_ROADMAP.md for timeline
