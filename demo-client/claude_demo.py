# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

"""
Claude + FORGE demo.

Shows how to expose FORGE tools to Claude via the Anthropic Messages API
tool-use loop. The MCP-compatible endpoints on FORGE (/mcp/tools, /mcp/call)
provide ready-made schemas, but Claude's tool-use API expects Anthropic's
tool schema shape - so we translate.

Requires:
    pip install anthropic httpx
    export ANTHROPIC_API_KEY=sk-ant-...
    export FORGE_BASE_URL=http://localhost:8000  # optional
"""

from __future__ import annotations

import json
import os
import sys

import httpx

try:
    from anthropic import Anthropic
except ImportError:
    print("This demo requires the 'anthropic' package:  pip install anthropic")
    sys.exit(1)


BASE_URL = os.getenv("FORGE_BASE_URL", "http://localhost:8000")
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def load_forge_tools() -> list[dict]:
    """Fetch FORGE tools in MCP shape and adapt to Anthropic tool schema."""
    response = httpx.get(f"{BASE_URL}/mcp/tools", timeout=10)
    response.raise_for_status()
    mcp_tools = response.json().get("tools", [])
    return [
        {
            "name": t["name"],
            "description": t["description"],
            "input_schema": t["inputSchema"],
        }
        for t in mcp_tools
    ]


def invoke_forge(tool_name: str, arguments: dict) -> str:
    """Call a tool on FORGE via the MCP endpoint and return a string result."""
    response = httpx.post(
        f"{BASE_URL}/mcp/call",
        json={"name": tool_name, "arguments": arguments or {}},
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
    content = data.get("content") or [{"type": "text", "text": ""}]
    return content[0].get("text", "")


def run_conversation(prompt: str) -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("Set ANTHROPIC_API_KEY to run this demo.")
        sys.exit(1)

    client = Anthropic()
    tools = load_forge_tools()
    print(f"Loaded {len(tools)} FORGE tools for Claude.")

    messages: list[dict] = [{"role": "user", "content": prompt}]
    for step in range(8):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            tools=tools,
            messages=messages,
        )

        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason != "tool_use":
            for block in response.content:
                if getattr(block, "type", None) == "text":
                    print(block.text)
            return

        tool_results = []
        for block in response.content:
            if getattr(block, "type", None) != "tool_use":
                continue
            print(f"[tool_use] {block.name}({json.dumps(block.input)})")
            try:
                result_text = invoke_forge(block.name, block.input)
            except Exception as e:
                result_text = json.dumps({"error": str(e)})
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result_text,
            })

        messages.append({"role": "user", "content": tool_results})

    print("Hit max tool-use iterations without a final response.")


if __name__ == "__main__":
    default_prompt = (
        "Use FORGE tools to: search the web for 'Model Context Protocol Anthropic', "
        "save a note titled 'mcp-summary' with a 2-line summary, then confirm the note was saved."
    )
    prompt = " ".join(sys.argv[1:]) or default_prompt
    run_conversation(prompt)
