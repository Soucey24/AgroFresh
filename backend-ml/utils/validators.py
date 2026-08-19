from pathlib import Path

from fastapi import UploadFile, HTTPException

ALLOWED_TYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'image/pjpeg', 'image/x-png',
    'application/octet-stream'
}

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'}


def validate_image_file(file: UploadFile):
    content_type = (file.content_type or '').lower()
    filename = (file.filename or '').lower()
    extension = Path(filename).suffix.lower()

    if content_type in ALLOWED_TYPES:
        return True

    if extension in ALLOWED_EXTENSIONS:
        return True

    if not content_type and extension:
        return True

    raise HTTPException(status_code=400, detail='Unsupported file type')


def normalize_crop_category(category: str | None) -> str:
    if not category:
        return 'unknown'
    cleaned = category.strip().lower().replace('_', ' ')
    return cleaned or 'unknown'


def build_review_decision(validation: dict) -> dict:
    confidence = float(validation.get('confidence', 0.0) or 0.0)
    is_real_crop = bool(validation.get('is_real_crop', False))
    requires_review = bool(validation.get('requires_review', False))

    if not is_real_crop or confidence < 0.6:
        return {
            'decision': 'reject',
            'requires_review': True,
            'reason': validation.get('reason', 'Image does not appear to be a real crop product.')
        }

    if requires_review or confidence < 0.8:
        return {
            'decision': 'review',
            'requires_review': True,
            'reason': validation.get('reason', 'The crop image needs manual review before approval.')
        }

    return {
        'decision': 'approve',
        'requires_review': False,
        'reason': validation.get('reason', 'Crop photo validation passed.')
    }
