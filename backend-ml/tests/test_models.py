import unittest
from io import BytesIO

from PIL import Image

from models.harvest_predictor import HarvestPredictor
from models.quality_model import ProduceQualityScorer
from models.freshness_calculator import FreshnessCalculator
from models.price_forecaster import PriceForecaster


class HarvestPredictorTests(unittest.TestCase):
    def setUp(self):
        self.predictor = HarvestPredictor()

    def test_predict_tomato_harvest_structure(self):
        result = self.predictor.predict_harvest_date('tomato', '2026-03-15', 'Ashanti')
        self.assertIn('estimated_harvest', result)
        self.assertIn('predicted_days', result)
        self.assertIn('confidence', result)
        self.assertIn('range', result)
        self.assertIn('regional_adjustment', result)
        self.assertEqual(result['base_days'], 70)

    def test_predict_with_regional_adjustment(self):
        result_ashanti = self.predictor.predict_harvest_date('tomato', '2026-03-15', 'Ashanti')
        result_northern = self.predictor.predict_harvest_date('tomato', '2026-03-15', 'Northern')
        self.assertGreater(result_northern['predicted_days'], result_ashanti['predicted_days'])

    def test_predict_unsupported_crop_raises(self):
        with self.assertRaises(ValueError):
            self.predictor.predict_harvest_date('unknown-crop', '2026-03-15', 'Ashanti')

    def test_crop_data_expanded(self):
        self.assertGreater(len(self.predictor.CROP_DATA), 4)
        self.assertIn('pepper', self.predictor.CROP_DATA)
        self.assertIn('cassava', self.predictor.CROP_DATA)


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
        self.assertIn('defect_penalty', result)
        self.assertGreaterEqual(result['quality_score'], 0.0)
        self.assertLessEqual(result['quality_score'], 100.0)

    def test_defect_detection_integration(self):
        good_img = Image.new('RGB', (64, 64), color=(100, 180, 80))
        good_result = self.scorer._score(good_img)
        poor_img = Image.new('RGB', (64, 64), color=(100, 100, 100))
        poor_result = self.scorer._score(poor_img)
        self.assertGreater(good_result['quality_score'], poor_result['quality_score'])

    def test_yolov5_model_version(self):
        img = Image.new('RGB', (64, 64), color=(120, 180, 90))
        result = self.scorer._score(img)
        self.assertEqual(result['model_version'], 'v1.0-yolov5')


class FreshnessCalculatorTests(unittest.TestCase):
    def setUp(self):
        self.calculator = FreshnessCalculator()

    def test_freshness_structure(self):
        result = self.calculator.calculate_freshness('tomato', '2026-04-20', 'room_temp', 85.0)
        self.assertIn('freshness_score', result)
        self.assertIn('status', result)
        self.assertIn('confidence', result)
        self.assertIn('days_since_harvest', result)
        self.assertIn('days_remaining', result)

    def test_storage_condition_impact(self):
        result_room = self.calculator.calculate_freshness('tomato', '2026-04-20', 'room_temp', 85.0)
        result_fridge = self.calculator.calculate_freshness('tomato', '2026-04-20', 'refrigerated', 85.0)
        self.assertGreater(result_fridge['freshness_score'], result_room['freshness_score'])

    def test_shelf_life_data_exists(self):
        self.assertGreater(len(self.calculator.SHELF_LIFE), 4)
        self.assertIn('cassava', self.calculator.SHELF_LIFE)

    def test_freshness_status_categories(self):
        result = self.calculator.calculate_freshness('lettuce', '2026-05-04', 'room_temp')
        self.assertIn(result['status'], ['excellent', 'good', 'fair', 'expired'])


class PriceForecasterTests(unittest.TestCase):
    def setUp(self):
        self.forecaster = PriceForecaster()

    def test_price_forecast_structure(self):
        result = self.forecaster.forecast_price('tomato', 85.0, 'good', 0)
        self.assertIn('forecasted_price', result)
        self.assertIn('base_price', result)
        self.assertIn('seasonal_factor', result)
        self.assertIn('confidence', result)
        self.assertGreater(result['forecasted_price'], 0)

    def test_quality_price_impact(self):
        result_excellent = self.forecaster.forecast_price('tomato', 100.0, 'good', 0)
        result_poor = self.forecaster.forecast_price('tomato', 60.0, 'good', 0)
        self.assertGreater(result_excellent['forecasted_price'], result_poor['forecasted_price'])

    def test_freshness_price_impact(self):
        result_excellent = self.forecaster.forecast_price('tomato', 85.0, 'excellent', 0)
        result_expired = self.forecaster.forecast_price('tomato', 85.0, 'expired', 0)
        self.assertGreater(result_excellent['forecasted_price'], result_expired['forecasted_price'])

    def test_seasonal_factors_exist(self):
        self.assertGreater(len(self.forecaster.SEASONAL_FACTORS), 4)
        for crop, months in self.forecaster.SEASONAL_FACTORS.items():
            self.assertEqual(len(months), 12)

    def test_get_price_trends(self):
        trends = self.forecaster.get_price_trends('tomato', days_forecast=21)
        self.assertIn('crop_type', trends)
        self.assertIn('trends', trends)
        self.assertGreater(len(trends['trends']), 0)

    def test_recommend_selling_time(self):
        rec = self.forecaster.recommend_selling_time('tomato', 85.0, 'good')
        self.assertIn('recommended_selling_date', rec)
        self.assertIn('expected_price', rec)
        self.assertIn('expected_gain', rec)


if __name__ == '__main__':
    unittest.main()
