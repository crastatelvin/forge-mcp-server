# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta | CC BY-NC 4.0
# ============================================

import importlib


def _reload_with_limit(monkeypatch, limit: int):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_PER_MIN", str(limit))
    import middleware.rate_limiter as rl

    importlib.reload(rl)
    import server as server_module

    importlib.reload(server_module)
    from fastapi.testclient import TestClient

    return TestClient(server_module.app)


def test_rate_limit_trips_after_n_requests(temp_workspace, monkeypatch):
    c = _reload_with_limit(monkeypatch, limit=3)
    for _ in range(3):
        r = c.post("/tools/calculate", json={"expression": "1+1"})
        assert r.status_code == 200

    trip = c.post("/tools/calculate", json={"expression": "1+1"})
    assert trip.status_code == 429
    body = trip.json()
    assert body["error"] == "Rate limit exceeded"
    assert body["limit_per_minute"] == 3
    assert "Retry-After" in trip.headers


def test_rate_limit_disabled_unlimited(temp_workspace, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    import middleware.rate_limiter as rl

    importlib.reload(rl)
    import server as server_module

    importlib.reload(server_module)
    from fastapi.testclient import TestClient

    c = TestClient(server_module.app)

    for _ in range(25):
        assert c.post("/tools/calculate", json={"expression": "1+1"}).status_code == 200
