# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

"""
Optional bearer-token authentication.

Set FORGE_API_KEY in the environment to enable. When unset, the server runs in
open mode (useful for local development). When set, every request must include
    Authorization: Bearer <key>

Public paths (health, root, static OpenAPI docs, WebSocket) are always exempt so
monitoring and MCP discovery still work.
"""

from __future__ import annotations

import os
from collections.abc import Iterable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

PUBLIC_PREFIXES: tuple[str, ...] = (
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon",
)

PUBLIC_EXACT: frozenset[str] = frozenset({"/"})


def get_api_key() -> str | None:
    key = os.getenv("FORGE_API_KEY", "").strip()
    return key or None


def is_public_path(path: str, extra_public: Iterable[str] = ()) -> bool:
    if path in PUBLIC_EXACT:
        return True
    for prefix in PUBLIC_PREFIXES:
        if path.startswith(prefix):
            return True
    for prefix in extra_public:
        if path.startswith(prefix):
            return True
    return False


def extract_bearer(request: Request) -> str | None:
    """Bearer from Authorization header, or ?api_key= for WS/browser convenience."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(None, 1)[1].strip() or None
    qp = request.query_params.get("api_key")
    return qp.strip() if qp else None


class BearerAuthMiddleware(BaseHTTPMiddleware):
    """
    Validates Authorization: Bearer <key> against FORGE_API_KEY.

    Disabled when FORGE_API_KEY is unset. WebSocket upgrades are not covered by
    HTTP middleware in Starlette; handle those in the WS handler via
    ``extract_bearer``.
    """

    def __init__(self, app, extra_public: Iterable[str] = ()):  # type: ignore[no-untyped-def]
        super().__init__(app)
        self.extra_public = tuple(extra_public)

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        expected = get_api_key()
        if expected is None:
            return await call_next(request)

        if is_public_path(request.url.path, self.extra_public):
            return await call_next(request)

        presented = extract_bearer(request)
        if presented is None:
            return JSONResponse(
                status_code=401,
                content={"error": "Missing bearer token"},
                headers={"WWW-Authenticate": 'Bearer realm="forge"'},
            )
        if presented != expected:
            return JSONResponse(
                status_code=403,
                content={"error": "Invalid API key"},
            )

        return await call_next(request)
