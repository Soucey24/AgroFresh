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

## Training data helpers

Use the scripts below to build real datasets for future trained models:

```bash
python scripts/download_faostat.py --out-dir data/faostat
python scripts/fetch_openmeteo_weather.py --latitude 5.6037 --longitude -0.1870 --start-date 2025-01-01 --end-date 2025-03-31 --output data/weather/accra_q1_2025.csv
python scripts/prepare_freshness_dataset.py --crops-csv data/crops_export.csv --output data/training/freshness_training.csv
python train_freshness_model.py --input data/training/freshness_training.csv --target auto
```

Windows (cmd) examples using the `py` launcher:

```cmd
py -3 scripts\download_faostat.py --out-dir data\raw\faostat
py -3 scripts\prepare_freshness_dataset.py --crops-csv data\crops_export.csv --output data\training\freshness_training.csv
py -3 train_freshness_model.py --input data\training\freshness_training.csv --target auto
```

Or use the provided wrapper:

```cmd
download_data.cmd
```

Suggested public sources:
- FAOSTAT crop production history for Ghana and neighboring markets
- Open-Meteo archive weather for temperature, rain, humidity, and wind
- Kaggle or Roboflow image datasets for produce quality classification
