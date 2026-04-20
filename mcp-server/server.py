# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from middleware import rate_limiter
from middleware.auth import BearerAuthMiddleware, extract_bearer, get_api_key
from middleware.logger import get_recent_calls, get_stats, log_call
from schemas import (
    REQUEST_MODELS,
    AnalyzeCsvRequest,
    CalculateRequest,
    ChatRequest,
    ErrorResponse,
    FetchUrlRequest,
    GetWeatherRequest,
    HealthResponse,
    ListDirectoryRequest,
    QueryNotesRequest,
    ReadFileRequest,
    RunCodeRequest,
    ToolCallResponse,
    ToolDescriptor,
    WebSearchRequest,
    WriteFileRequest,
)
from tools.api_tools import get_weather
from tools.compute_tools import calculate, run_code
from tools.data_tools import analyze_csv, query_notes
from tools.file_tools import list_directory, read_file, write_file
from tools.web_tools import fetch_url, web_search

load_dotenv()

app = FastAPI(
    title="FORGE MCP Tool Server",
    version="1.1",
    description=(
        "Universal MCP Tool Server exposing 10 typed tools over HTTP + WebSocket. "
        "Author: Telvin Crasta. License: CC BY-NC 4.0."
    ),
)


def _allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "*").strip()
    if raw == "*" or not raw:
        return ["*"]
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Bearer auth is only active when FORGE_API_KEY is set.
app.add_middleware(BearerAuthMiddleware)


# ---------- WebSocket registry ----------

connections: list[WebSocket] = []


async def broadcast(data: dict) -> None:
    payload = json.dumps(data, default=str)
    for ws in list(connections):
        try:
            await ws.send_text(payload)
        except Exception:
            try:
                connections.remove(ws)
            except ValueError:
                pass


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    # WS is outside HTTP middleware; enforce auth here if a key is configured.
    expected = get_api_key()
    if expected is not None:
        presented = extract_bearer(websocket)  # type: ignore[arg-type]
        if presented != expected:
            await websocket.close(code=4401)
            return

    await websocket.accept()
    connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if websocket in connections:
            connections.remove(websocket)


# ---------- Tool registry ----------

TOOL_REGISTRY: dict[str, dict[str, Any]] = {
    "read_file": {
        "fn": lambda p: read_file(p["path"]),
        "description": "Read file contents from the filesystem (sandboxed to ALLOWED_DIRS).",
        "category": "files",
    },
    "write_file": {
        "fn": lambda p: write_file(p["path"], p["content"]),
        "description": "Write content to a file (sandboxed to ALLOWED_DIRS).",
        "category": "files",
    },
    "list_directory": {
        "fn": lambda p: list_directory(p.get("path", ".")),
        "description": "List files and folders in a directory.",
        "category": "files",
    },
    "web_search": {
        "fn": lambda p: web_search(p["query"], p.get("max_results", 5)),
        "description": "Search the web using DuckDuckGo.",
        "category": "web",
    },
    "fetch_url": {
        "fn": lambda p: fetch_url(p["url"], p.get("max_chars", 5000)),
        "description": "Fetch and extract text content from a URL.",
        "category": "web",
    },
    "run_code": {
        "fn": lambda p: run_code(p["code"]),
        "description": "Execute Python code in a restricted sandbox (no I/O, no network).",
        "category": "compute",
    },
    "calculate": {
        "fn": lambda p: calculate(p["expression"]),
        "description": "Safely evaluate a mathematical expression (supports math.* functions).",
        "category": "compute",
    },
    "query_notes": {
        "fn": lambda p: query_notes(p["action"], p.get("key", ""), p.get("content", "")),
        "description": "Store and retrieve persistent notes. Actions: set, get, list, delete.",
        "category": "memory",
    },
    "get_weather": {
        "fn": lambda p: get_weather(p["city"]),
        "description": "Get current weather for any city.",
        "category": "api",
    },
    "analyze_csv": {
        "fn": lambda p: analyze_csv(p["path"]),
        "description": "Load and analyze a CSV file (shape, columns, numeric stats, sample).",
        "category": "data",
    },
}


def _params_and_required(model_cls) -> tuple[list[str], list[str]]:
    """Extract ordered param names and required names from a pydantic model."""
    fields = model_cls.model_fields
    params = list(fields.keys())
    required = [name for name, f in fields.items() if f.is_required()]
    return params, required


def _json_schema(model_cls) -> dict:
    """Return a schema dict suitable for the MCP inputSchema slot."""
    schema = model_cls.model_json_schema()
    # MCP expects {type, properties, required}. Strip extras that clients may choke on.
    keep = {k: v for k, v in schema.items() if k in {"type", "properties", "required"}}
    keep.setdefault("type", "object")
    keep.setdefault("properties", {})
    keep.setdefault("required", [])
    return keep


# ---------- Dispatch ----------


async def _dispatch(tool_name: str, validated_params: dict) -> dict:
    """Run tool, log + broadcast result, and return a response envelope."""
    start = time.time()
    try:
        result = TOOL_REGISTRY[tool_name]["fn"](validated_params)
    except Exception as e:
        result = {"error": str(e)}
    duration_ms = (time.time() - start) * 1000
    entry = log_call(tool_name, validated_params, result, duration_ms)
    await broadcast({"event": "tool_call", "call": entry})
    return {
        "tool": tool_name,
        "params": validated_params,
        "result": result,
        "duration_ms": round(duration_ms, 2),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _rate_limit_response(info: dict) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "limit_per_minute": info.get("limit"),
            "retry_after_seconds": info.get("reset_seconds"),
        },
        headers={"Retry-After": str(info.get("reset_seconds", 60))},
    )


def _enforce_rate_limit(request: Request) -> JSONResponse | None:
    client_id = rate_limiter.client_id_from_request(request)
    allowed, info = rate_limiter.check(client_id)
    if not allowed:
        return _rate_limit_response(info)
    return None


# ---------- Meta endpoints ----------


@app.get("/", tags=["meta"])
def root():
    return {
        "name": "FORGE MCP Tool Server",
        "version": "1.1",
        "author": "Telvin Crasta",
        "license": "CC BY-NC 4.0",
        "tools": list(TOOL_REGISTRY.keys()),
        "tool_count": len(TOOL_REGISTRY),
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["meta"])
def health():
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc).isoformat(),
        auth_enabled=get_api_key() is not None,
        rate_limit_enabled=rate_limiter.ENABLED,
    )


@app.get("/tools", response_model=list[ToolDescriptor], tags=["meta"])
def get_tools():
    out: list[ToolDescriptor] = []
    for name, info in TOOL_REGISTRY.items():
        model = REQUEST_MODELS[name]
        params, required = _params_and_required(model)
        out.append(
            ToolDescriptor(
                name=name,
                description=info["description"],
                params=params,
                required=required,
                category=info["category"],
            )
        )
    return out


@app.get("/calls", tags=["meta"])
def calls(limit: int = 50):
    return JSONResponse(get_recent_calls(limit))


@app.get("/stats", tags=["meta"])
def stats():
    return JSONResponse(get_stats())


# ---------- Typed per-tool endpoints ----------


@app.post(
    "/tools/read_file",
    response_model=ToolCallResponse,
    responses={429: {"model": ErrorResponse}, 401: {"model": ErrorResponse}},
    tags=["tools"],
)
async def t_read_file(body: ReadFileRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("read_file", body.model_dump())


@app.post("/tools/write_file", response_model=ToolCallResponse, tags=["tools"])
async def t_write_file(body: WriteFileRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("write_file", body.model_dump())


@app.post("/tools/list_directory", response_model=ToolCallResponse, tags=["tools"])
async def t_list_directory(body: ListDirectoryRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("list_directory", body.model_dump())


@app.post("/tools/web_search", response_model=ToolCallResponse, tags=["tools"])
async def t_web_search(body: WebSearchRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("web_search", body.model_dump())


@app.post("/tools/fetch_url", response_model=ToolCallResponse, tags=["tools"])
async def t_fetch_url(body: FetchUrlRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("fetch_url", body.model_dump())


@app.post("/tools/run_code", response_model=ToolCallResponse, tags=["tools"])
async def t_run_code(body: RunCodeRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("run_code", body.model_dump())


@app.post("/tools/calculate", response_model=ToolCallResponse, tags=["tools"])
async def t_calculate(body: CalculateRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("calculate", body.model_dump())


@app.post("/tools/query_notes", response_model=ToolCallResponse, tags=["tools"])
async def t_query_notes(body: QueryNotesRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("query_notes", body.model_dump())


@app.post("/tools/get_weather", response_model=ToolCallResponse, tags=["tools"])
async def t_get_weather(body: GetWeatherRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("get_weather", body.model_dump())


@app.post("/tools/analyze_csv", response_model=ToolCallResponse, tags=["tools"])
async def t_analyze_csv(body: AnalyzeCsvRequest, request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl
    return await _dispatch("analyze_csv", body.model_dump())


# ---------- Generic + MCP-compat endpoints ----------


@app.post("/call/{tool_name}", tags=["mcp"])
async def call_tool(tool_name: str, request: Request):
    """Generic tool call used by the dashboard and Claude's tool loop."""
    if tool_name not in TOOL_REGISTRY:
        return JSONResponse(status_code=404, content={"error": f"Tool '{tool_name}' not found"})

    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl

    try:
        raw = await request.json()
    except Exception:
        raw = {}
    if not isinstance(raw, dict):
        raw = {}

    model = REQUEST_MODELS[tool_name]
    try:
        validated = model.model_validate(raw).model_dump()
    except Exception as e:
        return JSONResponse(status_code=422, content={"error": f"Invalid params: {e}"})

    return JSONResponse(await _dispatch(tool_name, validated))


@app.get("/mcp/tools", tags=["mcp"])
def mcp_list_tools():
    return {
        "tools": [
            {
                "name": name,
                "description": info["description"],
                "inputSchema": _json_schema(REQUEST_MODELS[name]),
            }
            for name, info in TOOL_REGISTRY.items()
        ]
    }


@app.post("/mcp/call", tags=["mcp"])
async def mcp_call_tool(request: Request):
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl

    try:
        body = await request.json()
    except Exception:
        body = {}

    tool_name = body.get("name")
    params = body.get("arguments", {}) or {}

    if not tool_name or tool_name not in TOOL_REGISTRY:
        return JSONResponse(status_code=404, content={"error": f"Tool not found: {tool_name}"})
    if not isinstance(params, dict):
        params = {}

    model = REQUEST_MODELS[tool_name]
    try:
        validated = model.model_validate(params).model_dump()
    except Exception as e:
        return JSONResponse(status_code=422, content={"error": f"Invalid params: {e}"})

    envelope = await _dispatch(tool_name, validated)
    return {
        "content": [
            {"type": "text", "text": json.dumps(envelope["result"], indent=2, default=str)}
        ],
        "isError": "error" in envelope["result"],
    }


# ---------- Claude chat (SSE, server-proxied) ----------

DEFAULT_SYSTEM_PROMPT = (
    "You are FORGE's assistant. You have access to 10 tools for filesystem, web, "
    "compute, memory, weather, and CSV tasks. Use them whenever they improve the "
    "answer. Prefer concise, useful responses."
)


def _anthropic_tool_specs() -> list[dict]:
    """Translate FORGE tools into Anthropic's tool-use schema."""
    return [
        {
            "name": name,
            "description": info["description"],
            "input_schema": _json_schema(REQUEST_MODELS[name]),
        }
        for name, info in TOOL_REGISTRY.items()
    ]


def _sse(event: str, data: dict | str) -> bytes:
    if isinstance(data, dict):
        data = json.dumps(data, default=str)
    return f"event: {event}\ndata: {data}\n\n".encode()


@app.post("/chat", tags=["chat"])
async def chat(req: ChatRequest, request: Request):
    """
    Runs Claude's tool-use loop server-side and streams progress as SSE.

    Requires the environment variable ANTHROPIC_API_KEY to be set. The browser
    never sees the key. Stream events:

        event: message  - assistant text delta (data.text)
        event: tool_use - a tool was invoked (data.name, data.input)
        event: tool_result - result returned to Claude (data.name, data.output)
        event: done     - final message object
        event: error    - error envelope
    """
    rl = _enforce_rate_limit(request)
    if rl is not None:
        return rl

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY is not configured on the server.",
        )

    try:
        from anthropic import Anthropic  # type: ignore
    except ImportError as err:  # pragma: no cover
        raise HTTPException(
            status_code=503,
            detail="anthropic SDK is not installed on the server.",
        ) from err

    client = Anthropic(api_key=api_key)
    tool_specs = _anthropic_tool_specs()
    messages = [m.model_dump() for m in req.messages]
    system = req.system or DEFAULT_SYSTEM_PROMPT

    async def stream():
        try:
            for _ in range(8):  # cap tool-use loops to 8 iterations
                resp = client.messages.create(
                    model=req.model,
                    max_tokens=req.max_tokens,
                    system=system,
                    tools=tool_specs,
                    messages=messages,
                )

                # Emit text pieces from this turn.
                for block in resp.content:
                    btype = getattr(block, "type", None)
                    if btype == "text":
                        yield _sse("message", {"text": block.text})
                    elif btype == "tool_use":
                        tool_name = block.name
                        tool_input = block.input or {}
                        yield _sse("tool_use", {"name": tool_name, "input": tool_input})

                        # Validate + execute the tool.
                        if tool_name in REQUEST_MODELS:
                            try:
                                validated = (
                                    REQUEST_MODELS[tool_name]
                                    .model_validate(tool_input)
                                    .model_dump()
                                )
                                envelope = await _dispatch(tool_name, validated)
                                tool_output = envelope["result"]
                            except Exception as e:
                                tool_output = {"error": str(e)}
                        else:
                            tool_output = {"error": f"Unknown tool: {tool_name}"}

                        yield _sse(
                            "tool_result",
                            {"name": tool_name, "output": tool_output},
                        )

                        # Append assistant tool_use + user tool_result back to the conversation.
                        assistant_blocks = []
                        for b in resp.content:
                            try:
                                assistant_blocks.append(b.model_dump())
                            except AttributeError:
                                assistant_blocks.append(b)
                        messages.append({"role": "assistant", "content": assistant_blocks})
                        messages.append(
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "tool_result",
                                        "tool_use_id": block.id,
                                        "content": json.dumps(tool_output, default=str),
                                    }
                                ],
                            }
                        )
                        break  # re-enter the loop so Claude can continue
                else:
                    # No tool_use in this turn: model is done.
                    yield _sse(
                        "done",
                        {
                            "stop_reason": resp.stop_reason,
                            "input_tokens": resp.usage.input_tokens,
                            "output_tokens": resp.usage.output_tokens,
                        },
                    )
                    return

                if resp.stop_reason != "tool_use":
                    yield _sse(
                        "done",
                        {
                            "stop_reason": resp.stop_reason,
                            "input_tokens": resp.usage.input_tokens,
                            "output_tokens": resp.usage.output_tokens,
                        },
                    )
                    return
        except Exception as e:
            yield _sse("error", {"error": str(e)})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
