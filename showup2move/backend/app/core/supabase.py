import os
from functools import lru_cache
from time import sleep
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


def _is_transient_supabase_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(
        text in message
        for text in (
            "server disconnected",
            "connection reset",
            "connection aborted",
            "remote protocol",
            "timeout",
            "temporarily unavailable",
        )
    )


def execute_supabase_read(query: Any, retries: int = 2) -> Any:
    for attempt in range(retries + 1):
        try:
            return query.execute()
        except Exception as exc:
            if attempt >= retries or not _is_transient_supabase_error(exc):
                raise
            sleep(0.2 * (attempt + 1))
