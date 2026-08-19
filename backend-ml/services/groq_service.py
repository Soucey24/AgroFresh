import base64
import json
import mimetypes
from typing import Any, Dict

import requests

from config import settings


class GroqCropValidator:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.endpoint = 'https://api.groq.com/openai/v1/chat/completions'

    def _image_data_url(self, file_bytes: bytes, filename: str) -> str:
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = 'image/jpeg'
        encoded = base64.b64encode(file_bytes).decode('utf-8')
        return f'data:{mime_type};base64,{encoded}'

    def _parse_json_from_content(self, content: Any) -> Dict[str, Any]:
        if isinstance(content, dict):
            return content

        text = str(content).strip()
        if not text:
            return {}

        if text.startswith('```'):
            text = text.replace('```json', '').replace('```', '').strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {'reason': text}

    def validate_crop_photo(self, file_bytes: bytes, filename: str, crop_name: str = '', crop_category: str = '') -> Dict[str, Any]:
        if not self.api_key:
            return {
                'status': 'requires_review',
                'is_real_crop': True,
                'confidence': 0.5,
                'crop_category': (crop_category or 'unknown').strip() or 'unknown',
                'quality_score': 50,
                'requires_review': True,
                'reason': 'Groq API key is not configured; local validation fallback was used.',
                'provider': 'local_fallback',
                'model': 'quality_model_v1'
            }

        prompt = (
            'You are validating a crop photo for an agricultural marketplace. '
            'Return JSON only. Determine whether the image is a real picture of a crop or fresh agricultural product, '
            'not a screenshot, document, random object, or non-product image. '
            'Also estimate the likely crop category and overall product quality out of 100.\n\n'
            f'Crop name hint: {crop_name or "unknown"}\n'
            f'Crop category hint: {crop_category or "unknown"}\n\n'
            'Required JSON keys: '
            '{"is_real_crop": boolean, "confidence": number, "crop_category": string, "quality_score": number, "requires_review": boolean, "reason": string}'
        )

        payload = {
            'model': self.model,
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {'type': 'image_url', 'image_url': {'url': self._image_data_url(file_bytes, filename)}}
                    ]
                }
            ],
            'temperature': 0.2,
            'max_tokens': 300
        }

        response = requests.post(
            self.endpoint,
            headers={
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            },
            json=payload,
            timeout=45
        )

        if response.status_code >= 400:
            raise ValueError(f'Groq image validation failed: {response.text}')

        body = response.json()
        content = body.get('choices', [{}])[0].get('message', {}).get('content', {})
        parsed = self._parse_json_from_content(content)

        result = {
            'status': 'valid_crop_photo',
            'is_real_crop': bool(parsed.get('is_real_crop', False)),
            'confidence': float(parsed.get('confidence', 0.0)),
            'crop_category': str(parsed.get('crop_category', crop_category or 'unknown')).lower() or 'unknown',
            'quality_score': float(parsed.get('quality_score', 50)),
            'requires_review': bool(parsed.get('requires_review', False)),
            'reason': str(parsed.get('reason', 'Crop image validation complete.')),
            'provider': 'groq',
            'model': self.model
        }

        if not result['is_real_crop']:
            result['status'] = 'not_crop'
        elif result['requires_review'] or result['confidence'] < 0.7:
            result['status'] = 'requires_review'

        return result


groq_crop_validator = GroqCropValidator()
