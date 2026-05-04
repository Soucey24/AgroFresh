from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from models.quality_model import ProduceQualityScorer
from models.harvest_predictor import HarvestPredictor
from services.supabase_service import get_supabase_client
from schemas import QualityResult, HarvestRequest, HarvestResult
from utils.logger import setup_logger
from utils.validators import validate_image_file
import tempfile
import os

router = APIRouter()

logger = setup_logger('predictions')

quality_scorer = ProduceQualityScorer()
harvest_predictor = HarvestPredictor()


@router.post('/analyze-quality', response_model=dict)
async def analyze_quality(image: UploadFile = File(...)):
    validate_image_file(image)
    contents = await image.read()
    try:
        result = quality_scorer.score_image_bytes(contents, filename=image.filename)

        # persist analysis to Supabase if configured
        try:
            supabase = get_supabase_client()
            record = {
                'quality_score': result['quality_score'],
                'confidence_score': result.get('confidence', None),
                'detected_defects': result.get('defects', []),
                'color_brightness': result['color_analysis']['brightness'],
                'color_saturation': result['color_analysis']['saturation'],
                'analyzed_at': None
            }
            # Use insert via supabase.table and execute
            supabase.table('image_analysis').insert([record]).execute()
        except Exception as e:
            logger.warning('Failed to persist image analysis: %s', e)

        return { 'status': 'success', 'data': result }
    except Exception as e:
        logger.exception('Quality analysis failed')
        raise HTTPException(status_code=500, detail='Quality analysis failed')


@router.post('/predict-harvest', response_model=dict)
async def predict_harvest(crop_type: str = Form(...), planting_date: str = Form(...), region: str = Form('Ashanti')):
    try:
        result = harvest_predictor.predict_harvest_date(crop_type, planting_date, region)

        # persist prediction
        try:
            supabase = get_supabase_client()
            supabase.table('ai_predictions').insert([{
                'prediction_type': 'harvest_timing',
                'predicted_value': result['estimated_harvest'],
                'confidence_score': result.get('confidence'),
                'metadata': { 'range': result.get('range'), 'days_until': result.get('days_until') },
                'generated_at': None
            }]).execute()
        except Exception as e:
            logger.warning('Failed to persist harvest prediction: %s', e)

        return { 'status': 'success', 'data': result }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception('Harvest prediction failed')
        raise HTTPException(status_code=500, detail='Harvest prediction failed')


@router.get('/crop-types')
async def crop_types():
    return { 'crops': list(harvest_predictor.CROP_DATA.keys()) }
