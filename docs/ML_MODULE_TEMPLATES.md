hi# ML Module Code Templates

**Use these templates as starting points for each ML model component**

---

## 1. Quality Model Template

**File:** `backend-ml/models/quality_model.py`

```python
"""
YOLOv5-based produce quality assessment model
Detects defects and assigns quality scores
"""

import yolov5
import cv2
import numpy as np
from PIL import Image
import tempfile
from pathlib import Path
from utils.logger import setup_logger

logger = setup_logger(__name__)

class ProduceQualityScorer:
    """Score produce quality from images using YOLOv5"""
    
    # Defect penalty mapping (how much each defect reduces score)
    DEFECT_PENALTIES = {
        'rotten': 50.0,
        'mold': 45.0,
        'severe_bruise': 25.0,
        'stem_damage': 15.0,
        'discoloration': 10.0,
        'minor_bruise': 5.0,
        'color_off': 8.0
    }
    
    def __init__(self, model_name='yolov5s'):
        """Initialize YOLOv5 model"""
        try:
            self.model = yolov5.load(model_name)
            self.model.conf = 0.5  # Confidence threshold
            logger.info(f"✅ YOLOv5 model '{model_name}' loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load YOLOv5 model: {e}")
            raise
    
    def score_image(self, image_path_or_data):
        """
        Analyze image and return quality score
        
        Args:
            image_path_or_data: File path or PIL Image or file bytes
        
        Returns:
            dict with quality_score, defects, color_analysis, freshness_indicator
        """
        try:
            # Load image
            if isinstance(image_path_or_data, str):
                img = Image.open(image_path_or_data).convert('RGB')
            elif isinstance(image_path_or_data, Image.Image):
                img = image_path_or_data.convert('RGB')
            else:
                img = Image.open(tempfile.TemporaryFile()).convert('RGB')
            
            # Run YOLOv5 detection
            results = self.model(img, size=640)
            
            # Initialize quality score
            quality_score = 100.0
            defects_found = []
            confidence_scores = []
            
            # Process detections
            predictions = results.pred[0]
            
            for *box, conf, cls in predictions:
                class_id = int(cls.item())
                confidence = float(conf.item())
                
                # Map class_id to defect name
                # This depends on your YOLOv5 training classes
                # Adjust based on your actual model output
                defect_types = list(self.DEFECT_PENALTIES.keys())
                
                if class_id < len(defect_types):
                    defect_type = defect_types[class_id]
                    penalty = self.DEFECT_PENALTIES.get(defect_type, 5.0)
                    
                    # Adjust penalty by confidence
                    adjusted_penalty = penalty * confidence
                    quality_score -= adjusted_penalty
                    
                    defects_found.append({
                        'type': defect_type,
                        'confidence': confidence,
                        'penalty': adjusted_penalty
                    })
                    
                    confidence_scores.append(confidence)
            
            # Clamp quality score between 0 and 100
            quality_score = max(0, min(100, quality_score))
            
            # Analyze color and freshness
            color_analysis = self._analyze_color(img)
            freshness = self._analyze_freshness(img, color_analysis)
            
            # Calculate overall confidence
            overall_confidence = np.mean(confidence_scores) if confidence_scores else 0.95
            
            return {
                'quality_score': round(quality_score, 2),
                'confidence': round(overall_confidence, 2),
                'defects': [d['type'] for d in defects_found],
                'defects_detailed': defects_found,
                'color_analysis': color_analysis,
                'freshness_score': freshness['score'],
                'ripeness_level': freshness['level'],
                'recommendations': self._generate_recommendations(quality_score, defects_found),
                'model_version': 'yolov5s',
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error analyzing image: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _analyze_color(self, img):
        """Analyze color saturation and brightness"""
        # Convert to numpy array
        img_array = np.array(img)
        
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(img_array, cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # Calculate saturation (0-100)
        saturation = np.mean(hsv[:, :, 1]) / 2.55
        
        # Calculate brightness (0-100)
        brightness = np.mean(hsv[:, :, 2]) / 2.55
        
        # Calculate dominant color
        dominant_color = self._get_dominant_color(img_array)
        
        return {
            'saturation': round(saturation, 2),
            'brightness': round(brightness, 2),
            'dominant_color': dominant_color
        }
    
    def _get_dominant_color(self, img_array):
        """Get dominant color name"""
        # Resize for faster processing
        img_small = cv2.resize(img_array, (100, 100))
        
        # Convert to HSV
        hsv = cv2.cvtColor(img_small, cv2.COLOR_RGB2HSV)
        
        # Get average hue
        avg_hue = np.mean(hsv[:, :, 0])
        
        # Map hue to color name
        if avg_hue < 15 or avg_hue > 345:
            return 'red'
        elif 15 <= avg_hue < 45:
            return 'orange'
        elif 45 <= avg_hue < 65:
            return 'yellow'
        elif 65 <= avg_hue < 85:
            return 'yellow-green'
        elif 85 <= avg_hue < 170:
            return 'green'
        elif 170 <= avg_hue < 260:
            return 'blue'
        else:
            return 'purple'
    
    def _analyze_freshness(self, img, color_analysis):
        """Estimate freshness from visual cues"""
        saturation = color_analysis['saturation']
        brightness = color_analysis['brightness']
        
        # Freshness heuristics:
        # - High saturation = fresh
        # - Good brightness = fresh
        # - Muted colors = aging
        
        freshness_score = (saturation + brightness) / 2
        
        if freshness_score > 75:
            level = 'very_fresh'
        elif freshness_score > 60:
            level = 'fresh'
        elif freshness_score > 40:
            level = 'aging'
        else:
            level = 'spoiling'
        
        return {
            'score': round(freshness_score, 2),
            'level': level
        }
    
    def _generate_recommendations(self, quality_score, defects):
        """Generate recommendations based on quality"""
        if quality_score >= 90:
            return "🟢 Excellent quality - Premium market ready"
        elif quality_score >= 75:
            return "🟡 Good quality - Suitable for sale"
        elif quality_score >= 60:
            return "🟠 Fair quality - Consider discounting or processing"
        elif quality_score >= 40:
            return "🔴 Poor quality - Recommend for processing or composting"
        else:
            return "⛔ Unsuitable for market"

# Usage example
if __name__ == "__main__":
    scorer = ProduceQualityScorer()
    result = scorer.score_image("sample_crop.jpg")
    print(result)
```

---

## 2. Harvest Predictor Template

**File:** `backend-ml/models/harvest_predictor.py`

```python
"""
Harvest timing prediction based on crop type and planting date
"""

from datetime import datetime, timedelta
from utils.logger import setup_logger

logger = setup_logger(__name__)

class HarvestPredictor:
    """Predict harvest dates for various crops"""
    
    # Crop-specific harvest day ranges (min, max, typical)
    CROP_DATA = {
        'tomato': {'days': (60, 80), 'typical': 70},
        'lettuce': {'days': (45, 60), 'typical': 50},
        'carrot': {'days': (65, 80), 'typical': 75},
        'onion': {'days': (110, 130), 'typical': 120},
        'cabbage': {'days': (60, 100), 'typical': 80},
        'yam': {'days': (120, 160), 'typical': 150},
        'cassava': {'days': (280, 320), 'typical': 300},
        'maize': {'days': (100, 120), 'typical': 120},
        'okra': {'days': (50, 65), 'typical': 60},
        'pepper': {'days': (80, 100), 'typical': 90},
        'watermelon': {'days': (70, 100), 'typical': 80},
        'pumpkin': {'days': (75, 120), 'typical': 100},
        'banana': {'days': (240, 300), 'typical': 270},
        'plantain': {'days': (240, 300), 'typical': 270},
        'mango': {'days': (80, 120), 'typical': 100},
        'pineapple': {'days': (450, 600), 'typical': 480},
        'avocado': {'days': (300, 365), 'typical': 365},
        'groundnut': {'days': (110, 130), 'typical': 120},
        'cowpea': {'days': (80, 100), 'typical': 90},
    }
    
    def predict_harvest_date(self, crop_type, planting_date, region='Ashanti'):
        """
        Predict harvest date for a crop
        
        Args:
            crop_type: Type of crop (e.g., 'tomato')
            planting_date: Planting date (string 'YYYY-MM-DD' or datetime)
            region: Ghana region (for regional adjustments)
        
        Returns:
            dict with estimated_harvest, confidence, range
        """
        try:
            # Parse planting date
            if isinstance(planting_date, str):
                plant_date = datetime.fromisoformat(planting_date).date()
            else:
                plant_date = planting_date.date() if hasattr(planting_date, 'date') else planting_date
            
            crop_type_lower = crop_type.lower().strip()
            
            # Get crop data
            if crop_type_lower not in self.CROP_DATA:
                logger.warning(f"Unknown crop type: {crop_type_lower}")
                # Default to 90 days for unknown crops
                crop_info = {'days': (80, 100), 'typical': 90}
            else:
                crop_info = self.CROP_DATA[crop_type_lower]
            
            min_days, max_days = crop_info['days']
            typical_days = crop_info['typical']
            
            # Apply regional adjustments
            regional_adjustment = self._get_regional_adjustment(region)
            adjusted_typical = int(typical_days * regional_adjustment)
            
            # Calculate harvest dates
            earliest_harvest = plant_date + timedelta(days=min_days)
            latest_harvest = plant_date + timedelta(days=max_days)
            estimated_harvest = plant_date + timedelta(days=adjusted_typical)
            
            # Calculate days until harvest
            today = datetime.now().date()
            days_until = (estimated_harvest - today).days
            
            # Confidence based on crop type
            # Known crops: high confidence, unknown: lower
            confidence = 0.85 if crop_type_lower in self.CROP_DATA else 0.60
            
            return {
                'estimated_harvest': estimated_harvest.isoformat(),
                'confidence': confidence,
                'range': {
                    'earliest': earliest_harvest.isoformat(),
                    'latest': latest_harvest.isoformat()
                },
                'days_until': max(0, days_until),
                'crop_type': crop_type_lower,
                'region': region,
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error predicting harvest: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_regional_adjustment(self, region):
        """Get regional climate adjustment factor"""
        # Different regions have different growing seasons
        regional_factors = {
            'Ashanti': 1.0,      # Baseline
            'Greater Accra': 0.95,  # Slightly faster (warmer)
            'Volta': 1.05,       # Slightly slower (more rain)
            'Northern': 1.1,     # Much slower (dry season)
            'Western': 0.98,     # Slightly faster
            'Eastern': 1.02,     # Slightly slower
            'Central': 1.0,      # Baseline
            'Brong-Ahafo': 1.03, # Slightly slower
        }
        return regional_factors.get(region, 1.0)

# Usage example
if __name__ == "__main__":
    predictor = HarvestPredictor()
    result = predictor.predict_harvest_date('tomato', '2026-03-15', 'Ashanti')
    print(result)
```

---

## 3. Freshness Calculator Template

**File:** `backend-ml/models/freshness_calculator.py`

```python
"""
Calculate freshness duration and expiry dates
"""

from datetime import datetime, timedelta
from utils.logger import setup_logger

logger = setup_logger(__name__)

class FreshnessCalculator:
    """Calculate how long produce stays fresh"""
    
    # Freshness duration (days) at different conditions
    FRESHNESS_REFERENCE = {
        'tomato': {
            'refrigerated': {'temp': 5, 'days': 10},
            'room_temp': {'temp': 25, 'days': 3},
            'cool': {'temp': 15, 'days': 7}
        },
        'lettuce': {
            'refrigerated': {'temp': 5, 'days': 14},
            'room_temp': {'temp': 25, 'days': 2},
            'cool': {'temp': 15, 'days': 5}
        },
        'carrot': {
            'refrigerated': {'temp': 5, 'days': 30},
            'room_temp': {'temp': 25, 'days': 7},
            'cool': {'temp': 15, 'days': 14}
        },
        'yam': {
            'refrigerated': {'temp': 5, 'days': 45},
            'room_temp': {'temp': 25, 'days': 14},
            'cool': {'temp': 15, 'days': 30}
        },
        'banana': {
            'refrigerated': {'temp': 5, 'days': 7},
            'room_temp': {'temp': 25, 'days': 3},
            'cool': {'temp': 15, 'days': 5}
        },
        'mango': {
            'refrigerated': {'temp': 5, 'days': 14},
            'room_temp': {'temp': 25, 'days': 7},
            'cool': {'temp': 15, 'days': 10}
        },
        'onion': {
            'refrigerated': {'temp': 5, 'days': 60},
            'room_temp': {'temp': 25, 'days': 30},
            'cool': {'temp': 15, 'days': 45}
        },
    }
    
    # Default freshness if crop not found
    DEFAULT_FRESHNESS = {
        'refrigerated': 14,
        'room_temp': 5,
        'cool': 10
    }
    
    def calculate_expiry(self, crop_type, harvest_date, storage_temperature=None, humidity=None):
        """
        Calculate predicted expiry date
        
        Args:
            crop_type: Type of crop
            harvest_date: Harvest date (string 'YYYY-MM-DD' or datetime)
            storage_temperature: Storage temp in Celsius (optional)
            humidity: Storage humidity % (optional)
        
        Returns:
            dict with predicted_expiry, freshness_days, storage_condition
        """
        try:
            # Parse harvest date
            if isinstance(harvest_date, str):
                harvest = datetime.fromisoformat(harvest_date).date()
            else:
                harvest = harvest_date.date() if hasattr(harvest_date, 'date') else harvest_date
            
            crop_type_lower = crop_type.lower().strip()
            
            # Get freshness reference data
            if crop_type_lower in self.FRESHNESS_REFERENCE:
                fresh_data = self.FRESHNESS_REFERENCE[crop_type_lower]
            else:
                logger.warning(f"Unknown crop: {crop_type_lower}, using default")
                fresh_data = None
            
            # Determine storage condition and freshness days
            if storage_temperature is None:
                storage_temp = 25  # Room temperature default
                condition = 'room_temp'
            elif storage_temperature < 10:
                storage_temp = storage_temperature
                condition = 'refrigerated'
            elif storage_temperature < 18:
                storage_temp = storage_temperature
                condition = 'cool'
            else:
                storage_temp = storage_temperature
                condition = 'room_temp'
            
            # Get freshness days
            if fresh_data and condition in fresh_data:
                freshness_days = fresh_data[condition]['days']
            else:
                freshness_days = self.DEFAULT_FRESHNESS.get(condition, 10)
            
            # Apply humidity adjustment
            if humidity is not None:
                humidity_adjustment = self._get_humidity_adjustment(humidity)
                freshness_days = int(freshness_days * humidity_adjustment)
            
            # Calculate expiry date
            expiry_date = harvest + timedelta(days=freshness_days)
            
            # Generate quality degradation curve
            degradation = self._generate_degradation_curve(freshness_days)
            
            return {
                'predicted_expiry': expiry_date.isoformat(),
                'freshness_days': freshness_days,
                'storage_condition': condition,
                'storage_temperature': storage_temp,
                'quality_degradation': degradation,
                'recommendations': self._generate_recommendations(freshness_days, condition),
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error calculating expiry: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_humidity_adjustment(self, humidity):
        """Adjust freshness based on storage humidity"""
        # Optimal humidity for most produce: 85-95%
        if 80 <= humidity <= 95:
            return 1.1  # Better preservation
        elif 60 <= humidity < 80:
            return 1.0  # Normal
        elif humidity < 60:
            return 0.8  # Faster drying
        else:  # humidity > 95
            return 0.85  # Risk of mold
    
    def _generate_degradation_curve(self, freshness_days):
        """Generate quality degradation over time"""
        curve = {}
        for day in range(1, min(freshness_days + 1, 16)):
            # Linear degradation model
            quality = max(0, 100 - (day / freshness_days * 100))
            curve[f'day_{day}'] = round(quality, 1)
        return curve
    
    def _generate_recommendations(self, freshness_days, condition):
        """Generate storage recommendations"""
        if condition == 'refrigerated':
            return "Keep refrigerated (0-5°C) for maximum freshness"
        elif condition == 'cool':
            return "Store in cool location (10-18°C), away from sunlight"
        else:
            return "Store at room temperature, well-ventilated area"

# Usage example
if __name__ == "__main__":
    calc = FreshnessCalculator()
    result = calc.calculate_expiry('tomato', '2026-04-29', storage_temperature=5)
    print(result)
```

---

## 4. Price Forecaster Template

**File:** `backend-ml/models/price_forecaster.py`

```python
"""
Price forecasting based on market demand and crop supply
"""

from utils.logger import setup_logger
from datetime import datetime, timedelta

logger = setup_logger(__name__)

class PriceForecaster:
    """Forecast recommended prices based on demand"""
    
    # Base price ranges by crop and region
    BASE_PRICES = {
        'tomato': {
            'Greater Accra': 2.0,
            'Ashanti': 1.8,
            'Volta': 1.9,
            'Northern': 2.2,
        },
        'lettuce': {
            'Greater Accra': 3.0,
            'Ashanti': 2.8,
            'Volta': 2.8,
            'Northern': 3.2,
        },
        'carrot': {
            'Greater Accra': 1.5,
            'Ashanti': 1.4,
            'Volta': 1.5,
            'Northern': 1.7,
        },
        'yam': {
            'Greater Accra': 5.0,
            'Ashanti': 4.5,
            'Volta': 4.8,
            'Northern': 5.2,
        },
        'onion': {
            'Greater Accra': 1.2,
            'Ashanti': 1.1,
            'Volta': 1.2,
            'Northern': 1.3,
        },
    }
    
    def forecast_price(self, crop_type, region='Greater Accra', current_price=None, quality_score=75):
        """
        Forecast recommended price
        
        Args:
            crop_type: Type of crop
            region: Geographic region
            current_price: Current asking price (optional)
            quality_score: Product quality (0-100)
        
        Returns:
            dict with recommended_price, price_trend, rationale
        """
        try:
            crop_type_lower = crop_type.lower().strip()
            
            # Get base price for region
            if crop_type_lower in self.BASE_PRICES:
                regional_prices = self.BASE_PRICES[crop_type_lower]
                base_price = regional_prices.get(region, list(regional_prices.values())[0])
            else:
                logger.warning(f"Unknown crop: {crop_type_lower}")
                base_price = current_price or 2.0
            
            # Adjust for quality
            quality_multiplier = 0.8 + (quality_score / 100) * 0.4
            # quality_score 0 → 0.8x, quality_score 100 → 1.2x
            
            # Market demand adjustment (placeholder - would use real data)
            demand_multiplier = self._estimate_demand_multiplier(crop_type_lower, region)
            
            # Calculate recommended price
            recommended_price = base_price * quality_multiplier * demand_multiplier
            recommended_price = round(recommended_price, 2)
            
            # Determine price trend
            if demand_multiplier > 1.1:
                trend = 'rising'
                trend_emoji = '📈'
            elif demand_multiplier < 0.9:
                trend = 'falling'
                trend_emoji = '📉'
            else:
                trend = 'stable'
                trend_emoji = '➡️'
            
            # Calculate percentage change
            if current_price and current_price > 0:
                change_percent = ((recommended_price - current_price) / current_price) * 100
            else:
                change_percent = 0
            
            # Generate rationale
            rationale = self._generate_rationale(
                crop_type_lower,
                region,
                quality_score,
                change_percent,
                trend
            )
            
            return {
                'recommended_price': recommended_price,
                'current_price': current_price or base_price,
                'change_percent': round(change_percent, 1),
                'price_trend': trend,
                'trend_emoji': trend_emoji,
                'rationale': rationale,
                'quality_factor': round(quality_multiplier, 2),
                'demand_factor': round(demand_multiplier, 2),
                'forecast_period': {
                    'start': datetime.now().date().isoformat(),
                    'end': (datetime.now().date() + timedelta(days=7)).isoformat()
                },
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error forecasting price: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _estimate_demand_multiplier(self, crop_type, region):
        """
        Estimate market demand multiplier
        In production, this would use real market data APIs
        """
        # Placeholder demand signals
        demand_signals = {
            ('tomato', 'Greater Accra'): 1.15,  # High demand in Accra
            ('lettuce', 'Greater Accra'): 1.10,
            ('yam', 'Northern'): 1.2,  # Seasonal peak
            ('carrot', 'Ashanti'): 1.05,
        }
        
        return demand_signals.get((crop_type, region), 1.0)
    
    def _generate_rationale(self, crop_type, region, quality_score, change_percent, trend):
        """Generate human-readable price recommendation rationale"""
        reasons = []
        
        # Quality factor
        if quality_score >= 85:
            reasons.append("Excellent product quality")
        elif quality_score < 60:
            reasons.append("Lower quality - price adjustment recommended")
        
        # Demand factor
        if trend == 'rising':
            reasons.append(f"High demand detected in {region}")
        elif trend == 'falling':
            reasons.append(f"Lower demand in {region} - consider price reduction")
        
        # Price change
        if change_percent > 10:
            reasons.append(f"Market premium opportunity (+{change_percent}%)")
        elif change_percent < -10:
            reasons.append(f"Competitive pricing (-{abs(change_percent)}%)")
        
        return " | ".join(reasons) if reasons else "Market neutral pricing"

# Usage example
if __name__ == "__main__":
    forecaster = PriceForecaster()
    result = forecaster.forecast_price('tomato', 'Greater Accra', 2.0, 85)
    print(result)
```

---

## 5. FastAPI Routes Template

**File:** `backend-ml/routes/predictions.py`

```python
"""
FastAPI routes for ML predictions
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from models.quality_model import ProduceQualityScorer
from models.harvest_predictor import HarvestPredictor
from models.freshness_calculator import FreshnessCalculator
from models.price_forecaster import PriceForecaster
from utils.logger import setup_logger
import tempfile

logger = setup_logger(__name__)

router = APIRouter()

# Initialize models
quality_scorer = ProduceQualityScorer()
harvest_predictor = HarvestPredictor()
freshness_calc = FreshnessCalculator()
price_forecaster = PriceForecaster()

@router.post("/analyze-quality")
async def analyze_quality(
    file: UploadFile = File(...),
    crop_id: int = Form(None)
):
    """Analyze produce quality from image"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Analyze image
        result = quality_scorer.score_image(tmp_path)
        
        if result['status'] == 'success':
            logger.info(f"✅ Quality analysis complete - Score: {result['quality_score']}")
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Quality analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-harvest")
async def predict_harvest(
    crop_type: str = Form(...),
    planting_date: str = Form(...),
    region: str = Form('Ashanti')
):
    """Predict harvest date"""
    try:
        result = harvest_predictor.predict_harvest_date(crop_type, planting_date, region)
        logger.info(f"✅ Harvest prediction - {crop_type}: {result.get('estimated_harvest')}")
        return result
    
    except Exception as e:
        logger.error(f"❌ Harvest prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-freshness")
async def predict_freshness(
    crop_type: str = Form(...),
    harvest_date: str = Form(...),
    storage_temperature: int = Form(5),
    humidity: int = Form(85)
):
    """Predict freshness duration"""
    try:
        result = freshness_calc.calculate_expiry(
            crop_type,
            harvest_date,
            storage_temperature,
            humidity
        )
        logger.info(f"✅ Freshness calc - Expiry: {result.get('predicted_expiry')}")
        return result
    
    except Exception as e:
        logger.error(f"❌ Freshness calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/forecast-price")
async def forecast_price(
    crop_type: str = Form(...),
    region: str = Form('Greater Accra'),
    current_price: float = Form(None),
    quality_score: float = Form(75)
):
    """Forecast recommended price"""
    try:
        result = price_forecaster.forecast_price(
            crop_type,
            region,
            current_price,
            quality_score
        )
        logger.info(f"✅ Price forecast - {crop_type}: GHS {result.get('recommended_price')}")
        return result
    
    except Exception as e:
        logger.error(f"❌ Price forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/crop-types")
async def get_crop_types():
    """Get list of supported crop types"""
    crops = list(harvest_predictor.CROP_DATA.keys())
    return {
        'status': 'success',
        'total': len(crops),
        'crops': sorted(crops)
    }
```

---

**Reference:** These templates are ready to copy into your backend-ml/models and backend-ml/routes directories.

**Next Step:** Follow ML_SERVICE_STRUCTURE.md setup guide, then copy these templates into your project.
