# AgroFresh ML Service

FastAPI-based ML microservice for AgroFresh.

Quick start (development):

```bash
# create virtualenv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# run service
uvicorn app:app --reload --port 8001
```

Endpoints:
- `GET /api/health` - health check
- `POST /api/ml/analyze-quality` - image quality (multipart/form-data)
- `POST /api/ml/predict-harvest` - harvest prediction (JSON)

See docs for integration notes.
