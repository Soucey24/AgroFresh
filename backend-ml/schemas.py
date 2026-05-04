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


class HarvestResult(BaseModel):
    estimated_harvest: str
    confidence: float
    range: dict
    days_until: int
    model_version: str
