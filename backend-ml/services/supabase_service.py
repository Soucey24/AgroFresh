from supabase import create_client
from config import settings

# Initialize client at import time for reuse
_URL = settings.SUPABASE_URL
_KEY = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
if not _URL or not _KEY:
    SUPABASE = None
else:
    SUPABASE = create_client(_URL, _KEY)

def get_supabase_client():
    if SUPABASE is None:
        raise RuntimeError('Supabase credentials not configured')
    return SUPABASE
