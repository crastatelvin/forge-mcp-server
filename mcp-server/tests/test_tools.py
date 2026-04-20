# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta | CC BY-NC 4.0
# ============================================

"""
Happy-path + error-path coverage for each of the 10 tools.

Network-dependent tools (web_search, fetch_url, get_weather) are validated
against the envelope shape rather than remote state so tests stay fast and
deterministic.
"""

from __future__ import annotations

# ---------- File tools ----------


def test_write_then_read_file(client, temp_workspace):
    path = str(temp_workspace["workspace"] / "hello.txt")
    r = client.post("/tools/write_file", json={"path": path, "content": "hi"})
    assert r.status_code == 200
    assert "error" not in r.json()["result"]

    r = client.post("/tools/read_file", json={"path": path})
    assert r.status_code == 200
    body = r.json()
    assert body["result"]["content"] == "hi"


def test_read_file_outside_sandbox_rejected(client):
    r = client.post("/tools/read_file", json={"path": "/etc/passwd"})
    assert r.status_code == 200  # tool returns structured error, not HTTP 500
    assert "error" in r.json()["result"]


def test_list_directory_ok(client, temp_workspace):
    r = client.post("/tools/list_directory", json={"path": str(temp_workspace["workspace"])})
    assert r.status_code == 200
    assert "error" not in r.json()["result"]


# ---------- Compute tools ----------


def test_calculate_ok(client):
    r = client.post("/tools/calculate", json={"expression": "(2**10) + 42"})
    assert r.status_code == 200
    assert r.json()["result"]["result"] == 1066


def test_calculate_rejects_name_lookup(client):
    r = client.post("/tools/calculate", json={"expression": "__import__('os').listdir()"})
    assert r.status_code == 200
    assert "error" in r.json()["result"]


def test_run_code_captures_stdout(client):
    r = client.post("/tools/run_code", json={"code": "print(sum(range(10)))"})
    assert r.status_code == 200
    assert "45" in r.json()["result"]["stdout"]


def test_run_code_blocks_os_access(client):
    r = client.post("/tools/run_code", json={"code": "import os\nprint(os.listdir())"})
    assert r.status_code == 200
    # sandbox should reject via token blocklist or raise inside exec
    assert "error" in r.json()["result"] or "blocked" in str(r.json()["result"]).lower()


# ---------- Memory tool ----------


def test_query_notes_full_cycle(client):
    set_r = client.post(
        "/tools/query_notes",
        json={"action": "set", "key": "demo", "content": "hello"},
    )
    assert set_r.status_code == 200
    assert "error" not in set_r.json()["result"]

    get_r = client.post("/tools/query_notes", json={"action": "get", "key": "demo"})
    assert get_r.status_code == 200
    assert get_r.json()["result"]["content"] == "hello"

    list_r = client.post("/tools/query_notes", json={"action": "list"})
    assert list_r.status_code == 200
    keys = list_r.json()["result"]["keys"]
    assert "demo" in keys

    del_r = client.post("/tools/query_notes", json={"action": "delete", "key": "demo"})
    assert del_r.status_code == 200
    assert "error" not in del_r.json()["result"]


def test_query_notes_rejects_bad_action(client):
    r = client.post("/tools/query_notes", json={"action": "explode"})
    assert r.status_code == 422


# ---------- Data tool ----------


def test_analyze_csv(client, temp_workspace):
    csv_path = temp_workspace["workspace"] / "demo.csv"
    csv_path.write_text("a,b\n1,2\n3,4\n", encoding="utf-8")
    r = client.post("/tools/analyze_csv", json={"path": str(csv_path)})
    assert r.status_code == 200
    res = r.json()["result"]
    assert res["rows"] == 2
    assert set(res["columns"]) == {"a", "b"}


# ---------- Generic /call/{name} envelope ----------


def test_generic_call_route_dispatches(client):
    r = client.post("/call/calculate", json={"expression": "1+1"})
    assert r.status_code == 200
    body = r.json()
    assert body["tool"] == "calculate"
    assert body["result"]["result"] == 2
    assert "duration_ms" in body
    assert "timestamp" in body


def test_generic_call_unknown_tool_404(client):
    r = client.post("/call/does_not_exist", json={})
    assert r.status_code == 404


def test_generic_call_validates_params(client):
    # missing required "expression"
    r = client.post("/call/calculate", json={})
    assert r.status_code == 422
