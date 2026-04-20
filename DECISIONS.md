# Architecture Decisions - FORGE MCP Tool Server

**Author:** Telvin Crasta
**License:** CC BY-NC 4.0

---

## Why FastAPI over the official MCP Python SDK?

The official MCP Python SDK uses a stdio transport that is hard to demo and
impossible to visualize in a browser. FORGE implements the *protocol shape*
(tool listing + tool calling with the same JSON conventions) over HTTP/SSE
using FastAPI, plus a WebSocket feed for the live dashboard. This gives:

- One process deployable to Render/Fly/Railway
- A browser-visible `/tools` and `/mcp/tools` endpoint
- Live, streaming tool-call visibility for the dashboard
- Drop-in compatibility for MCP clients that speak the `{name, arguments}` shape
  via `/mcp/call`

## Why sandboxed `run_code`?

`run_code` strips `__builtins__`, allows only a whitelist, and rejects source
code containing tokens like `os`, `sys`, `subprocess`, `open`, `__import__`,
etc. It is a *demonstration* sandbox, not a production-grade isolate. For
untrusted input, swap it for a container (gVisor, Firecracker) or a remote
execution service. A portfolio project that allowed arbitrary OS access would
be irresponsible.

## Why `calculate` uses AST walking instead of `eval`?

`eval` with restricted globals is repeatedly bypassed in the wild. Parsing to
AST and walking an explicit allowlist (operators + `math.*` calls only) is
dramatically safer and still covers the "quick math" use case.

## Why `wttr.in` as the weather default?

Zero signup friction, no API key, structured JSON. FORGE will transparently
prefer OpenWeatherMap if `WEATHER_API_KEY` is set, so production deployments
can use a proper commercial provider with SLAs.

## Why in-memory deque + JSONL file logging?

The dashboard needs sub-millisecond reads for the live feed, which a deque
gives us. JSONL persistence lets operators grep the file, pipe it into
`jq`, or stream it to a log aggregator. A production install should ship
this to a proper store (Postgres, ClickHouse, Loki, etc.).

## Why a per-client in-memory rate limiter?

FORGE is a single-process demo. An in-memory sliding window per client IP
covers the "abuse" case without adding dependencies. For horizontally scaled
deployments this should be Redis-backed (e.g. `slowapi` + Redis).

## Why Space Grotesk + Fira Code in the dashboard?

Space Grotesk reads as clean, modern, and "developer tooling" without being
generic. Fira Code's ligatures are the de facto standard for code and data.
Together they establish the "serious infra" visual tone.

## Why does FORGE ship its own `CORS_ORIGINS` and `allow_credentials=False`?

Wildcard CORS with credentials is both insecure and rejected by browsers.
FORGE defaults to `CORS_ORIGINS=*` for local dev, disables credentials, and
operators are expected to narrow `CORS_ORIGINS` to the dashboard URL in
production.
