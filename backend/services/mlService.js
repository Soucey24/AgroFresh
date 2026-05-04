import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
const ML_TIMEOUT = Number(process.env.ML_SERVICE_TIMEOUT || 30000);

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
});

export default class MLService {
  static async healthCheck() {
    try {
      const r = await mlClient.get('/api/health');
      return r.data;
    } catch (e) {
      return { status: 'unhealthy', error: e.message };
    }
  }

  static async predictHarvest(cropType, plantingDate, region = 'Ashanti') {
    try {
      const r = await mlClient.post('/api/ml/predict-harvest', {
        crop_type: cropType,
        planting_date: plantingDate,
        region
      });
      return r.data;
    } catch (e) {
      console.error('ML predictHarvest error', e.message);
      return { status: 'error', error: e.message };
    }
  }

  static async analyzeQuality(filePath, fileName, cropId = null, imageUrl = null) {
    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(filePath), fileName || 'crop-image.jpg');
      if (cropId !== null) form.append('crop_id', String(cropId));
      if (imageUrl) form.append('image_url', imageUrl);
      const r = await mlClient.post('/api/ml/analyze-quality', form, { headers: form.getHeaders() });
      return r.data;
    } catch (e) {
      console.error('ML analyzeQuality error', e.message);
      return { status: 'error', error: e.message };
    }
  }

  static async getCropTypes() {
    try {
      const r = await mlClient.get('/api/ml/crop-types');
      return r.data;
    } catch (e) {
      console.error('ML getCropTypes error', e.message);
      return { status: 'error', crops: [] };
    }
  }
}
