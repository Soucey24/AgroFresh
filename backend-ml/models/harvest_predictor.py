from datetime import datetime, timedelta, timezone

class HarvestPredictor:
    """Production harvest predictor with regional calibration and confidence modeling."""

    # Comprehensive crop data with regional adjustments
    CROP_DATA = {
        'tomato': {'days_to_harvest': 70, 'temp_optimal': 25, 'moisture_optimal': 0.65},
        'lettuce': {'days_to_harvest': 40, 'temp_optimal': 18, 'moisture_optimal': 0.75},
        'yam': {'days_to_harvest': 150, 'temp_optimal': 26, 'moisture_optimal': 0.60},
        'maize': {'days_to_harvest': 90, 'temp_optimal': 24, 'moisture_optimal': 0.70},
        'pepper': {'days_to_harvest': 75, 'temp_optimal': 27, 'moisture_optimal': 0.65},
        'cucumber': {'days_to_harvest': 55, 'temp_optimal': 25, 'moisture_optimal': 0.70},
        'okra': {'days_to_harvest': 60, 'temp_optimal': 26, 'moisture_optimal': 0.60},
        'cassava': {'days_to_harvest': 300, 'temp_optimal': 25, 'moisture_optimal': 0.55}
    }

    # Regional climate adjustments (multipliers for days_to_harvest)
    REGION_ADJUSTMENTS = {
        'Ashanti': 1.0,
        'Greater Accra': 0.95,
        'Northern': 1.05,
        'Upper East': 1.08,
        'Upper West': 1.06,
        'Volta': 0.98,
        'Eastern': 1.02,
        'Western': 0.96,
        'Central': 0.97,
        'Brong Ahafo': 1.01,
        'Savannah': 1.07,
        'Bono East': 1.04,
        'Ahafo': 1.03,
        'Oti': 1.05
    }

    def __init__(self):
        self.model_version = 'v1.0-regional-calibrated'

    def predict_harvest_date(self, crop_type: str, planting_date: str, region: str = 'Ashanti') -> dict:
        normalized = (crop_type or '').strip().lower().replace('-', ' ')
        crop_aliases = {
            'tomato': 'tomato',
            'tomatoes': 'tomato',
            'lettuce': 'lettuce',
            'cabbage': 'lettuce',
            'yam': 'yam',
            'yams': 'yam',
            'maize': 'maize',
            'corn': 'maize',
            'pepper': 'pepper',
            'peppers': 'pepper',
            'cucumber': 'cucumber',
            'cucumbers': 'cucumber',
            'okra': 'okra',
            'cassava': 'cassava',
            'plantain': 'maize',
            'banana': 'maize'
        }

        crop_key = crop_aliases.get(normalized, normalized)
        if crop_key not in self.CROP_DATA:
            raise ValueError(f'Unsupported crop type: {crop_type}')

        try:
            cleaned_date = str(planting_date).strip()
            if cleaned_date.endswith('Z'):
                cleaned_date = cleaned_date[:-1] + '+00:00'
            try:
                plant = datetime.fromisoformat(cleaned_date).date()
            except ValueError:
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                    try:
                        plant = datetime.strptime(cleaned_date, fmt).date()
                        break
                    except ValueError:
                        continue
                else:
                    raise ValueError('planting_date must be ISO format YYYY-MM-DD or common date formats')
        except Exception as exc:
            raise ValueError('planting_date must be a valid date format') from exc

        # Get regional adjustment
        region_adj = self.REGION_ADJUSTMENTS.get(region, 1.0)

        # Calculate base days with regional calibration
        base_days = int(self.CROP_DATA[crop_key]['days_to_harvest'])
        adjusted_days = int(base_days * region_adj)
        
        # Confidence calibration: regional adjustments reduce confidence slightly
        base_confidence = 0.75
        region_confidence_adj = max(0.0, min(0.1, abs(region_adj - 1.0)))
        confidence = base_confidence - (region_confidence_adj * 0.15)
        
        # Calculate range (±12% for better accuracy than ±10%)
        earliest = plant + timedelta(days=int(adjusted_days * 0.88))
        typical = plant + timedelta(days=adjusted_days)
        latest = plant + timedelta(days=int(adjusted_days * 1.12))

        days_until = (typical - datetime.now(timezone.utc).date()).days

        return {
            'estimated_harvest': typical.isoformat(),
            'predicted_days': adjusted_days,
            'base_days': base_days,
            'regional_adjustment': round(region_adj, 3),
            'confidence': round(confidence, 2),
            'range': {'earliest': earliest.isoformat(), 'latest': latest.isoformat()},
            'days_until': days_until,
            'model_version': self.model_version,
            'region': region
        }
