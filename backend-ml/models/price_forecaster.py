from datetime import datetime, timedelta
from typing import Dict
import math

class PriceForecaster:
    """Production price forecasting based on seasonality, freshness, and demand patterns."""

    # Base market prices (GHS per unit) - Ghana context
    BASE_PRICES = {
        'tomato': 2.50,      # per kg
        'lettuce': 3.00,     # per head
        'yam': 4.00,         # per kg
        'maize': 1.80,       # per kg
        'pepper': 3.50,      # per kg
        'cucumber': 2.20,    # per piece
        'okra': 1.50,        # per kg
        'cassava': 1.20      # per kg
    }

    # Seasonal price multipliers (peak harvest vs lean season)
    SEASONAL_FACTORS = {
        'tomato': {
            1: 1.4, 2: 1.3, 3: 1.2,  # Jan-Mar high demand
            4: 0.9, 5: 0.8, 6: 0.8,  # Apr-Jun abundant supply
            7: 0.9, 8: 0.95, 9: 1.0, # Jul-Sep gradual increase
            10: 1.2, 11: 1.3, 12: 1.4 # Oct-Dec high demand
        },
        'lettuce': {
            1: 1.1, 2: 1.0, 3: 0.9,
            4: 0.8, 5: 0.8, 6: 0.9,
            7: 0.95, 8: 1.0, 9: 1.1,
            10: 1.2, 11: 1.3, 12: 1.2
        },
        'yam': {
            1: 1.3, 2: 1.3, 3: 1.2,
            4: 1.0, 5: 0.9, 6: 0.95,
            7: 1.0, 8: 1.1, 9: 1.2,
            10: 1.4, 11: 1.4, 12: 1.3
        },
        'maize': {
            1: 1.2, 2: 1.1, 3: 1.0,
            4: 0.9, 5: 0.8, 6: 0.8,
            7: 0.85, 8: 0.9, 9: 1.0,
            10: 1.2, 11: 1.3, 12: 1.3
        },
        'pepper': {
            1: 1.15, 2: 1.1, 3: 1.0,
            4: 0.9, 5: 0.85, 6: 0.85,
            7: 0.9, 8: 0.95, 9: 1.05,
            10: 1.2, 11: 1.25, 12: 1.2
        },
        'cucumber': {
            1: 1.15, 2: 1.1, 3: 0.95,
            4: 0.85, 5: 0.8, 6: 0.8,
            7: 0.85, 8: 0.9, 9: 1.0,
            10: 1.1, 11: 1.2, 12: 1.15
        },
        'okra': {
            1: 1.3, 2: 1.2, 3: 1.0,
            4: 0.9, 5: 0.8, 6: 0.8,
            7: 0.85, 8: 0.9, 9: 1.0,
            10: 1.15, 11: 1.25, 12: 1.3
        },
        'cassava': {
            1: 1.0, 2: 1.0, 3: 1.0,
            4: 1.0, 5: 0.95, 6: 0.95,
            7: 0.95, 8: 0.95, 9: 1.0,
            10: 1.0, 11: 1.0, 12: 1.0
        }
    }

    # Quality-price relationship (multiplier for quality score)
    QUALITY_PRICE_CURVE = {
        80: 1.0,    # Baseline at 80 quality
        90: 1.15,   # 15% premium for excellent
        100: 1.25,  # 25% premium for perfect
        70: 0.90,   # 10% discount for fair
        60: 0.75    # 25% discount for poor
    }

    # Freshness-price impact (% price reduction per freshness category)
    FRESHNESS_IMPACT = {
        'excellent': 1.0,
        'good': 0.95,
        'fair': 0.80,
        'expired': 0.30
    }

    def __init__(self):
        self.model_version = 'v1.0-seasonal-quality-aware'

    def forecast_price(self, crop_type: str, quality_score: float = 85.0,
                      freshness_status: str = 'good', 
                      days_ahead: int = 0) -> Dict:
        """
        Forecast market price based on seasonality, quality, and freshness.
        
        Args:
            crop_type: Type of crop
            quality_score: Quality on 0-100 scale
            freshness_status: 'excellent', 'good', 'fair', 'expired'
            days_ahead: Days in future to forecast (0 = today)
        
        Returns:
            Dictionary with price forecast
        """
        if crop_type not in self.BASE_PRICES:
            raise ValueError(f'Unsupported crop type: {crop_type}')
        
        if freshness_status not in self.FRESHNESS_IMPACT:
            raise ValueError(f'Invalid freshness status: {freshness_status}')

        # Get base price
        base_price = self.BASE_PRICES[crop_type]

        # Calculate forecast date
        forecast_date = datetime.now().date() + timedelta(days=days_ahead)
        month = forecast_date.month

        # Apply seasonal factor
        seasonal_factor = self.SEASONAL_FACTORS.get(crop_type, {}).get(month, 1.0)

        # Apply quality-based pricing
        quality_factor = self._interpolate_quality_factor(quality_score)

        # Apply freshness impact
        freshness_factor = self.FRESHNESS_IMPACT[freshness_status]

        # Calculate final price
        forecasted_price = base_price * seasonal_factor * quality_factor * freshness_factor

        # Calculate confidence (higher for shorter forecast, less volatile for stable crops)
        base_confidence = 0.85 - (days_ahead * 0.02)  # Reduce by 2% per day forecast
        base_confidence = max(0.60, min(0.90, base_confidence))

        # Add premium/discount explanations
        adjustments = {
            'seasonal': round((seasonal_factor - 1.0) * 100, 1),
            'quality': round((quality_factor - 1.0) * 100, 1),
            'freshness': round((freshness_factor - 1.0) * 100, 1)
        }

        return {
            'forecasted_price': round(forecasted_price, 2),
            'base_price': base_price,
            'seasonal_factor': round(seasonal_factor, 2),
            'quality_factor': round(quality_factor, 2),
            'freshness_factor': freshness_factor,
            'confidence': round(base_confidence, 2),
            'forecast_date': forecast_date.isoformat(),
            'days_ahead': days_ahead,
            'adjustments': adjustments,
            'model_version': self.model_version
        }

    def _interpolate_quality_factor(self, quality_score: float) -> float:
        """Interpolate quality factor from curve."""
        # Define curve points
        points = sorted(self.QUALITY_PRICE_CURVE.items())
        
        # Find bracket
        if quality_score <= points[0][0]:
            return points[0][1]
        if quality_score >= points[-1][0]:
            return points[-1][1]
        
        # Linear interpolation between points
        for i in range(len(points) - 1):
            q1, p1 = points[i]
            q2, p2 = points[i + 1]
            if q1 <= quality_score <= q2:
                # Linear interpolation
                factor = p1 + (p2 - p1) * (quality_score - q1) / (q2 - q1)
                return factor
        
        return 1.0

    def get_price_trends(self, crop_type: str, days_forecast: int = 30) -> Dict:
        """Get price trends for next N days."""
        if crop_type not in self.BASE_PRICES:
            raise ValueError(f'Unsupported crop type: {crop_type}')

        trends = []
        for day in range(0, days_forecast + 1, 7):  # Weekly snapshots
            forecast = self.forecast_price(crop_type, quality_score=85.0, days_ahead=day)
            trends.append({
                'date': forecast['forecast_date'],
                'price': forecast['forecasted_price'],
                'days_ahead': day
            })

        return {
            'crop_type': crop_type,
            'forecast_period_days': days_forecast,
            'trends': trends
        }

    def recommend_selling_time(self, crop_type: str, quality_score: float = 85.0,
                              freshness_status: str = 'good', 
                              max_days_forecast: int = 21) -> Dict:
        """Recommend optimal selling time based on price forecasts."""
        if crop_type not in self.BASE_PRICES:
            raise ValueError(f'Unsupported crop type: {crop_type}')

        best_price = 0
        best_day = 0
        
        for day in range(0, max_days_forecast + 1):
            forecast = self.forecast_price(crop_type, quality_score, freshness_status, day)
            if forecast['forecasted_price'] > best_price:
                best_price = forecast['forecasted_price']
                best_day = day

        recommend_date = datetime.now().date() + timedelta(days=best_day)

        return {
            'recommended_selling_date': recommend_date.isoformat(),
            'days_until_recommended_sale': best_day,
            'expected_price': round(best_price, 2),
            'current_price': round(self.forecast_price(crop_type, quality_score, freshness_status, 0)['forecasted_price'], 2),
            'expected_gain': round(best_price - self.forecast_price(crop_type, quality_score, freshness_status, 0)['forecasted_price'], 2)
        }
