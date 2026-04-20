# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

"""Demo client for FORGE. Calls each tool and prints results."""

import json
import os
import sys

import httpx

BASE_URL = os.getenv("FORGE_BASE_URL", "http://localhost:8000")


def call_tool(tool_name: str, **params) -> dict:
    response = httpx.post(f"{BASE_URL}/call/{tool_name}", json=params, timeout=30)
    response.raise_for_status()
    return response.json()


def list_tools() -> list[dict]:
    response = httpx.get(f"{BASE_URL}/tools", timeout=10)
    response.raise_for_status()
    return response.json()


def _print_section(title: str) -> None:
    print()
    print("=" * 60)
    print(title)
    print("=" * 60)


def main() -> int:
    print("=== FORGE MCP Client Demo ===")
    print(f"Target: {BASE_URL}\n")

    try:
        tools = list_tools()
    except httpx.HTTPError as e:
        print(f"Could not reach FORGE at {BASE_URL}: {e}")
        print("Is the server running?  uvicorn server:app --reload --port 8000")
        return 1

    print(f"Available tools ({len(tools)}): {[t['name'] for t in tools]}")

    _print_section("web_search")
    try:
        result = call_tool("web_search", query="latest AI news 2026", max_results=3)
        print(json.dumps(result["result"], indent=2)[:800])
    except Exception as e:
        print(f"failed: {e}")

    _print_section("calculate")
    try:
        result = call_tool("calculate", expression="(2 ** 10) + 42 * math.pi")
        print(json.dumps(result["result"], indent=2))
    except Exception as e:
        print(f"failed: {e}")

    _print_section("query_notes (set/get)")
    try:
        call_tool("query_notes", action="set", key="demo", content="Hello from FORGE!")
        result = call_tool("query_notes", action="get", key="demo")
        print(json.dumps(result["result"], indent=2))
    except Exception as e:
        print(f"failed: {e}")

    _print_section("get_weather")
    try:
        result = call_tool("get_weather", city="Bangalore")
        print(json.dumps(result["result"], indent=2))
    except Exception as e:
        print(f"failed: {e}")

    _print_section("run_code (sandboxed)")
    try:
        result = call_tool(
            "run_code",
            code="nums = [1,2,3,4,5]\nprint('sum:', sum(nums))\nprint('sq:', [n*n for n in nums])",
        )
        print(json.dumps(result["result"], indent=2))
    except Exception as e:
        print(f"failed: {e}")

    _print_section("list_directory")
    try:
        result = call_tool("list_directory", path="./storage")
        print(json.dumps(result["result"], indent=2)[:600])
    except Exception as e:
        print(f"failed: {e}")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
