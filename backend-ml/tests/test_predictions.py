import unittest
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from app import app

class FastAPIEndpointsTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})

    def test_crop_types_endpoint(self):
        response = self.client.get('/api/ml/crop-types')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('crops', data)
        self.assertIn('tomato', data['crops'])

    def test_predict_harvest_endpoint(self):
        payload = {
            'crop_type': 'tomato',
            'planting_date': '2026-03-15',
            'region': 'Ashanti'
        }
        response = self.client.post('/api/ml/predict-harvest', json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'success')
        self.assertIn('estimated_harvest', body['data'])

    def test_calculate_freshness_endpoint(self):
        payload = {
            'crop_type': 'lettuce',
            'harvest_date': '2026-05-01',
            'storage_condition': 'refrigerated',
            'quality_score': 90.0
        }
        response = self.client.post('/api/ml/calculate-freshness', json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'success')
        self.assertIn('freshness_score', body['data'])

    def test_forecast_price_endpoint(self):
        payload = {
            'crop_type': 'yam',
            'quality_score': 88.0,
            'freshness_status': 'good',
            'days_ahead': 7
        }
        response = self.client.post('/api/ml/forecast-price', json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'success')
        self.assertIn('forecasted_price', body['data'])

    def test_recommend_selling_time_endpoint(self):
        payload = {
            'crop_type': 'pepper',
            'quality_score': 85.0,
            'freshness_status': 'good'
        }
        response = self.client.post('/api/ml/recommend-selling-time', json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'success')
        self.assertIn('recommended_selling_date', body['data'])

    def test_analyze_quality_endpoint(self):
        img = Image.new('RGB', (100, 100), color=(150, 200, 100))
        buf = BytesIO()
        img.save(buf, format='JPEG')
        buf.seek(0)

        response = self.client.post(
            '/api/ml/analyze-quality',
            files={'image': ('test.jpg', buf, 'image/jpeg')}
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body['status'], 'success')
        self.assertIn('quality_score', body['data'])

if __name__ == '__main__':
    unittest.main()
