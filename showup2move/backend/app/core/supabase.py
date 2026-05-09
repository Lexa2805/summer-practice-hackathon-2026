import os
from functools import lru_cache
from typing import Any

from fastapi import HTTPException


@lru_cache
def get_supabase() -> Any | None:
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        return None

    from supabase import create_client

    return create_client(supabase_url, service_role_key)


def require_supabase() -> Any:
    try:
        client = get_supabase()
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Supabase client could not be initialized: {exc}",
        ) from exc

    if client is None:
        raise HTTPException(
            status_code=500,
            detail=(
                "Supabase is not configured. Set SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY in backend/.env."
            ),
        )
    return client
