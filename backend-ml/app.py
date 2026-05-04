from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from utils.logger import setup_logger

load_dotenv()

logger = setup_logger('backend-ml')

app = FastAPI(title='AgroFresh ML Service', version='1.0.0')

origins = os.getenv('CORS_ORIGINS', 'http://localhost:4000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes import health, predictions  # local imports

app.include_router(health.router, prefix='/api', tags=['health'])
app.include_router(predictions.router, prefix='/api/ml', tags=['predictions'])


@app.on_event('startup')
async def startup_event():
    logger.info('ML service starting up')


@app.on_event('shutdown')
async def shutdown_event():
    logger.info('ML service shutting down')


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('ML_PORT', 8001))
    host = os.getenv('ML_HOST', '0.0.0.0')
    debug = os.getenv('ML_DEBUG', 'False') == 'True'
    uvicorn.run('app:app', host=host, port=port, reload=debug)
