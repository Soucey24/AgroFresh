from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.quality_model import ProduceQualityScorer
from models.harvest_predictor import HarvestPredictor
from services.supabase_service import get_supabase_client
from schemas import HarvestRequest
from utils.logger import setup_logger
from utils.validators import validate_image_file

router = APIRouter()

logger = setup_logger('predictions')

quality_scorer = ProduceQualityScorer()
harvest_predictor = HarvestPredictor()


@router.post('/analyze-quality', response_model=dict)
async def analyze_quality(
    image: UploadFile = File(...),
    crop_id: int | None = Form(default=None),
    image_url: str | None = Form(default=None)
):
    validate_image_file(image)
    contents = await image.read()
    try:
        result = quality_scorer.score_image_bytes(contents, filename=image.filename)

        if crop_id is not None:
            try:
                supabase = get_supabase_client()
                record = {
                    'crop_id': crop_id,
                    'image_url': image_url or 'uploaded-image',
                    'quality_score': result['quality_score'],
                    'confidence_score': result.get('confidence', None),
                    'detected_defects': result.get('defects', []),
                    'color_brightness': result['color_analysis']['brightness'],
                    'color_saturation': result['color_analysis']['saturation']
                }
                supabase.table('image_analysis').insert([record]).execute()
            except Exception as e:
                logger.warning('Failed to persist image analysis: %s', e)

        return { 'status': 'success', 'data': result }
    except Exception as e:
        logger.exception('Quality analysis failed')
        raise HTTPException(status_code=500, detail='Quality analysis failed')


@router.post('/predict-harvest', response_model=dict)
async def predict_harvest(request: HarvestRequest):
    try:
        result = harvest_predictor.predict_harvest_date(
            request.crop_type,
            request.planting_date,
            request.region or 'Ashanti'
        )

        return { 'status': 'success', 'data': result }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception('Harvest prediction failed')
        raise HTTPException(status_code=500, detail='Harvest prediction failed')


@router.get('/crop-types')
async def crop_types():
    return { 'crops': list(harvest_predictor.CROP_DATA.keys()) }
