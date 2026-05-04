from datetime import datetime, timedelta, timezone

class HarvestPredictor:
    """Deterministic harvest predictor using typical days-to-harvest per crop."""

    # Minimal crop data; expand from ML docs
    CROP_DATA = {
        'tomato': { 'days_to_harvest': 70 },
        'lettuce': { 'days_to_harvest': 40 },
        'yam': { 'days_to_harvest': 150 },
        'maize': { 'days_to_harvest': 90 }
    }

    def __init__(self):
        self.model_version = 'v0.1-placeholder'

    def predict_harvest_date(self, crop_type: str, planting_date: str, region: str = 'Ashanti') -> dict:
        if crop_type not in self.CROP_DATA:
            raise ValueError('Unsupported crop type')

        try:
            plant = datetime.fromisoformat(planting_date).date()
        except Exception:
            raise ValueError('planting_date must be ISO format YYYY-MM-DD')

        days = int(self.CROP_DATA[crop_type]['days_to_harvest'])
        # region adjustments could be applied here
        earliest = plant + timedelta(days=int(days * 0.9))
        typical = plant + timedelta(days=days)
        latest = plant + timedelta(days=int(days * 1.1))

        days_until = (typical - datetime.now(timezone.utc).date()).days

        return {
            'estimated_harvest': typical.isoformat(),
            'predicted_days': days,
            'confidence': 0.6,
            'range': { 'earliest': earliest.isoformat(), 'latest': latest.isoformat() },
            'days_until': days_until,
            'model_version': self.model_version
        }
