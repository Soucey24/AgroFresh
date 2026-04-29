# AgroFresh AI/ML Development Roadmap

**Document Version:** 1.0  
**Last Updated:** April 29, 2026  
**Status:** Ready for Implementation  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision](#project-vision)
3. [Current State Analysis](#current-state-analysis)
4. [Target Architecture](#target-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Timeline & Milestones](#timeline--milestones)
7. [Success Metrics](#success-metrics)
8. [Risk Management](#risk-management)
9. [Resource Requirements](#resource-requirements)

---

## Executive Summary

AgroFresh is currently a **functional marketplace with 65% completion**. To achieve the Chapter 3 vision of "intelligent agricultural marketplace with AI-powered insights," we must add a **dedicated ML service** that provides:

- 🖼️ **Produce Quality Scoring** (YOLOv5 image analysis)
- 📅 **Harvest Timing Predictions** (crop & weather-based)
- 🍃 **Freshness Duration Forecasting** (storage & conditions)
- 💰 **Dynamic Price Recommendations** (demand-based)
- 📊 **Market Insights** (regional demand signals)

**Estimated Effort:** 6-8 weeks | **Team Size:** 1-2 developers + 1 ML engineer

---

## Project Vision

### What We're Building

An intelligent middle layer between the marketplace and farmers/buyers that:

1. **Analyzes product images** for quality & freshness
2. **Predicts optimal harvest times** based on crop type & planting date
3. **Calculates shelf life** based on storage conditions
4. **Recommends prices** based on regional demand
5. **Provides market intelligence** to help farmer pricing decisions

### Why It Matters

- **For Farmers:** Better pricing, harvest timing, reduced waste
- **For Buyers:** Quality assurance, freshness guarantees
- **For Platform:** Higher transaction values, better retention

---

## Current State Analysis

### ✅ What We Have

| Component | Status | Notes |
|-----------|--------|-------|
| React Frontend | ✅ Complete | All pages, dashboards, auth |
| Express Backend | ✅ Complete | All CRUD routes, payments, delivery |
| Supabase DB | ✅ Complete | PostgreSQL schema, sessions |
| Payments | ✅ Complete | Multiple methods, webhooks |
| Delivery | ✅ Complete | Sendstack integration |
| File Upload | ✅ Complete | Image storage, retrieval |

### ❌ What's Missing

| Component | Status | Impact |
|-----------|--------|--------|
| ML Service | 🔴 Missing | High - Core feature |
| AI Predictions DB | 🔴 Missing | High - Storage layer |
| Image Analysis | 🔴 Missing | High - Quality scoring |
| Harvest Predictor | 🔴 Missing | Medium - Farmer tool |
| Price Forecasting | 🔴 Missing | Medium - Smart pricing |
| Frontend ML Display | 🔴 Missing | Medium - User experience |

### Database Gaps

```
Crops table needs:
  ✅ crop_type_id (link to crop_types table)
  ✅ planting_date
  ✅ harvest_date_predicted
  ✅ quality_score
  ✅ freshness_status

Missing tables:
  ❌ crop_types (lookup table)
  ❌ ai_predictions (results storage)
  ❌ image_analysis (quality details)
  ❌ market_forecasts (price intel)
```

---

## Target Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  Dashboard | Farmers | Buyers | Admin Panel                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────────┐ ┌──▼──────────┐ ┌─▼────────────┐
│  Node Express  │ │ ML Service  │ │   Supabase   │
│  Backend       │ │  (FastAPI)  │ │ PostgreSQL   │
│  Port 4000     │ │  Port 8001  │ │ Database     │
└───────┬────────┘ └──┬──────────┘ └──▼───────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
            ┌──────────▼──────────┐
            │  Sendstack Delivery │
            │  Paystack Payments  │
            └─────────────────────┘
```

### Technology Stack

**Backend ML Service:**
- Framework: FastAPI (Python 3.10+)
- ML/Vision: YOLOv5, scikit-learn, pandas
- DB Client: Supabase Python SDK
- Server: Uvicorn
- Port: 8001

**Integration Points:**
- Node Express calls ML endpoints via axios
- ML service stores results in Supabase
- Frontend queries predictions from Express API

---

## Implementation Phases

### Phase 1: Database & Infrastructure (1-2 weeks)

**Deliverables:**
- ✅ New Supabase tables (crop_types, ai_predictions, image_analysis, market_forecasts)
- ✅ Updated crops table schema
- ✅ Database migration script
- ✅ Indexes for performance

**Files to Create:**
- `DATABASE_MIGRATIONS.sql`
- `database/schema-updates.sql`

**Success Criteria:**
- All tables created in Supabase
- Indexes performing well
- Data integrity constraints working

---

### Phase 2: Python ML Service Setup (1 week)

**Deliverables:**
- ✅ FastAPI project structure
- ✅ Environment configuration
- ✅ Health check endpoint
- ✅ CORS & middleware setup

**Files to Create:**
- `backend-ml/requirements.txt`
- `backend-ml/app.py`
- `backend-ml/.env.example`
- `backend-ml/utils/supabase_client.py`
- `backend-ml/config.py`

**Success Criteria:**
- ML service runs on port 8001
- `/api/health` endpoint responds
- Environment variables load correctly

---

### Phase 3: ML Model Implementation (2-3 weeks)

**Deliverables:**
- ✅ YOLOv5 quality scorer
- ✅ Harvest timing predictor
- ✅ Freshness calculator
- ✅ Price forecaster
- ✅ Endpoints for each model

**Files to Create:**
- `backend-ml/models/quality_model.py`
- `backend-ml/models/harvest_predictor.py`
- `backend-ml/models/freshness_calculator.py`
- `backend-ml/models/price_forecaster.py`
- `backend-ml/routes/predictions.py`

**Success Criteria:**
- Each endpoint returns valid predictions
- YOLOv5 model loads & processes images
- Database inserts work correctly

---

### Phase 4: Node Express Integration (1 week)

**Deliverables:**
- ✅ API calls to ML service
- ✅ Error handling & retry logic
- ✅ Caching layer for predictions
- ✅ New Express endpoints

**Files to Update:**
- `backend/routes/crops.js` - Add prediction endpoints
- `backend/controllers/cropController.js` - ML integration logic
- `backend/app.js` - Add ML service config

**Success Criteria:**
- Express can call ML service endpoints
- Predictions stored in Supabase
- Error fallbacks work

---

### Phase 5: Frontend Integration (1-2 weeks)

**Deliverables:**
- ✅ Farmer dashboard shows harvest predictions
- ✅ Product listings display quality scores
- ✅ Price recommendations in crop form
- ✅ Market insights on buyer pages

**Files to Update:**
- `src/pages/Farmers.tsx` - Show predictions
- `src/pages/admin/Crops.tsx` - Quality metrics
- `src/components/ProductCard.tsx` - Display scores
- `src/api.js` - New prediction endpoints

**Success Criteria:**
- Predictions render without errors
- UI is responsive & intuitive
- Data updates in real-time

---

### Phase 6: Testing & Optimization (1-2 weeks)

**Deliverables:**
- ✅ Unit tests for ML models
- ✅ Integration tests
- ✅ Performance benchmarks
- ✅ Model accuracy validation

**Files to Create:**
- `backend-ml/tests/test_quality_model.py`
- `backend-ml/tests/test_predictors.py`

**Success Criteria:**
- 90%+ model accuracy (on test data)
- API response times < 2 seconds
- No memory leaks

---

## Timeline & Milestones

| Week | Phase | Deliverables | Owner |
|------|-------|--------------|-------|
| 1 | Phase 1 | Database schema | Backend |
| 2 | Phase 2 | ML service setup | ML Engineer |
| 3-4 | Phase 3 | ML models | ML Engineer |
| 5 | Phase 4 | Node integration | Backend |
| 6-7 | Phase 5 | Frontend updates | Frontend |
| 8 | Phase 6 | Testing & tuning | QA |

**Total: 8 weeks | Can run phases 2-3 in parallel to compress to 6 weeks**

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| YOLOv5 accuracy | 85%+ defect detection | Week 4 |
| Harvest prediction MAE | ±5 days | Week 4 |
| Price forecast RMSE | <10% error | Week 4 |
| API latency | <2 sec per request | Week 5 |
| System availability | 99.5% uptime | Week 8 |

### Qualitative Metrics

- ✅ Farmers report better pricing decisions
- ✅ Buyers feel more confident in product quality
- ✅ Platform differentiation vs competitors
- ✅ Code is well-documented & maintainable

---

## Risk Management

### High-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| YOLOv5 doesn't generalize to Ghana produce | Medium | High | Test on real farm images early, fine-tune if needed |
| Supabase performance degrades | Low | High | Add caching layer, optimize queries |
| ML service crashes under load | Medium | High | Implement circuit breaker, async queueing |
| Weather data unreliable | Low | Medium | Use backup data sources, user input fallback |

### Medium-Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Feature creep (new models requested) | High | Medium | Strict scope, track as Phase 7 |
| Integration takes longer than expected | Medium | Medium | Start integration early (Week 3) |
| Frontend performance hits | Low | Medium | Lazy load predictions, memoize components |

### Mitigation Strategy

1. **Start with Phase 1 (DB)** - Unblocks parallel work
2. **Test ML models early** - Pick a crop type, test predictions with real data
3. **Build integration incrementally** - Wire up one model at a time
4. **Monitor performance** - Set up dashboards week 2

---

## Resource Requirements

### Team

- **1 Backend Engineer** (Node/Express experience)
- **1 ML Engineer** (Python, PyTorch/TensorFlow)
- **1 Frontend Engineer** (React experience)
- **0.5 DevOps** (Supabase, deployment)

### Infrastructure

- **Supabase** (PostgreSQL database)
- **Python 3.10+** (development)
- **ML GPU** (optional, for faster training if fine-tuning YOLOv5)
  - CPU-only works fine for inference
- **Storage** (for crop images, ~100GB for 1M images)

### Costs (Monthly)

| Service | Free Tier | Paid Tier | Notes |
|---------|-----------|-----------|-------|
| Supabase | ✅ Up to 500K queries | $25-100+ | Sufficient for MVP |
| Python ML | Free | N/A | No cost |
| Hosting (ML service) | Free (Railway/Render) | $10-50 | For production |
| GPU (optional) | N/A | $0.25-1/hr | Only if fine-tuning |

**Total MVP Cost: ~$35-40/month**

---

## Key Files to Reference During Development

```
📁 Documentation
├── DEVELOPMENT_ROADMAP.md (this file)
├── ML_REQUIREMENTS.md
├── ML_SERVICE_STRUCTURE.md
├── ENVIRONMENT_SETUP.md
├── ML_MODULE_TEMPLATES.md
├── ML_API_INTEGRATION_GUIDE.md
└── IMPLEMENTATION_CHECKLIST.md

📁 Database
├── DATABASE_MIGRATIONS.sql
└── database/schema-updates.sql

📁 Code Templates
├── backend-ml/requirements.txt
├── backend-ml/app.py (template)
├── backend-ml/config.py (template)
└── backend-ml/models/* (templates)
```

---

## Next Steps

1. **Immediate (Today):** Read all documentation files
2. **Day 1:** Set up development environment (Python venv)
3. **Day 1-2:** Create Supabase schema (Phase 1)
4. **Day 3-5:** Set up FastAPI project (Phase 2)
5. **Day 6+:** Implement ML models (Phase 3)

**See IMPLEMENTATION_CHECKLIST.md for step-by-step tasks.**

---

## Questions to Clarify Before Starting

- ❓ Do we have GPU access for model training?
- ❓ Should we prioritize accuracy or speed?
- ❓ Are there specific crops we should focus on first?
- ❓ What's the maximum acceptable latency per prediction?
- ❓ Should predictions cache or regenerate on each view?

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Apr 29, 2026 | Team | Initial roadmap |

---

**STATUS: Ready for Development ✅**

All supporting documents have been created. You may now proceed with Phase 1.
