# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta | CC BY-NC 4.0
# ============================================


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "FORGE MCP Tool Server"
    assert body["tool_count"] == 10
    assert len(body["tools"]) == 10


def test_health_shape(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "timestamp" in body
    assert body["auth_enabled"] is False


def test_tools_listing(client):
    r = client.get("/tools")
    assert r.status_code == 200
    tools = r.json()
    assert len(tools) == 10
    names = {t["name"] for t in tools}
    assert names == {
        "read_file",
        "write_file",
        "list_directory",
        "web_search",
        "fetch_url",
        "run_code",
        "calculate",
        "query_notes",
        "get_weather",
        "analyze_csv",
    }
    # Each descriptor exposes params + required metadata
    for t in tools:
        assert isinstance(t["params"], list)
        assert isinstance(t["required"], list)
        assert t["category"] in {"files", "web", "compute", "memory", "api", "data"}


def test_mcp_schema_is_valid(client):
    r = client.get("/mcp/tools")
    assert r.status_code == 200
    payload = r.json()
    assert "tools" in payload
    for t in payload["tools"]:
        assert t["inputSchema"]["type"] == "object"
        assert "properties" in t["inputSchema"]
        assert "required" in t["inputSchema"]


def test_openapi_docs_live(client):
    # /docs and /openapi.json must be reachable for the docs artifact to be real
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200
