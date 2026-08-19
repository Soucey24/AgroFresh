from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.quality_model import ProduceQualityScorer
from models.harvest_predictor import HarvestPredictor
from models.freshness_calculator import FreshnessCalculator
from models.price_forecaster import PriceForecaster
from services.groq_service import groq_crop_validator
from services.supabase_service import get_supabase_client
from schemas import HarvestRequest, FreshnessRequest, PriceRequest
from utils.logger import setup_logger
from utils.validators import build_review_decision, normalize_crop_category, validate_image_file

router = APIRouter()

logger = setup_logger('predictions')

quality_scorer = ProduceQualityScorer()
harvest_predictor = HarvestPredictor()
freshness_calculator = FreshnessCalculator()
price_forecaster = PriceForecaster()


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


@router.post('/verify-crop-photo', response_model=dict)
async def verify_crop_photo(
    image: UploadFile = File(...),
    crop_name: str | None = Form(default=None),
    crop_category: str | None = Form(default=None),
    crop_id: int | None = Form(default=None),
    image_url: str | None = Form(default=None)
):
    validate_image_file(image)
    contents = await image.read()

    try:
        validation = groq_crop_validator.validate_crop_photo(
            contents,
            image.filename or 'crop-photo.jpg',
            crop_name or '',
            crop_category or ''
        )
    except Exception as exc:
        logger.warning('Groq validator failed, using local fallback: %s', exc)
        fallback = quality_scorer.score_image_bytes(contents, filename=image.filename or 'crop-photo.jpg')
        validation = {
            'status': 'requires_review',
            'is_real_crop': bool((fallback.get('quality_score', 0) or 0) > 40),
            'confidence': float(fallback.get('confidence', 0.5) or 0.5),
            'crop_category': normalize_crop_category(crop_category),
            'quality_score': float(fallback.get('quality_score', 50) or 50),
            'requires_review': True,
            'reason': 'Groq validation unavailable; local quality fallback used for safe review.',
            'provider': 'local_fallback',
            'model': 'quality_model_v1'
        }

    decision = build_review_decision(validation)
    payload = {
        'status': 'success',
        'data': {
            **validation,
            'crop_id': crop_id,
            'image_url': image_url or 'uploaded-image',
            'crop_name': crop_name or '',
            'crop_category': normalize_crop_category(validation.get('crop_category') or crop_category),
            'decision': decision['decision'],
            'requires_review': decision['requires_review'],
            'reason': decision['reason'],
            'confidence': float(validation.get('confidence', 0.0) or 0.0),
            'quality_score': float(validation.get('quality_score', 0.0) or 0.0),
            'is_real_crop': bool(validation.get('is_real_crop', False))
        }
    }

    if crop_id is not None:
        try:
            supabase = get_supabase_client()
            supabase.table('ai_predictions').insert([{
                'crop_id': crop_id,
                'prediction_type': 'crop_photo_verification',
                'predicted_value': 1 if payload['data']['is_real_crop'] else 0,
                'confidence_score': payload['data']['confidence'],
                'reasoning': payload['data']['reason'],
                'metadata': {
                    'quality_score': payload['data']['quality_score'],
                    'crop_category': payload['data']['crop_category'],
                    'decision': payload['data']['decision'],
                    'provider': payload['data'].get('provider', 'unknown')
                },
                'model_version': payload['data'].get('model', 'unknown')
            }]).execute()
        except Exception as e:
            logger.warning('Failed to persist verification result: %s', e)

    return payload


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


@router.post('/calculate-freshness', response_model=dict)
async def calculate_freshness(request: FreshnessRequest):
    try:
        result = freshness_calculator.calculate_freshness(
            request.crop_type,
            request.harvest_date,
            request.storage_condition or 'room_temp',
            request.quality_score or 85.0
        )
        return { 'status': 'success', 'data': result }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception('Freshness calculation failed')
        raise HTTPException(status_code=500, detail='Freshness calculation failed')


@router.post('/forecast-price', response_model=dict)
async def forecast_price(request: PriceRequest):
    try:
        result = price_forecaster.forecast_price(
            request.crop_type,
            request.quality_score or 85.0,
            request.freshness_status or 'good',
            request.days_ahead or 0
        )
        return { 'status': 'success', 'data': result }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception('Price forecast failed')
        raise HTTPException(status_code=500, detail='Price forecast failed')


@router.post('/recommend-selling-time', response_model=dict)
async def recommend_selling_time(request: PriceRequest):
    try:
        result = price_forecaster.recommend_selling_time(
            request.crop_type,
            request.quality_score or 85.0,
            request.freshness_status or 'good',
            max_days_forecast=21
        )
        return { 'status': 'success', 'data': result }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception('Selling time recommendation failed')
        raise HTTPException(status_code=500, detail='Selling time recommendation failed')
