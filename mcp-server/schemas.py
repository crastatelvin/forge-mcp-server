# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

"""
Typed request and response models for every FORGE tool.

Using pydantic here gives us:
  - Automatic request validation with a clean 422 response.
  - FastAPI's /docs and /openapi.json become a real, interactive API reference.
  - A single source of truth that powers MCP schema export.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ---------- Requests ----------


class ReadFileRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"path": "./storage/notes.json"}})
    path: str = Field(..., description="Path inside ALLOWED_DIRS.")


class WriteFileRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"path": "./workspace/hello.txt", "content": "hello from FORGE"}
        }
    )
    path: str = Field(..., description="Target path inside ALLOWED_DIRS.")
    content: str = Field(..., description="UTF-8 file contents.")


class ListDirectoryRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"path": "./workspace"}})
    path: str = Field(".", description="Directory path inside ALLOWED_DIRS.")


class WebSearchRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"query": "Model Context Protocol", "max_results": 3}}
    )
    query: str = Field(..., min_length=1, description="Search query.")
    max_results: int = Field(5, ge=1, le=20, description="Max results to return.")


class FetchUrlRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"url": "https://example.com", "max_chars": 1000}}
    )
    url: str = Field(..., description="HTTP or HTTPS URL to fetch.")
    max_chars: int = Field(5000, ge=100, le=50_000, description="Max characters to return.")


class RunCodeRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"code": "print(sum(range(10)))"}})
    code: str = Field(..., description="Python code executed in a restricted sandbox.")


class CalculateRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"expression": "(2**10) + 42"}})
    expression: str = Field(..., description="Math expression (supports math.*).")


class QueryNotesRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={"example": {"action": "set", "key": "demo", "content": "hello"}}
    )
    action: Literal["set", "get", "list", "delete"] = Field(..., description="Operation.")
    key: str | None = Field("", description="Required for set/get/delete.")
    content: str | None = Field("", description="Required for set.")


class GetWeatherRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"city": "Bangalore"}})
    city: str = Field(..., min_length=1, description="City name.")


class AnalyzeCsvRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={"example": {"path": "./workspace/demo.csv"}})
    path: str = Field(..., description="CSV path inside ALLOWED_DIRS.")


# Registry mapping tool name -> request model. Used for typed endpoints and for
# validating the generic ``/call/{name}`` route.
REQUEST_MODELS: dict[str, type[BaseModel]] = {
    "read_file": ReadFileRequest,
    "write_file": WriteFileRequest,
    "list_directory": ListDirectoryRequest,
    "web_search": WebSearchRequest,
    "fetch_url": FetchUrlRequest,
    "run_code": RunCodeRequest,
    "calculate": CalculateRequest,
    "query_notes": QueryNotesRequest,
    "get_weather": GetWeatherRequest,
    "analyze_csv": AnalyzeCsvRequest,
}


# ---------- Responses ----------


class ToolCallResponse(BaseModel):
    tool: str
    params: dict[str, Any]
    result: dict[str, Any]
    duration_ms: float
    timestamp: str


class ToolDescriptor(BaseModel):
    name: str
    description: str
    params: list[str]
    required: list[str]
    category: str


class HealthResponse(BaseModel):
    status: str = "ok"
    timestamp: str
    auth_enabled: bool
    rate_limit_enabled: bool


class ErrorResponse(BaseModel):
    error: str


# ---------- Chat ----------


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "messages": [{"role": "user", "content": "What is 12 * 34?"}],
                "model": "claude-sonnet-4-5",
                "max_tokens": 1024,
            }
        }
    )
    messages: list[ChatMessage] = Field(..., description="Full conversation history.")
    model: str = Field("claude-sonnet-4-5", description="Anthropic model slug.")
    max_tokens: int = Field(1024, ge=64, le=4096, description="Max output tokens.")
    system: str | None = Field(
        None,
        description="Optional system prompt override.",
    )
