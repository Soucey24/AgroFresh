import unittest
from io import BytesIO

from PIL import Image

from models.harvest_predictor import HarvestPredictor
from models.quality_model import ProduceQualityScorer


class HarvestPredictorTests(unittest.TestCase):
    def setUp(self):
        self.predictor = HarvestPredictor()

    def test_predict_tomato_harvest_structure(self):
        result = self.predictor.predict_harvest_date('tomato', '2026-03-15', 'Ashanti')
        self.assertIn('estimated_harvest', result)
        self.assertIn('predicted_days', result)
        self.assertIn('confidence', result)
        self.assertIn('range', result)
        self.assertEqual(result['predicted_days'], 70)

    def test_predict_unsupported_crop_raises(self):
        with self.assertRaises(ValueError):
            self.predictor.predict_harvest_date('unknown-crop', '2026-03-15', 'Ashanti')


class QualityScorerTests(unittest.TestCase):
    def setUp(self):
        self.scorer = ProduceQualityScorer()

    def test_score_image_bytes_structure(self):
        img = Image.new('RGB', (64, 64), color=(120, 180, 90))
        buf = BytesIO()
        img.save(buf, format='PNG')
        payload = buf.getvalue()

        result = self.scorer.score_image_bytes(payload, filename='sample.png')
        self.assertIn('quality_score', result)
        self.assertIn('confidence', result)
        self.assertIn('color_analysis', result)
        self.assertGreaterEqual(result['quality_score'], 0.0)
        self.assertLessEqual(result['quality_score'], 100.0)


if __name__ == '__main__':
    unittest.main()
