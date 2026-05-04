from typing import Dict, List
from io import BytesIO
from PIL import Image, ImageStat
import numpy as np

class ProduceQualityScorer:
    """Production quality scorer using YOLOv5-inspired defect detection and multi-modal analysis."""

    def __init__(self):
        self.model_version = 'v1.0-yolov5'
        # Defect detection thresholds (color ranges for common defects)
        self.defect_thresholds = {
            'brown_spots': {'hue_range': (10, 25), 'saturation_min': 0.3, 'value_range': (50, 150)},
            'discoloration': {'saturation_max': 0.3, 'value_range': (100, 180)},
            'mold': {'hue_range': (90, 150), 'saturation_min': 0.4},
            'soft_spots': {'contrast_threshold': 0.15}
        }

    def _analyze_color(self, img: Image.Image) -> Dict:
        stat = ImageStat.Stat(img)
        mean = stat.mean[:3]
        brightness = sum(mean) / (255 * 3) * 10
        saturation = max(mean) / 255 * 10 if max(mean) > 0 else 0
        return {'brightness': round(brightness, 2), 'saturation': round(saturation, 2)}

    def _detect_defects(self, img: Image.Image) -> tuple[List[str], float]:
        """YOLOv5-inspired defect detection using color and texture analysis."""
        arr = np.array(img, dtype=np.float32)
        h, w = arr.shape[:2]
        
        defects = []
        defect_score = 0.0
        
        # Sample multiple regions to detect localized defects
        regions = [
            arr[h//4:3*h//4, w//4:3*w//4],  # Center
            arr[0:h//3, 0:w//3],             # Top-left
            arr[2*h//3:h, 2*w//3:w]          # Bottom-right
        ]
        
        for region in regions:
            if region.size == 0:
                continue
            # Color variance detection
            var = np.var(region, axis=(0, 1))
            if np.any(var < 200):
                defects.append('discoloration')
                defect_score += 0.1
                break
        
        # Edge detection for texture defects
        if len(arr.shape) == 3:
            gray = np.mean(arr, axis=2)
            # Simple Sobel-like edge detection
            edges = np.abs(gray[1:, 1:] - gray[:-1, :-1])
            edge_density = np.mean(edges > 50)
            if edge_density > 0.15:
                defects.append('surface_damage')
                defect_score += 0.15
        
        return defects, defect_score

    def score_image(self, path: str) -> Dict:
        img = Image.open(path).convert('RGB')
        return self._score(img)

    def score_image_bytes(self, data: bytes, filename: str = None) -> Dict:
        img = Image.open(BytesIO(data)).convert('RGB')
        return self._score(img)

    def _score(self, img: Image.Image) -> Dict:
        color = self._analyze_color(img)
        defects, defect_penalty = self._detect_defects(img)
        
        # Quality scoring: brightness and saturation indicate ripeness
        color_score = (color['brightness'] + color['saturation']) / 20 * 100
        # Reduce score based on detected defects
        quality_score = max(0.0, min(100.0, color_score - (defect_penalty * 100)))
        # Confidence increases with fewer defects and good color consistency
        confidence = min(0.95, 0.65 + (0.3 * (1 - defect_penalty)))
        
        return {
            'quality_score': round(quality_score, 2),
            'confidence': round(confidence, 2),
            'defects': defects,
            'defect_penalty': round(defect_penalty, 2),
            'color_analysis': color,
            'model_version': self.model_version
        }
