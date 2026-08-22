# ML Requirements & Specifications

**Document Version:** 1.0  
**Status:** Ready for Implementation

---

## Functional Requirements

### FR1: Image Quality Analysis

**Description:** System analyzes crop images and provides quality score (0-100)

**Requirements:**
- FR1.1: Accept image uploads (JPG, PNG, WEBP)
- FR1.2: Detect visible defects (rotten, bruised, stem damage, mold, discoloration)
- FR1.3: Assess color saturation and brightness
- FR1.4: Return quality score with confidence level
- FR1.5: Store analysis results in database

**Acceptance Criteria:**
- ✅ API response time < 3 seconds per image
- ✅ Accuracy >= 85% for defect detection (vs manual inspection)
- ✅ Support batch processing (5+ images)

---

### FR2: Harvest Timing Prediction

**Description:** System predicts optimal harvest date based on crop type and planting date

**Requirements:**
- FR2.1: Accept crop type and planting date
- FR2.2: Return predicted harvest date range (earliest, average, latest)
- FR2.3: Provide confidence score
- FR2.4: Account for seasonal variations

**Acceptance Criteria:**
- ✅ Prediction accuracy within ±5 days of actual harvest
- ✅ Support 30+ common Ghana crops
- ✅ Confidence scores between 0.6-0.9

---

### FR3: Freshness Duration Calculation

**Description:** System calculates expected freshness period based on crop type and storage conditions

**Requirements:**
- FR3.1: Calculate shelf life in days
- FR3.2: Factor in storage temperature (refrigerated vs room temp)
- FR3.3: Return expiry date prediction
- FR3.4: Account for harvest freshness level

**Acceptance Criteria:**
- ✅ Predictions within ±2 days of actual spoilage
- ✅ Support humidity, temperature, ethylene exposure factors
- ✅ Suggest storage recommendations

---

### FR4: Price Forecasting

**Description:** System recommends pricing based on regional demand and crop supply

**Requirements:**
- FR4.1: Analyze historical price data
- FR4.2: Factor in current demand signals
- FR4.3: Return recommended price with rationale
- FR4.4: Show price trend (rising, stable, falling)

**Acceptance Criteria:**
- ✅ Price recommendations within ±10% of market average
- ✅ Update forecasts daily
- ✅ Support regional analysis (Accra, Kumasi, Takoradi, etc.)

---

### FR5: AI Predictions Storage

**Description:** All predictions are stored and trackable over time

**Requirements:**
- FR5.1: Store prediction results with metadata
- FR5.2: Link predictions to specific crop listings
- FR5.3: Track prediction timestamps and validity windows
- FR5.4: Enable historical analysis

**Acceptance Criteria:**
- ✅ Retrieve prediction history for any crop
- ✅ Query executed in < 500ms
- ✅ 2-year historical retention

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| API Response Time | < 3 sec (images), < 500ms (calculations) |
| Database Query | < 100ms |
| Image Processing | < 2 sec for 1280x720 image |
| Batch Operations | 5 images in < 12 sec |

### Scalability

| Metric | Target |
|--------|--------|
| Concurrent Users | 1,000+ simultaneously |
| Daily Predictions | 10,000+ |
| Storage | 1TB+ for 5-year history |

### Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Data Loss | 0% |
| Backup Frequency | Daily |

### Security

| Aspect | Requirement |
|--------|-------------|
| Authentication | API key or JWT |
| Data Encryption | TLS for transport, encrypted at rest |
| Input Validation | Sanitize all inputs |
| Rate Limiting | 100 requests/min per user |

---

## Data Requirements

### Input Data Specifications

**Crop Image:**
```
- Format: JPG, PNG, WEBP
- Size: 100KB - 5MB
- Resolution: Min 640x480px, Recommended 1280x720px
- Color: RGB or RGBA
- Background: Any (will be processed)
- Count: 1-5 images per crop
```

**Crop Metadata:**
```
- crop_type: string (e.g., "tomato", "lettuce")
- planting_date: ISO date (YYYY-MM-DD)
- region: string (e.g., "Ashanti", "Greater Accra")
- storage_temperature: integer (-5 to 30°C)
- humidity: integer (20-100%)
```

### Output Data Specifications

**Quality Analysis Result:**
```json
{
  "quality_score": 85.5,
  "confidence": 0.92,
  "defects": ["minor_bruise", "slight_discoloration"],
  "color_analysis": {
    "saturation": 7.8,
    "brightness": 8.2,
    "hue": "red"
  },
  "recommendations": "Good for sale, minor blemishes",
  "timestamp": "2026-04-29T14:30:00Z"
}
```

**Harvest Prediction Result:**
```json
{
  "estimated_harvest": "2026-05-15",
  "confidence": 0.75,
  "range": {
    "earliest": "2026-05-10",
    "latest": "2026-05-20"
  },
  "days_until": 16,
  "model_version": "v1.0"
}
```

**Freshness Calculation Result:**
```json
{
  "predicted_expiry": "2026-05-25",
  "freshness_days": 10,
  "storage_condition": "refrigerated",
  "quality_degradation": {
    "day_2": 95,
    "day_5": 85,
    "day_10": 50
  }
}
```

**Price Forecast Result:**
```json
{
  "recommended_price": 2.50,
  "current_price": 2.20,
  "change_percent": 13.6,
  "price_trend": "rising",
  "rationale": "High demand in Accra this week",
  "forecast_period": "2026-04-29 to 2026-05-05"
}
```

---

## Technology Stack Specifications

### Python Environment

```
Runtime: Python 3.10 or 3.11
Package Manager: pip
Virtual Environment: venv
```

### Core Dependencies

```
FastAPI >= 4.104.1          # Web framework
Uvicorn >= 0.24.0           # ASGI server
PyTorch >= 2.0.1            # ML framework
TorchVision >= 0.15.1       # Computer vision
YOLOv5 >= 7.0.13            # Object detection
Pillow >= 10.0.0            # Image processing
NumPy >= 1.24.3             # Numerical computing
Pandas >= 2.0.0             # Data manipulation
Scikit-Learn >= 1.3.0       # ML algorithms
Supabase >= 1.0.3           # Database client
Python-Dotenv >= 1.0.0      # Environment management
```

### Optional Dependencies (Development)

```
Pytest >= 7.4.0             # Testing
Black >= 23.0               # Code formatting
Flake8 >= 6.0               # Linting
Jupyter >= 1.0.0            # Notebooks for experimentation
```

---

## API Specifications

### Base Endpoints

```
GET    /api/health                    # Health check
POST   /api/ml/analyze-quality        # Image quality analysis
POST   /api/ml/predict-harvest        # Harvest date prediction
POST   /api/ml/predict-freshness      # Freshness calculation
POST   /api/ml/forecast-price         # Price forecasting
GET    /api/ml/crop-types             # List supported crops
```

### Endpoint Details

#### POST /api/ml/analyze-quality
**Purpose:** Analyze crop image quality

**Request:**
```
Content-Type: multipart/form-data
- image: File (JPG/PNG/WEBP)
- crop_id: integer (optional, for linking)
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "quality_score": 85.5,
    "confidence": 0.92,
    "defects": [],
    "recommendations": "Excellent quality for market"
  }
}
```

**Response (400):**
```json
{
  "status": "error",
  "error": "Invalid image format"
}
```

---

#### POST /api/ml/predict-harvest
**Purpose:** Predict harvest timing

**Request:**
```json
{
  "crop_type": "tomato",
  "planting_date": "2026-03-15",
  "region": "Ashanti"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "estimated_harvest": "2026-05-14",
    "confidence": 0.78,
    "range": {
      "earliest": "2026-05-10",
      "latest": "2026-05-20"
    }
  }
}
```

---

#### POST /api/ml/predict-freshness
**Purpose:** Calculate expected freshness period

**Request:**
```json
{
  "crop_type": "tomato",
  "harvest_date": "2026-04-29",
  "storage_temperature": 5,
  "humidity": 85
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "predicted_expiry": "2026-05-09",
    "freshness_days": 10,
    "storage_condition": "refrigerated"
  }
}
```

---

#### POST /api/ml/forecast-price
**Purpose:** Recommend pricing

**Request:**
```json
{
  "crop_type": "tomato",
  "region": "Greater Accra",
  "current_price": 2.20,
  "quality_score": 85
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "recommended_price": 2.50,
    "change_percent": 13.6,
    "price_trend": "rising",
    "rationale": "High demand detected"
  }
}
```

---

## Database Schema Reference

### New Tables Required

```sql
-- Crop type reference table
CREATE TABLE crop_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  category VARCHAR(50),
  avg_days_to_harvest INT,
  avg_freshness_days INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI predictions storage
CREATE TABLE ai_predictions (
  id SERIAL PRIMARY KEY,
  crop_id INT NOT NULL REFERENCES crops(id),
  prediction_type VARCHAR(50),
  predicted_value FLOAT,
  confidence_score FLOAT,
  metadata JSONB,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Image analysis results
CREATE TABLE image_analysis (
  id SERIAL PRIMARY KEY,
  crop_id INT REFERENCES crops(id),
  image_url VARCHAR(255),
  quality_score FLOAT,
  defects TEXT[],
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market forecast data
CREATE TABLE market_forecasts (
  id SERIAL PRIMARY KEY,
  crop_type_id INT REFERENCES crop_types(id),
  region VARCHAR(100),
  recommended_price DECIMAL(10,2),
  price_trend VARCHAR(20),
  forecast_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Model Specifications

### YOLOv5 Quality Model

**Model:** yolov5s (small variant)
**Input:** Image (3-channel, any size, will resize to 640x640)
**Output:** Bounding boxes for defects + confidence scores
**Classes:** rotten, bruise, stem_damage, mold, discoloration, color_off
**Performance:** ~50ms per image on CPU

### Harvest Predictor

**Type:** Rule-based + ML ensemble
**Inputs:** crop_type, planting_date, region, weather_data (optional)
**Outputs:** harvest_date, confidence, date_range
**Accuracy Target:** MAE ±5 days

### Freshness Calculator

**Type:** Domain knowledge + ML model
**Inputs:** crop_type, harvest_date, temperature, humidity
**Outputs:** expiry_date, freshness_days, quality_curve
**Accuracy Target:** MAE ±2 days

### Price Forecaster

**Type:** Time series + demand signals
**Inputs:** crop_type, region, historical_prices, demand_data
**Outputs:** recommended_price, price_trend, confidence
**Accuracy Target:** RMSE < 10%

---

## Testing Requirements

### Unit Tests
- Each model returns expected output format
- Input validation catches invalid data
- Database operations succeed
- Error handling works

### Integration Tests
- ML service endpoints respond correctly
- Node Express can call ML service
- Predictions stored in Supabase
- Predictions retrieved correctly

### Performance Tests
- Image processing < 3 seconds
- Batch operations scale linearly
- Database queries < 100ms
- Memory usage < 500MB

---

## Deployment Requirements

### Development Environment
```
- Python 3.10+
- FastAPI + Uvicorn
- Local Supabase or pg_local
- Port 8001
```

### Production Environment
```
- Python 3.10+
- FastAPI + Uvicorn
- Supabase PostgreSQL
- Port: 8001
- Domain: api.agrofreshgh.com/ml
- SSL/TLS required
- Rate limiting: 100 req/min
- Logging: Structured JSON
- Monitoring: Prometheus metrics
```

---

## Success Criteria Checklist

- [ ] YOLOv5 detects defects with 85%+ accuracy
- [ ] Harvest predictions within ±5 days
- [ ] Freshness predictions within ±2 days
- [ ] Price recommendations within ±10% of market
- [ ] API response times < 3 seconds
- [ ] 99.5% uptime
- [ ] All predictions stored in database
- [ ] Frontend displays predictions correctly
- [ ] No data loss over 2-year retention period

---

**Reference:** See DEVELOPMENT_ROADMAP.md for timeline and phases.
