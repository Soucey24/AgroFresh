import os

class Settings:
    ML_PORT = int(os.getenv('ML_PORT', 8001))
    ML_HOST = os.getenv('ML_HOST', '0.0.0.0')
    DEBUG = os.getenv('ML_DEBUG', 'False') == 'True'

    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')

    YOLOV5_MODEL = os.getenv('YOLOV5_MODEL', 'yolov5s')
    IMAGE_MAX_SIZE_MB = int(os.getenv('IMAGE_MAX_SIZE_MB', 5))
    CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.6))

    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    CACHE_TTL_SECONDS = int(os.getenv('CACHE_TTL_SECONDS', 3600))

settings = Settings()
