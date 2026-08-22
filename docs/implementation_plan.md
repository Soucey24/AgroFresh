# AgroFresh Full‑Stack AI/ML Implementation Plan

## Goal
Provide a step‑by‑step, production‑ready implementation of all remaining phases (ML service, database extensions, Node‑Express integration, frontend UI, testing, monitoring, and deployment) for the AgroFresh marketplace.

## User Review Required
> [!IMPORTANT]
> This plan will modify many files across the repository and introduce new services. Please review the phases, confirm any preferences (e.g., deployment platform, CI/CD tooling), and approve before we start any code generation.

## Open Questions
> [!WARNING]
> - **Deployment target:** We'll host the FastAPI service on Railway (easy Docker deployment).
> - **Database migration strategy:** Run Supabase migrations automatically via a script during CI/CD.
> - **Testing framework:** Use Jest for the Node backend and PyTest for the Python service.
> - **Logging/monitoring stack:** Use simple JSON file logs for both services, with optional Loki integration later.

## Proposed Changes
---
### Phase 1 – Database & Schema (already done)
- No new files needed; migration already applied per `IMPLEMENTATION_CHECKLIST.md`.

---
### Phase 2 – Python ML Service Setup
#### [NEW] `backend-ml/requirements.txt`
- Dependencies: `fastapi`, `uvicorn[standard]`, `python‑dotenv`, `supabase>=2.0`, `torch`, `yolov5` (via pip), `pydantic`, `scikit‑learn`, `pandas`.
#### [NEW] `backend-ml/.env.example`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `ML_PORT=8001`
- `ML_DEBUG=true`
#### [NEW] `backend-ml/app.py`
- FastAPI app creation, CORS middleware, include routers.
#### [NEW] `backend-ml/config.py`
- Load env vars, expose a Config object.
#### [NEW] `backend-ml/utils/supabase_client.py`
- Thin wrapper around `supabase` client for inserting predictions & fetching reference data.
#### [NEW] `backend-ml/routes/health.py`
- Simple `/api/health` returning `{status: "ok"}`.
#### [NEW] `backend-ml/routes/predictions.py`
- Endpoints: `POST /api/ml/analyze-quality`, `POST /api/ml/predict-harvest`, `POST /api/ml/predict-freshness`, `POST /api/ml/forecast-price`, `GET /api/ml/crop-types`.
#### [NEW] `backend-ml/models/*`
- Stub implementations for quality, harvest, freshness, price models (production‑ready code skeleton, later filled with actual logic).
#### [NEW] `backend-ml/tests/`
- PyTest test suite for each model and route.

---
### Phase 3 – Model Implementation (Production‑Ready)
- Replace stubs with fully‑trained YOLOv5 model load (`torch.hub.load('ultralytics/yolov5', 'custom', path='models/quality.pt')`).
- Implement deterministic harvest predictor using crop‑type lookup tables and climate data (static JSON).
- Freshness calculator based on storage temperature/humidity curves (CSV → pandas).
- Price forecaster using linear regression on historical market data (optional external API).
- Add unit tests validating edge cases and performance benchmarks.

---
### Phase 4 – Node Express Integration
#### [NEW] `backend/services/mlService.js`
- Axios wrapper reading `process.env.ML_SERVICE_URL` with timeout.
- Export functions: `analyzeQuality`, `predictHarvest`, `predictFreshness`, `forecastPrice`.
#### Modify `backend/routes/crops.js`
- Add POST routes that call the ML service via the wrapper and store results using Supabase client.
#### Update `.env`
- Add `ML_SERVICE_URL=http://localhost:8001` and `ML_SERVICE_TIMEOUT=30000`.
#### Add error‑handling middleware to translate FastAPI errors into Express responses.

---
### Phase 5 – Frontend Integration
#### Extend `src/api.js`
- New functions that call the Express endpoints (`/api/crops/:id/analyze-quality`, etc.) and return typed results.
#### Update UI Components
- `src/pages/Farmers.tsx` – display prediction cards, refresh button, loading spinners.
- `src/components/ProductCard.tsx` – badge for quality score, freshness indicator, price recommendation.
- `src/pages/admin/Crops.tsx` – “Run Predictions” button, status column.
- Add new page `src/pages/MarketInsights.tsx` with charts (use Chart.js) showing regional forecasts.
#### Add filters to buyer search (`src/pages/Buyers.tsx`)
- Quality‑score filter slider, freshness‑status dropdown.
#### Styling
- Apply Tailwind‑based design (already present) with premium gradient cards and subtle micro‑animations for prediction loading.

---
### Phase 6 – Testing & Optimization
- **Backend tests**: Jest for Express routes, SuperTest for HTTP integration.
- **Python tests**: PyTest with fixtures for model loading; mock Supabase client.
- **Performance**: `hey` or `wrk` scripts to ensure < 3 s latency.
- **CI/CD**: GitHub Actions workflow that runs Node tests, Python tests, builds Docker images, and pushes to a registry.
- **Security**: Run `npm audit` and `bandit` for Python, enforce secret scanning.

---
### Phase 7 – Monitoring & Refinement
- Structured JSON logging (Winston for Node, Loguru for Python).
- Export logs to Supabase `logs` table or external Loki.
- Simple Grafana dashboard showing request latency, error rates, model accuracy metrics (pulled from `ml_metrics` table).
- Automated nightly job to compute model drift (compare recent predictions vs actual outcomes) and raise a GitHub issue if accuracy drops > 5 %.

---
## Verification Plan
### Automated Tests
- `npm test` (Jest) → all Node routes pass.
- `pytest -q` → all Python routes and model functions pass.
- End‑to‑end script: start FastAPI, Express, run a curl sequence that creates a crop, uploads an image, triggers quality analysis, and validates DB entry.
### Manual Verification
- Deploy locally (`docker-compose up -d`) and navigate the UI to ensure predictions appear.
- Run a load test (100 concurrent requests) and verify response times.
- Check logs for structured entries.

---
## next steps (awaiting your approval)
1. Choose **deployment platform** for the FastAPI service.
2. Confirm **testing framework preferences**.
3. Approve the overall plan so we can start generating production‑ready code for Phase 2.

Please answer the open questions above or provide any additional constraints, then reply **Approve** to begin.
