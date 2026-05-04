from datetime import datetime, timedelta
from typing import Dict

class FreshnessCalculator:
    """Production freshness estimator based on harvest time and storage conditions."""

    # Shelf-life data (days from harvest to deterioration)
    SHELF_LIFE = {
        'tomato': {'optimal': 14, 'room_temp': 7, 'refrigerated': 21},
        'lettuce': {'optimal': 7, 'room_temp': 2, 'refrigerated': 14},
        'yam': {'optimal': 180, 'room_temp': 90, 'refrigerated': 240},
        'maize': {'optimal': 30, 'room_temp': 15, 'refrigerated': 60},
        'pepper': {'optimal': 21, 'room_temp': 10, 'refrigerated': 28},
        'cucumber': {'optimal': 10, 'room_temp': 3, 'refrigerated': 14},
        'okra': {'optimal': 3, 'room_temp': 1, 'refrigerated': 7},
        'cassava': {'optimal': 120, 'room_temp': 60, 'refrigerated': 180}
    }

    # Quality degradation rates (% per day)
    DEGRADATION_RATES = {
        'optimal': 0.02,      # 2% per day (ideal temp/humidity)
        'room_temp': 0.08,    # 8% per day
        'refrigerated': 0.01  # 1% per day
    }

    def __init__(self):
        self.model_version = 'v1.0-storage-aware'

    def calculate_freshness(self, crop_type: str, harvest_date: str, 
                          storage_condition: str = 'room_temp', 
                          quality_score: float = 85.0) -> Dict:
        """
        Calculate freshness score based on time since harvest and storage conditions.
        
        Args:
            crop_type: Type of crop (tomato, lettuce, etc.)
            harvest_date: ISO format date string (YYYY-MM-DD)
            storage_condition: 'optimal', 'room_temp', or 'refrigerated'
            quality_score: Initial quality score (0-100)
        
        Returns:
            Dictionary with freshness metrics
        """
        if crop_type not in self.SHELF_LIFE:
            raise ValueError(f'Unsupported crop type: {crop_type}')
        
        if storage_condition not in self.DEGRADATION_RATES:
            raise ValueError(f'Invalid storage condition: {storage_condition}')

        try:
            harvest = datetime.fromisoformat(harvest_date).date()
        except Exception:
            raise ValueError('harvest_date must be ISO format YYYY-MM-DD')

        # Calculate days since harvest
        days_since_harvest = (datetime.now().date() - harvest).days
        if days_since_harvest < 0:
            days_since_harvest = 0

        # Get shelf-life for this crop and condition
        shelf_life = self.SHELF_LIFE[crop_type][storage_condition]
        
        # Calculate freshness with exponential decay
        degradation_rate = self.DEGRADATION_RATES[storage_condition]
        freshness_score = quality_score * (1 - degradation_rate) ** days_since_harvest
        freshness_score = max(0.0, min(100.0, freshness_score))

        # Calculate days remaining
        days_remaining = shelf_life - days_since_harvest
        
        # Determine freshness status
        if days_remaining > shelf_life * 0.7:
            status = 'excellent'
            confidence = 0.95
        elif days_remaining > shelf_life * 0.4:
            status = 'good'
            confidence = 0.85
        elif days_remaining > 0:
            status = 'fair'
            confidence = 0.70
        else:
            status = 'expired'
            confidence = 0.90

        return {
            'freshness_score': round(freshness_score, 2),
            'status': status,
            'confidence': confidence,
            'days_since_harvest': days_since_harvest,
            'days_remaining': max(0, days_remaining),
            'shelf_life': shelf_life,
            'storage_condition': storage_condition,
            'quality_degradation': round(100 - freshness_score, 2),
            'model_version': self.model_version
        }

    def recommend_storage(self, crop_type: str, target_freshness_days: int = None) -> Dict:
        """Recommend optimal storage condition based on desired shelf-life."""
        if crop_type not in self.SHELF_LIFE:
            raise ValueError(f'Unsupported crop type: {crop_type}')

        shelf_data = self.SHELF_LIFE[crop_type]
        
        if target_freshness_days is None:
            target_freshness_days = shelf_data['optimal']

        # Find best storage condition
        conditions = [
            ('refrigerated', shelf_data['refrigerated']),
            ('optimal', shelf_data['optimal']),
            ('room_temp', shelf_data['room_temp'])
        ]
        
        best_condition = 'room_temp'
        for condition, shelf_life in conditions:
            if shelf_life >= target_freshness_days:
                best_condition = condition
                break

        return {
            'recommended_storage': best_condition,
            'expected_shelf_life': shelf_data[best_condition],
            'crop_type': crop_type,
            'target_days': target_freshness_days
        }
