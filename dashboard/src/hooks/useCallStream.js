// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useRef, useState } from 'react';
import { API_BASE, getApiKey } from '../services/api';

function computeWsUrl() {
  const base = (() => {
    if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
    try {
      const url = new URL(API_BASE);
      const proto = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${url.host}/ws`;
    } catch {
      return 'ws://localhost:8000/ws';
    }
  })();

  // Browsers can't set custom headers on WebSocket. Pass the API key as a
  // query parameter; the server reads it via extract_bearer().
  const key = getApiKey();
  if (!key) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}api_key=${encodeURIComponent(key)}`;
}

/**
 * Subscribes to the FORGE server's /ws endpoint and returns {connected, lastCall}.
 * Auto-reconnects with exponential backoff (max 15s).
 */
export default function useCallStream(onCall) {
  const [connected, setConnected] = useState(false);
  const [lastCall, setLastCall] = useState(null);
  const onCallRef = useRef(onCall);
  onCallRef.current = onCall;

  useEffect(() => {
    let ws;
    let retry = 0;
    let cancelled = false;
    let timeoutId = null;

    const connect = () => {
      if (cancelled) return;
      const url = computeWsUrl();
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        scheduleReconnect();
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* noop */ }
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === 'tool_call') {
            setLastCall(data.call);
            onCallRef.current?.(data.call);
          }
        } catch { /* ignore malformed frames */ }
      };
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(15000, 500 * 2 ** retry);
      retry += 1;
      timeoutId = setTimeout(connect, delay);
    };

    connect();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (ws) {
        try { ws.close(); } catch { /* noop */ }
      }
    };
  }, []);

  return { connected, lastCall };
}
