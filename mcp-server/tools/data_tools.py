# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import json
import math
import os

import pandas as pd

NOTES_FILE = os.path.join("storage", "notes.json")


def _load_notes() -> dict:
    os.makedirs("storage", exist_ok=True)
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _save_notes(notes: dict) -> None:
    os.makedirs("storage", exist_ok=True)
    with open(NOTES_FILE, "w", encoding="utf-8") as f:
        json.dump(notes, f, indent=2, ensure_ascii=False)


def query_notes(action: str, key: str = "", content: str = "") -> dict:
    action = (action or "list").lower()
    notes = _load_notes()

    if action == "set":
        if not key:
            return {"error": "key is required for 'set'"}
        notes[key] = content
        _save_notes(notes)
        return {"success": True, "action": "set", "key": key}

    if action == "get":
        if not key:
            return {"error": "key is required for 'get'"}
        if key in notes:
            return {"key": key, "content": notes[key], "found": True}
        return {"key": key, "found": False}

    if action == "list":
        return {"keys": list(notes.keys()), "count": len(notes)}

    if action == "delete":
        if not key:
            return {"error": "key is required for 'delete'"}
        if key in notes:
            del notes[key]
            _save_notes(notes)
            return {"success": True, "deleted": key}
        return {"error": f"Key '{key}' not found"}

    return {"error": f"Unknown action: {action}. Use: set, get, list, delete"}


def _sanitize(value):
    """Convert numpy/pandas values to JSON-safe Python primitives."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    try:
        import numpy as np  # lazy

        if isinstance(value, np.integer):
            return int(value)
        if isinstance(value, np.floating):
            v = float(value)
            return None if math.isnan(v) or math.isinf(v) else v
        if isinstance(value, np.bool_):
            return bool(value)
    except ImportError:
        pass
    return value


def analyze_csv(path: str) -> dict:
    try:
        if not path:
            return {"error": "path is required"}
        if not os.path.exists(path):
            return {"error": f"File not found: {path}", "path": path}

        df = pd.read_csv(path)
        numeric_cols = df.select_dtypes(include="number").columns.tolist()

        stats = {}
        for col in numeric_cols[:5]:
            series = df[col].dropna()
            if len(series) == 0:
                continue
            stats[col] = {
                "mean": _sanitize(round(float(series.mean()), 2)),
                "min": _sanitize(round(float(series.min()), 2)),
                "max": _sanitize(round(float(series.max()), 2)),
                "sum": _sanitize(round(float(series.sum()), 2)),
            }

        sample_records = df.head(3).to_dict(orient="records")
        sample = [{k: _sanitize(v) for k, v in row.items()} for row in sample_records]

        missing = {k: int(v) for k, v in df.isnull().sum().to_dict().items()}

        return {
            "path": path,
            "rows": int(len(df)),
            "columns": list(df.columns),
            "numeric_columns": numeric_cols,
            "stats": stats,
            "sample": sample,
            "missing_values": missing,
        }
    except Exception as e:
        return {"error": str(e), "path": path}
