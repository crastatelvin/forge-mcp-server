// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return '-';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return '0';
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 2) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len - 1)}…` : str;
}

/** Build a cURL snippet for a FORGE tool invocation. */
export function toolToCurl(baseUrl, toolName, params) {
  const body = JSON.stringify(params || {}, null, 2);
  return [
    `curl -X POST '${baseUrl}/call/${toolName}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${body.replace(/'/g, "'\\''")}'`,
  ].join('\n');
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
