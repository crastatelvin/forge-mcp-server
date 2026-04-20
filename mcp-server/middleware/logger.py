# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import json
import os
import threading
from collections import deque
from datetime import datetime, timezone

LOG_FILE = os.path.join("storage", "tool_calls.jsonl")
MAX_IN_MEMORY = 500

_lock = threading.Lock()
call_log: deque = deque(maxlen=MAX_IN_MEMORY)
_id_counter = 0


def log_call(tool_name: str, params: dict, result: dict, duration_ms: float) -> dict:
    global _id_counter
    with _lock:
        _id_counter += 1
        entry = {
            "id": _id_counter,
            "tool": tool_name,
            "params": params,
            "result_preview": str(result)[:200],
            "success": "error" not in result,
            "duration_ms": round(duration_ms, 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        call_log.append(entry)

        try:
            os.makedirs("storage", exist_ok=True)
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(json.dumps(entry, default=str) + "\n")
        except OSError:
            # Never let logging break tool calls
            pass
    return entry


def get_recent_calls(limit: int = 50) -> list:
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        limit = 50
    limit = max(1, min(limit, MAX_IN_MEMORY))
    with _lock:
        snapshot = list(call_log)
    return list(reversed(snapshot[-limit:]))


def get_stats() -> dict:
    with _lock:
        snapshot = list(call_log)

    if not snapshot:
        return {
            "total": 0,
            "successful": 0,
            "failed": 0,
            "success_rate": 0,
            "by_tool": {},
            "avg_duration_ms": 0,
        }

    by_tool: dict = {}
    for call in snapshot:
        tool = call["tool"]
        by_tool[tool] = by_tool.get(tool, 0) + 1

    successful = [c for c in snapshot if c["success"]]
    avg_duration = sum(c["duration_ms"] for c in snapshot) / len(snapshot)

    return {
        "total": len(snapshot),
        "successful": len(successful),
        "failed": len(snapshot) - len(successful),
        "success_rate": round(len(successful) / len(snapshot) * 100, 1),
        "by_tool": by_tool,
        "avg_duration_ms": round(avg_duration, 2),
    }
