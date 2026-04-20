# FORGE - Universal MCP Tool Server

> Production-grade custom MCP (Model Context Protocol) Tool Server with a live
> React monitoring dashboard. One connection, ten tools, full visibility.

**Author:** Telvin Crasta · **License:** CC BY-NC 4.0 · **Status:** Production-ready

---

## What is FORGE?

FORGE is a custom MCP server - Anthropic's open protocol for giving AI models
access to external tools. Claude (and any MCP-compatible client) connects once
and gets:

| # | Tool | What it does | Category |
|---|------|--------------|----------|
| 1 | `read_file` | Read any file (sandboxed to `ALLOWED_DIRS`) | files |
| 2 | `write_file` | Write/create files | files |
| 3 | `list_directory` | List files and folders | files |
| 4 | `web_search` | DuckDuckGo search | web |
| 5 | `fetch_url` | Fetch and extract text from any URL | web |
| 6 | `run_code` | Execute Python in a restricted sandbox | compute |
| 7 | `calculate` | Safe math expression evaluator | compute |
| 8 | `query_notes` | Persistent key/value notes (set/get/list/delete) | memory |
| 9 | `get_weather` | Current weather for any city | api |
| 10 | `analyze_csv` | Load + analyze CSV (shape, stats, sample) | data |

Plus a **live dashboard** at `http://localhost:3000` that shows every tool call
in real time, lets you test tools interactively, charts usage analytics, and
ships with a built-in **Chat tab** — talk to Claude, watch every tool call
stream inline.

**What's in the box**

- 10 typed tools with Pydantic request/response schemas
- Interactive API reference at `/docs` (Swagger) and `/redoc`
- Optional bearer-token authentication (`FORGE_API_KEY`)
- Sliding-window rate limiting (per-IP, configurable)
- Server-proxied `/chat` endpoint — runs Claude's tool-use loop server-side,
  streams to the browser as SSE, never leaks your Anthropic key
- 27 pytest tests, ruff lint + format, GitHub Actions CI
- See [`SECURITY.md`](./SECURITY.md) for the threat model and hardening checklist

---

## Architecture

```
+-----------------+        HTTP/WS         +-----------------+
|  Claude / any   | <-------------------> |  FORGE Server   |
|  MCP client     |   /mcp/tools          |  (FastAPI)      |
+-----------------+   /mcp/call           +--------+--------+
                                                   |
              +------------------+------------------+------------------+
              |                  |                  |                  |
              v                  v                  v                  v
        [ file_tools ]     [ web_tools ]     [ compute_tools ]   [ data_tools ]
                                                                        |
                                                                        v
                                                                  [ api_tools ]

                       +-----------------+
                       |  React Dashboard | <--- /ws (live tool call stream)
                       +-----------------+
```

- **Transport:** HTTP + WebSocket (MCP-shape JSON on `/mcp/tools` and `/mcp/call`).
- **Sandboxing:** Filesystem tools are locked to `ALLOWED_DIRS`. `run_code`
  runs under restricted builtins with token blocklist.
- **Observability:** Every call is logged to memory (deque, last 500) and to
  `storage/tool_calls.jsonl`. Live-broadcast over WebSocket to the dashboard.
- **Rate limiting:** Sliding-window per client IP (configurable).

---

## Quick start

### 1. MCP Server

Run commands **one at a time** (Windows PowerShell 5 does not support `&&`).

**Windows (PowerShell):**

```powershell
cd mcp-server
py -3.13 -m venv venv                         # 3.12 or 3.13 recommended; 3.14 has known venv-launcher issues
venv\Scripts\Activate.ps1                     # if blocked: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn server:app --reload --port 8000
```

> If Windows Application Control blocks `venv\Scripts\uvicorn.exe`, always invoke uvicorn as
> `python -m uvicorn ...` — that path is not blocked.

**Windows fallback (no venv, if AppLocker blocks venv creation):**

If `py -3.13 -m venv venv` fails with `Unable to copy venvlauncher.exe`, install to your
user site instead — the server runs fine without a venv:

```powershell
cd mcp-server
py -3.13 -m pip install --user -r requirements.txt
copy .env.example .env
py -3.13 -m uvicorn server:app --reload --port 8000
```

Alternatives if you need isolation: `py -3.13 -m pip install --user virtualenv` then
`py -3.13 -m virtualenv venv`, or install [`uv`](https://docs.astral.sh/uv/) via
`winget install astral-sh.uv` and use `uv venv` + `uv pip install -r requirements.txt`.

**macOS / Linux:**

```bash
cd mcp-server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn server:app --reload --port 8000
```

Then:

- http://localhost:8000/        — server info
- http://localhost:8000/tools   — tool list
- http://localhost:8000/health  — health probe

### 2. Dashboard

In a **second terminal**:

```
cd dashboard
npm install
npm start
```

Dashboard opens at http://localhost:3000.

### 3. Demo client

In a **third terminal** (with the server still running):

```
cd demo-client
python client.py
```

### 4. Claude + FORGE (optional)

```
pip install anthropic httpx
```

PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
python demo-client\claude_demo.py "Search the web for MCP and save a note"
```

bash / zsh:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python demo-client/claude_demo.py "Search the web for MCP and save a note"
```

---

## API reference

Interactive reference: **`http://localhost:8000/docs`** (Swagger UI, generated
from Pydantic models).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Server info + tool list |
| GET | `/health` | Health probe; reports auth + rate-limit state |
| GET | `/tools` | All tool definitions (params, required, category) |
| POST | `/tools/{name}` | **Typed** per-tool endpoint, 422 on invalid params |
| POST | `/call/{name}` | Generic tool call (same validation as above) |
| GET | `/calls?limit=50` | Recent tool call history |
| GET | `/stats` | Aggregate usage statistics |
| GET | `/mcp/tools` | MCP-compatible tool listing with JSON Schema |
| POST | `/mcp/call` | MCP-compatible call `{name, arguments}` |
| POST | `/chat` | **SSE** stream: Claude + tool-use loop, server-proxied |
| WS | `/ws` | Live tool-call stream (dashboard) |

Example:

```bash
curl -X POST http://localhost:8000/call/calculate \
  -H 'content-type: application/json' \
  -d '{"expression": "2 ** 10 + 42"}'
```

```bash
curl -X POST http://localhost:8000/mcp/call \
  -H 'content-type: application/json' \
  -d '{"name": "web_search", "arguments": {"query": "MCP spec", "max_results": 3}}'
```

---

## Environment

`mcp-server/.env`:

```
FORGE_API_KEY=          # enables bearer auth; leave empty for open local dev
ANTHROPIC_API_KEY=      # enables /chat and the dashboard Chat tab
WEATHER_API_KEY=        # optional OpenWeatherMap key; falls back to wttr.in
ALLOWED_DIRS=./storage,./workspace
MAX_FILE_SIZE_MB=10
CORS_ORIGINS=*          # set to dashboard URL in production
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MIN=120
```

When `FORGE_API_KEY` is set, every request must include
`Authorization: Bearer <key>`. The dashboard has a settings menu (gear icon)
to paste the key; it's stored in browser localStorage only.

`dashboard/.env`:

```
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

---

## Testing & CI

Server tests (27 covering tools, auth, rate limiter, meta endpoints):

```bash
cd mcp-server
pip install -r requirements-dev.txt
pytest          # expect: 27 passed
ruff check .    # lint
ruff format --check .
```

GitHub Actions (`.github/workflows/ci.yml`) runs the same on every push and PR,
plus a dashboard production build.

---

## Deployment

### Docker

```bash
docker build -t forge-mcp ./mcp-server
docker run -p 8000:8000 --env-file mcp-server/.env forge-mcp
```

### Render.com (server)

Push this repo to GitHub, then on Render:

- **Root Directory:** `mcp-server`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- Add env vars from `.env.example`.

A ready `render.yaml` is included - just import the repo in Render.

### Vercel (dashboard)

- **Root Directory:** `dashboard`
- Build settings auto-detected as Create React App.
- Env vars:
  - `REACT_APP_API_URL=https://your-forge.onrender.com`
  - `REACT_APP_WS_URL=wss://your-forge.onrender.com/ws`

---

## Security notes

- `run_code` is a *demonstration* sandbox. Do not expose it to untrusted input
  on the open internet without a real isolate (container, gVisor, Firecracker).
- File tools are locked to `ALLOWED_DIRS` via resolved-path containment checks.
- `fetch_url` refuses non-http(s) schemes; use a dedicated SSRF-safe HTTP
  client (e.g. a proxy or allowlist) before pointing this at a public LLM.
- Set `CORS_ORIGINS` to your dashboard origin(s) in production. Credentials are
  never sent; wildcard CORS is safe for read-only tool invocation but narrow it.

---

## Folder layout

```
.
├── mcp-server/                 FastAPI MCP server
│   ├── server.py               routes, /chat SSE, WS, dispatch
│   ├── schemas.py              Pydantic models per tool + chat
│   ├── tools/{file,web,compute,data,api}_tools.py
│   ├── middleware/{auth,logger,rate_limiter}.py
│   ├── tests/                  pytest suite (27 tests)
│   ├── storage/                runtime persistence (notes, call log)
│   ├── workspace/              ALLOWED_DIRS scratch space
│   ├── requirements.txt        + requirements-dev.txt
│   ├── ruff.toml  pytest.ini
│   ├── Dockerfile
│   └── .env.example
├── dashboard/                  React dashboard
│   ├── src/
│   │   ├── components/         ToolCard, LiveCallFeed, ToolTester,
│   │   │                        ChatPanel, SettingsMenu, Header, ...
│   │   ├── pages/DashboardPage.jsx
│   │   ├── hooks/useCallStream.js
│   │   └── services/{api,chat}.js
│   └── package.json
├── demo-client/
│   ├── client.py               raw HTTP demo
│   └── claude_demo.py          Claude tool-use demo (CLI)
├── .github/workflows/ci.yml    lint + pytest + dashboard build
├── render.yaml
├── LICENSE                     CC BY-NC 4.0
├── SECURITY.md                 threat model + hardening checklist
├── DECISIONS.md                architectural rationale
└── README.md                   this file
```

---

## License

Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).
See [LICENSE](./LICENSE). Original design and architecture by **Telvin Crasta**
([github.com/crastatelvin](https://github.com/crastatelvin)).
