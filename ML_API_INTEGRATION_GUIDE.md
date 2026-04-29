# ML API Integration Guide

**How to connect ML Service to Node Express Backend**

---

## Overview

This guide explains how to integrate the Python FastAPI ML service with your existing Node.js Express backend.

### Architecture

```
Node Express (Port 4000)
    ↓
    ├─→ REST Request to ML Service
    ├─→ ML Service (Port 8001)
    ├─→ Process request
    ├─→ Store in Supabase
    ├─→ Return results
    ↑
Node Express
    ↓
Store results in Supabase
Notify frontend via API
```

---

## Phase 1: Update Node Dependencies

### Install Axios

The Express backend already has axios in some areas. Ensure it's available:

```bash
cd /workspaces/Agrofresh/backend
npm install axios
```

---

## Phase 2: Create ML Client Service

Create a new file: `backend/services/mlService.js`

```javascript
import axios from 'axios';
import { supabase } from '../app.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_TIMEOUT = 30000; // 30 seconds

// Initialize axios instance
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

export class MLService {
  /**
   * Check if ML service is healthy
   */
  static async healthCheck() {
    try {
      const response = await mlClient.get('/api/health');
      return response.data;
    } catch (error) {
      console.error('ML Service health check failed:', error.message);
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Analyze crop image quality
   * @param {File} imageFile - Image file to analyze
   * @param {number} cropId - Crop ID (optional, for linking)
   */
  static async analyzeQuality(imageFile, cropId = null) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      if (cropId) formData.append('crop_id', cropId);

      const response = await mlClient.post('/api/ml/analyze-quality', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Store result in Supabase
      if (cropId && response.data.status === 'success') {
        await this.storeQualityAnalysis(cropId, response.data.data);
      }

      return response.data;
    } catch (error) {
      console.error('Quality analysis failed:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Predict harvest date
   * @param {string} cropType - Crop type (e.g., 'tomato')
   * @param {string} plantingDate - Planting date (YYYY-MM-DD)
   * @param {string} region - Region (optional)
   */
  static async predictHarvest(cropType, plantingDate, region = 'Ashanti') {
    try {
      const payload = {
        crop_type: cropType,
        planting_date: plantingDate,
        region: region
      };

      const response = await mlClient.post('/api/ml/predict-harvest', payload);
      return response.data;
    } catch (error) {
      console.error('Harvest prediction failed:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Predict freshness duration
   * @param {string} cropType - Crop type
   * @param {string} harvestDate - Harvest date (YYYY-MM-DD)
   * @param {number} storageTemp - Storage temperature in Celsius
   * @param {number} humidity - Storage humidity (0-100)
   */
  static async predictFreshness(cropType, harvestDate, storageTemp = 5, humidity = 85) {
    try {
      const payload = {
        crop_type: cropType,
        harvest_date: harvestDate,
        storage_temperature: storageTemp,
        humidity: humidity
      };

      const response = await mlClient.post('/api/ml/predict-freshness', payload);
      return response.data;
    } catch (error) {
      console.error('Freshness prediction failed:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Forecast recommended price
   * @param {string} cropType - Crop type
   * @param {string} region - Region
   * @param {number} currentPrice - Current asking price
   * @param {number} qualityScore - Quality score (0-100)
   */
  static async forecastPrice(cropType, region = 'Greater Accra', currentPrice = 0, qualityScore = 75) {
    try {
      const payload = {
        crop_type: cropType,
        region: region,
        current_price: currentPrice,
        quality_score: qualityScore
      };

      const response = await mlClient.post('/api/ml/forecast-price', payload);
      return response.data;
    } catch (error) {
      console.error('Price forecast failed:', error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get all supported crop types
   */
  static async getCropTypes() {
    try {
      const response = await mlClient.get('/api/ml/crop-types');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch crop types:', error.message);
      return { status: 'error', crops: [] };
    }
  }

  /**
   * Store quality analysis in Supabase
   */
  static async storeQualityAnalysis(cropId, analysisData) {
    try {
      const { data, error } = await supabase
        .from('image_analysis')
        .insert([
          {
            crop_id: cropId,
            image_url: `crops/${cropId}/image.jpg`, // Adjust path as needed
            quality_score: analysisData.quality_score,
            confidence_score: analysisData.confidence,
            detected_defects: analysisData.defects,
            color_brightness: analysisData.color_analysis.brightness,
            color_saturation: analysisData.color_analysis.saturation,
            analyzed_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Update crops table with quality score
      await supabase
        .from('crops')
        .update({
          quality_score: analysisData.quality_score,
          last_prediction_run: new Date().toISOString()
        })
        .eq('id', cropId);

      return data;
    } catch (error) {
      console.error('Failed to store quality analysis:', error.message);
    }
  }

  /**
   * Store harvest prediction in Supabase
   */
  static async storeHarvestPrediction(cropId, predictionData) {
    try {
      const { data, error } = await supabase
        .from('ai_predictions')
        .insert([
          {
            crop_id: cropId,
            prediction_type: 'harvest_timing',
            predicted_value: new Date(predictionData.estimated_harvest).getTime(),
            confidence_score: predictionData.confidence,
            metadata: {
              range: predictionData.range,
              days_until: Math.ceil((new Date(predictionData.estimated_harvest) - new Date()) / (1000 * 60 * 60 * 24))
            },
            generated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Update crops table
      await supabase
        .from('crops')
        .update({
          harvest_date_predicted: predictionData.estimated_harvest,
          last_prediction_run: new Date().toISOString()
        })
        .eq('id', cropId);

      return data;
    } catch (error) {
      console.error('Failed to store harvest prediction:', error.message);
    }
  }

  /**
   * Store freshness prediction
   */
  static async storeFreshnessPrediction(cropId, predictionData) {
    try {
      const { data, error } = await supabase
        .from('ai_predictions')
        .insert([
          {
            crop_id: cropId,
            prediction_type: 'freshness',
            predicted_value: predictionData.freshness_days,
            confidence_score: 0.8, // Adjust as needed
            metadata: {
              expiry_date: predictionData.predicted_expiry,
              storage_condition: predictionData.storage_condition
            },
            generated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Update crops table
      await supabase
        .from('crops')
        .update({
          predicted_expiry: predictionData.predicted_expiry,
          freshness_status: 'fresh',
          last_prediction_run: new Date().toISOString()
        })
        .eq('id', cropId);

      return data;
    } catch (error) {
      console.error('Failed to store freshness prediction:', error.message);
    }
  }

  /**
   * Store price forecast
   */
  static async storePriceForecast(cropId, forecastData) {
    try {
      const { data, error } = await supabase
        .from('ai_predictions')
        .insert([
          {
            crop_id: cropId,
            prediction_type: 'price',
            predicted_value: forecastData.recommended_price,
            confidence_score: 0.75,
            metadata: {
              change_percent: forecastData.change_percent,
              price_trend: forecastData.price_trend,
              rationale: forecastData.rationale
            },
            generated_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to store price forecast:', error.message);
    }
  }

  /**
   * Run all predictions for a crop
   */
  static async runFullPredictions(cropId) {
    try {
      // Fetch crop details
      const { data: crop, error: fetchError } = await supabase
        .from('crops')
        .select('*')
        .eq('id', cropId)
        .single();

      if (fetchError) throw fetchError;

      // Run predictions in parallel
      const [harvestPred, freshnessPred, pricePred] = await Promise.all([
        crop.planting_date ? this.predictHarvest(crop.name, crop.planting_date) : null,
        crop.planting_date ? this.predictFreshness(crop.name, crop.planting_date) : null,
        this.forecastPrice(crop.name, crop.farmer_location || 'Greater Accra', crop.price, crop.quality_score || 75)
      ]);

      // Store all predictions
      const results = {};
      if (harvestPred) {
        results.harvest = await this.storeHarvestPrediction(cropId, harvestPred.data);
      }
      if (freshnessPred) {
        results.freshness = await this.storeFreshnessPrediction(cropId, freshnessPred.data);
      }
      if (pricePred) {
        results.price = await this.storePriceForecast(cropId, pricePred.data);
      }

      return { status: 'success', results };
    } catch (error) {
      console.error('Failed to run full predictions:', error.message);
      return { status: 'error', error: error.message };
    }
  }
}

export default MLService;
```

---

## Phase 3: Create Express Routes for ML

Update: `backend/routes/crops.js` - Add these endpoints:

```javascript
import MLService from '../services/mlService.js';

// GET /api/crops/:id/predictions
export const getCropPredictions = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch from ai_predictions table
    const { data: predictions, error } = await supabase
      .from('ai_predictions')
      .select('*')
      .eq('crop_id', id);

    if (error) throw error;

    res.json({ predictions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/crops/:id/analyze-quality
export const analyzeQuality = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.files?.image;

    if (!file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Call ML service
    const result = await MLService.analyzeQuality(file, id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/crops/:id/predict-all
export const predictAll = async (req, res) => {
  try {
    const { id } = req.params;

    // Run all ML predictions
    const result = await MLService.runFullPredictions(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/crops/predict-harvest
export const predictHarvest = async (req, res) => {
  try {
    const { crop_type, planting_date, region, crop_id } = req.body;

    const prediction = await MLService.predictHarvest(crop_type, planting_date, region);

    if (crop_id && prediction.status === 'success') {
      await MLService.storeHarvestPrediction(crop_id, prediction.data);
    }

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/crops/predict-freshness
export const predictFreshness = async (req, res) => {
  try {
    const { crop_type, harvest_date, storage_temp, humidity, crop_id } = req.body;

    const prediction = await MLService.predictFreshness(
      crop_type,
      harvest_date,
      storage_temp,
      humidity
    );

    if (crop_id && prediction.status === 'success') {
      await MLService.storeFreshnessPrediction(crop_id, prediction.data);
    }

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/crops/forecast-price
export const forecastPrice = async (req, res) => {
  try {
    const { crop_type, region, current_price, quality_score, crop_id } = req.body;

    const forecast = await MLService.forecastPrice(
      crop_type,
      region,
      current_price,
      quality_score
    );

    if (crop_id && forecast.status === 'success') {
      await MLService.storePriceForecast(crop_id, forecast.data);
    }

    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## Phase 4: Update Express Environment

Add to `backend/.env`:

```env
# ML Service
ML_SERVICE_URL=http://localhost:8001
ML_SERVICE_TIMEOUT=30000
```

---

## Phase 5: Update package.json Scripts

In `backend/package.json`:

```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "dev:ml": "cd ../backend-ml && source venv/bin/activate && python app.py",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:ml\"",
    "start:ml": "cd ../backend-ml && source venv/bin/activate && python -m uvicorn app:app --port 8001"
  }
}
```

Install concurrently:
```bash
npm install --save-dev concurrently
```

---

## Phase 6: Test Integration

### Step 1: Start both services

```bash
# Terminal 1: Start ML service
cd /workspaces/Agrofresh/backend-ml
source venv/bin/activate
python app.py

# Terminal 2: Start Express backend
cd /workspaces/Agrofresh/backend
npm run dev
```

### Step 2: Test health checks

```bash
# ML Service health
curl http://localhost:8001/api/health

# Express backend (should call ML)
curl http://localhost:4000/api/health
```

### Step 3: Test ML endpoint from Express

```bash
# Predict harvest
curl -X POST http://localhost:4000/api/crops/predict-harvest \
  -H "Content-Type: application/json" \
  -d '{
    "crop_type": "tomato",
    "planting_date": "2026-03-15",
    "region": "Ashanti"
  }'
```

### Step 4: Verify Supabase storage

Check Supabase dashboard:
- Table: `ai_predictions` - Should have new records
- Table: `crops` - Should have `last_prediction_run` updated

---

## Phase 7: Frontend Integration

Update `src/api.js`:

```javascript
export async function getPredictions(cropId) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/predictions`, {
    credentials: 'include'
  });
  return res.json();
}

export async function analyzeQuality(cropId, imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${API_BASE}/api/crops/${cropId}/analyze-quality`, {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  return res.json();
}

export async function runFullPredictions(cropId) {
  const res = await fetch(`${API_BASE}/api/crops/${cropId}/predict-all`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused on port 8001` | ML service not running. Start it first. |
| `CORS error from ML` | Check `CORS_ORIGINS` in `.env` includes Node backend URL |
| `Supabase write fails` | Verify service role key in `.env`. Check table permissions. |
| `Timeout errors` | Increase `ML_TIMEOUT` in mlService.js |
| `Model not found` | Run `python -c "import yolov5; model = yolov5.load('yolov5s')"` |

---

**Status:** Ready for testing  
**Next:** Implement ML models in backend-ml/models/
