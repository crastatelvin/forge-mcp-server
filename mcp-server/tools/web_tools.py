# ============================================
# Project: FORGE - Universal MCP Tool Server
# Author: Telvin Crasta
# GitHub: github.com/crastatelvin
# License: CC BY-NC 4.0
# Original design and architecture by Telvin Crasta
# ============================================

import httpx
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS


def web_search(query: str, max_results: int = 5) -> dict:
    try:
        if not query:
            return {"error": "query is required"}
        try:
            max_results = int(max_results)
        except (TypeError, ValueError):
            max_results = 5
        max_results = max(1, min(max_results, 25))

        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append(
                    {
                        "title": r.get("title", ""),
                        "url": r.get("href", ""),
                        "snippet": (r.get("body", "") or "")[:300],
                    }
                )
        return {
            "query": query,
            "results": results,
            "count": len(results),
        }
    except Exception as e:
        return {"error": str(e), "query": query}


def fetch_url(url: str, max_chars: int = 5000) -> dict:
    try:
        if not url:
            return {"error": "url is required"}
        if not (url.startswith("http://") or url.startswith("https://")):
            return {"error": "url must start with http:// or https://", "url": url}

        try:
            max_chars = int(max_chars)
        except (TypeError, ValueError):
            max_chars = 5000
        max_chars = max(100, min(max_chars, 50_000))

        headers = {"User-Agent": "Mozilla/5.0 (compatible; ForgeMCP/1.0; +github.com/crastatelvin)"}
        with httpx.Client(timeout=10.0, follow_redirects=True) as client:
            response = client.get(url, headers=headers)
            content_type = response.headers.get("content-type", "")
            if "html" in content_type.lower():
                soup = BeautifulSoup(response.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer", "noscript"]):
                    tag.decompose()
                text = " ".join(soup.get_text(separator=" ").split())
            else:
                text = response.text

            return {
                "url": url,
                "status_code": response.status_code,
                "content": text[:max_chars],
                "truncated": len(text) > max_chars,
                "content_type": content_type,
            }
    except Exception as e:
        return {"error": str(e), "url": url}
