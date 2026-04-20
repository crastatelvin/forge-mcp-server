# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import os
import pathlib


def _allowed_bases() -> list[pathlib.Path]:
    raw = os.getenv("ALLOWED_DIRS", "./storage,./workspace")
    bases = []
    for b in raw.split(","):
        b = b.strip()
        if not b:
            continue
        try:
            bases.append(pathlib.Path(b).resolve())
        except Exception:
            continue
    return bases


def is_safe_path(path: str) -> bool:
    """Resolve path and verify it is contained within an allowed base."""
    try:
        abs_path = pathlib.Path(path).resolve()
    except Exception:
        return False
    for base in _allowed_bases():
        try:
            abs_path.relative_to(base)
            return True
        except ValueError:
            continue
    return False


MAX_READ_CHARS = 10_000


def read_file(path: str) -> dict:
    try:
        if not path:
            return {"error": "path is required"}
        if not is_safe_path(path):
            return {"error": "Access denied: path outside allowed directories", "path": path}
        if not os.path.exists(path):
            return {"error": f"File not found: {path}"}
        if os.path.isdir(path):
            return {"error": f"Path is a directory, not a file: {path}"}

        max_mb = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
        size = os.path.getsize(path)
        if size > max_mb * 1024 * 1024:
            return {
                "error": f"File exceeds max size of {max_mb} MB",
                "path": path,
                "size_bytes": size,
            }

        with open(path, encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {
            "path": path,
            "content": content[:MAX_READ_CHARS],
            "size_bytes": size,
            "truncated": len(content) > MAX_READ_CHARS,
        }
    except Exception as e:
        return {"error": str(e)}


def write_file(path: str, content: str) -> dict:
    try:
        if not path:
            return {"error": "path is required"}
        if content is None:
            content = ""
        if not is_safe_path(path):
            return {"error": "Access denied: path outside allowed directories"}
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {
            "success": True,
            "path": path,
            "bytes_written": len(content.encode("utf-8")),
        }
    except Exception as e:
        return {"error": str(e)}


def list_directory(path: str = ".") -> dict:
    try:
        if not is_safe_path(path):
            return {"error": "Access denied: path outside allowed directories", "path": path}
        if not os.path.exists(path):
            return {"error": f"Directory not found: {path}"}
        if not os.path.isdir(path):
            return {"error": f"Not a directory: {path}"}

        entries = []
        for entry in os.scandir(path):
            try:
                is_dir = entry.is_dir()
                size = entry.stat().st_size if entry.is_file() else None
            except OSError:
                is_dir = False
                size = None
            entries.append(
                {
                    "name": entry.name,
                    "type": "directory" if is_dir else "file",
                    "size_bytes": size,
                }
            )
        return {
            "path": path,
            "entries": sorted(entries, key=lambda x: (x["type"], x["name"])),
            "count": len(entries),
        }
    except Exception as e:
        return {"error": str(e)}
