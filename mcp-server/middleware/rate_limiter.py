# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

"""
Simple in-memory sliding-window rate limiter.

Configurable via env:
  RATE_LIMIT_PER_MIN   - calls per minute per client (default: 120)
  RATE_LIMIT_ENABLED   - "true" / "false" (default: true)

Production note: for multi-instance deployments, back this with Redis.
"""

import os
import threading
import time
from collections import defaultdict, deque


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "on"}


WINDOW_SECONDS = 60
LIMIT_PER_WINDOW = _env_int("RATE_LIMIT_PER_MIN", 120)
ENABLED = _env_bool("RATE_LIMIT_ENABLED", True)

_lock = threading.Lock()
_buckets: dict[str, deque] = defaultdict(deque)


def check(client_id: str) -> tuple[bool, dict]:
    """
    Returns (allowed, info). Info contains remaining, limit, reset_seconds.
    """
    if not ENABLED:
        return True, {"enabled": False, "limit": LIMIT_PER_WINDOW, "remaining": LIMIT_PER_WINDOW}

    now = time.monotonic()
    cutoff = now - WINDOW_SECONDS
    with _lock:
        bucket = _buckets[client_id]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= LIMIT_PER_WINDOW:
            reset = max(0, int(WINDOW_SECONDS - (now - bucket[0])))
            return False, {
                "enabled": True,
                "limit": LIMIT_PER_WINDOW,
                "remaining": 0,
                "reset_seconds": reset,
            }

        bucket.append(now)
        return True, {
            "enabled": True,
            "limit": LIMIT_PER_WINDOW,
            "remaining": LIMIT_PER_WINDOW - len(bucket),
            "reset_seconds": WINDOW_SECONDS,
        }


def client_id_from_request(request) -> str:
    """Extract a stable client id from a Starlette/FastAPI Request."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "anonymous"
