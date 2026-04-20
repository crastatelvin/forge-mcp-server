// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { API_BASE, getApiKey } from './api';

/**
 * Stream /chat as SSE and invoke callbacks per event.
 * Events: message, tool_use, tool_result, done, error.
 *
 * Returns an AbortController so the caller can cancel the stream.
 */
export function streamChat({ messages, model, onEvent, onError, onDone }) {
  const controller = new AbortController();
  const headers = { 'Content-Type': 'application/json' };
  const key = getApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          messages,
          model: model || 'claude-sonnet-4-5',
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        onError?.(new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`));
        return;
      }
      if (!res.body) {
        onError?.(new Error('No response body'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split on double-newlines (SSE event boundary)
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          let event = 'message';
          const dataLines = [];
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) {
              event = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }
          const raw = dataLines.join('\n');
          if (!raw) continue;
          let data;
          try {
            data = JSON.parse(raw);
          } catch {
            data = { text: raw };
          }
          onEvent?.({ event, data });
        }
      }
      onDone?.();
    } catch (e) {
      if (e.name === 'AbortError') return;
      onError?.(e);
    }
  })();

  return controller;
}
