import logging
from services.supabase_service import get_supabase_client

logger = logging.getLogger('backend-ml')

def get_db():
    """Returns initialized Supabase client instance or None if not configured."""
    try:
        return get_supabase_client()
    except Exception as e:
        logger.warning(f"Supabase client not available: {e}")
        return None
