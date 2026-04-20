# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta | CC BY-NC 4.0
# ============================================

"""Shared fixtures. Run from repository root with:  pytest mcp-server/tests"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
SERVER_DIR = HERE.parent
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))


@pytest.fixture
def temp_workspace(tmp_path, monkeypatch):
    """
    Isolate every test behind a temporary ALLOWED_DIRS so file tools never
    touch the real workspace/storage. Also redirects the notes store to a
    temp file so note tests don't pollute the real ``storage/notes.json``.
    """
    work = tmp_path / "workspace"
    store = tmp_path / "storage"
    work.mkdir()
    store.mkdir()
    monkeypatch.setenv("ALLOWED_DIRS", f"{work},{store}")
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")

    # Redirect the hard-coded NOTES_FILE to the temp storage dir
    import tools.data_tools as data_tools

    monkeypatch.setattr(data_tools, "NOTES_FILE", str(store / "notes.json"))

    return {"workspace": work, "storage": store}


@pytest.fixture
def client(temp_workspace, monkeypatch):
    """
    FastAPI TestClient with auth disabled and a clean rate-limiter bucket. We
    reload key modules so each test sees the env vars we just set.
    """
    monkeypatch.delenv("FORGE_API_KEY", raising=False)

    # Reload modules that read env at import time.
    import importlib

    import middleware.rate_limiter as rl

    importlib.reload(rl)

    import server as server_module

    importlib.reload(server_module)

    from fastapi.testclient import TestClient

    return TestClient(server_module.app)


@pytest.fixture
def authed_client(temp_workspace, monkeypatch):
    """TestClient with FORGE_API_KEY set and the key exposed as `.api_key`."""
    monkeypatch.setenv("FORGE_API_KEY", "test-secret-key")

    import importlib

    import middleware.rate_limiter as rl

    importlib.reload(rl)
    import server as server_module

    importlib.reload(server_module)

    from fastapi.testclient import TestClient

    c = TestClient(server_module.app)
    c.api_key = "test-secret-key"  # type: ignore[attr-defined]
    return c
