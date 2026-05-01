"""
utils/supabase_client.py — Supabase connection singleton
"""

from supabase import create_client, Client
from config import settings
import functools


@functools.lru_cache(maxsize=1)
def get_supabase() -> Client:
    """
    Return a cached Supabase client instance.

    Uses lru_cache so only one connection is created per process.

    Raises:
        ValueError: If SUPABASE_URL or SUPABASE_KEY are not configured.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY must be set in environment variables. "
            "Check your .env file."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


# Convenience alias
supabase: Client = None  # Lazy-loaded on first use


def get_db() -> Client:
    """FastAPI dependency to get Supabase client."""
    return get_supabase()
