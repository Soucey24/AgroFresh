from pydantic import BaseModel, Field
from typing import List, Optional

class ColorAnalysis(BaseModel):
    brightness: float
    saturation: float


class QualityResult(BaseModel):
    quality_score: float
    confidence: float
    defects: List[str]
    color_analysis: ColorAnalysis
    model_version: str


class HarvestRequest(BaseModel):
    crop_type: str
    planting_date: str
    region: Optional[str] = 'Ashanti'


class FreshnessRequest(BaseModel):
    crop_type: str
    harvest_date: str
    storage_condition: Optional[str] = 'room_temp'
    quality_score: Optional[float] = 85.0


class PriceRequest(BaseModel):
    crop_type: str
    quality_score: Optional[float] = 85.0
    freshness_status: Optional[str] = 'good'
    days_ahead: Optional[int] = 0


class HarvestResult(BaseModel):
    estimated_harvest: str
    confidence: float
    range: dict
    days_until: int
    model_version: str
