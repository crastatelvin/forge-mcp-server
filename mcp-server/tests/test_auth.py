# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta | CC BY-NC 4.0
# ============================================


def test_auth_disabled_open_access(client):
    """With FORGE_API_KEY unset, every route should be accessible."""
    r = client.post("/tools/calculate", json={"expression": "1+1"})
    assert r.status_code == 200


def test_health_reports_auth_state(authed_client):
    r = authed_client.get("/health")
    assert r.status_code == 200
    assert r.json()["auth_enabled"] is True


def test_missing_bearer_401(authed_client):
    r = authed_client.post("/tools/calculate", json={"expression": "1+1"})
    assert r.status_code == 401
    assert "bearer" in r.json()["error"].lower()


def test_wrong_bearer_403(authed_client):
    r = authed_client.post(
        "/tools/calculate",
        json={"expression": "1+1"},
        headers={"Authorization": "Bearer wrong-key"},
    )
    assert r.status_code == 403


def test_correct_bearer_200(authed_client):
    r = authed_client.post(
        "/tools/calculate",
        json={"expression": "1+1"},
        headers={"Authorization": f"Bearer {authed_client.api_key}"},
    )
    assert r.status_code == 200
    assert r.json()["result"]["result"] == 2


def test_health_is_always_public(authed_client):
    """Health and root must be unauthenticated so monitoring probes work."""
    assert authed_client.get("/health").status_code == 200
    assert authed_client.get("/").status_code == 200


def test_docs_public_even_with_auth(authed_client):
    """OpenAPI docs must remain reachable — they expose no secrets."""
    assert authed_client.get("/openapi.json").status_code == 200
    assert authed_client.get("/docs").status_code == 200


def test_cors_preflight_bypasses_auth(authed_client):
    """
    Browsers never attach Authorization to OPTIONS preflights. The auth
    middleware must let OPTIONS through so CORS can respond; otherwise the
    browser blocks the real authed request.
    """
    r = authed_client.options(
        "/tools",
        headers={
            "Origin": "https://forge-mcp-server.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    # With auth-skip in place, OPTIONS reaches CORS middleware which answers 200.
    assert r.status_code == 200, (
        f"OPTIONS preflight must not require auth (got {r.status_code})"
    )
