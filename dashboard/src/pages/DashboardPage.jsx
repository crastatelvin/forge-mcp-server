// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import StatsStrip from '../components/StatsStrip';
import ToolGrid from '../components/ToolGrid';
import LiveCallFeed from '../components/LiveCallFeed';
import UsageChart from '../components/UsageChart';
import ToolTester from '../components/ToolTester';
import ChatPanel from '../components/ChatPanel';
import { getCalls, getStats, getTools } from '../services/api';
import useCallStream from '../hooks/useCallStream';

export default function DashboardPage() {
  const [tools, setTools] = useState([]);
  const [stats, setStats] = useState(null);
  const [calls, setCalls] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingTools, setLoadingTools] = useState(true);
  const [view, setView] = useState(() =>
    window.location.hash === '#chat' ? 'chat' : 'dashboard',
  );

  const { connected, lastCall } = useCallStream();
  const historyRef = useRef([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, s, c] = await Promise.all([getTools(), getStats(), getCalls(50)]);
        if (!mounted) return;
        setTools(Array.isArray(t) ? t : t?.tools || []);
        setStats(s);
        setCalls(Array.isArray(c) ? c : c?.calls || []);
      } catch (e) {
        console.error('Failed to load initial data', e);
      } finally {
        if (mounted) setLoadingTools(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!lastCall) return;
    setCalls((prev) => {
      const exists = prev.some((c) => c.id === lastCall.id);
      if (exists) return prev;
      return [lastCall, ...prev].slice(0, 100);
    });
    getStats().then(setStats).catch(() => {});
  }, [lastCall]);

  useEffect(() => {
    if (!stats) return;
    const next = [
      ...historyRef.current,
      {
        total: stats.total ?? 0,
        failed: stats.failed ?? 0,
        avg_duration_ms: stats.avg_duration_ms ?? 0,
      },
    ].slice(-20);
    historyRef.current = next;
    setHistory(next);
  }, [stats]);

  const changeView = (v) => {
    setView(v);
    window.history.replaceState(null, '', v === 'chat' ? '#chat' : '#');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '0 var(--s-6) var(--s-8)',
        maxWidth: '1440px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Header
        connected={connected}
        toolCount={tools.length}
        view={view}
        onViewChange={changeView}
      />

      {view === 'dashboard' ? (
        <div className="col gap-6">
          <section>
            <StatsStrip stats={stats} toolCount={tools.length} history={history} />
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 1fr)',
              gap: 'var(--s-5)',
            }}
          >
            <div className="col gap-5">
              <div className="col gap-3">
                <div className="row between">
                  <div className="col" style={{ gap: 2 }}>
                    <h2
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        color: 'var(--text)',
                      }}
                    >
                      Tool registry
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Click any tool to test it live.
                    </span>
                  </div>
                </div>
                <ToolGrid
                  tools={tools}
                  stats={stats}
                  calls={calls}
                  onSelect={setSelectedTool}
                  loading={loadingTools}
                />
              </div>

              <UsageChart byTool={stats?.by_tool || {}} tools={tools} />
            </div>

            <div className="col gap-3">
              <div className="col" style={{ gap: 2 }}>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                    color: 'var(--text)',
                  }}
                >
                  Activity
                </h2>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Real-time tool calls streaming over WebSocket.
                </span>
              </div>
              <LiveCallFeed calls={calls} />
            </div>
          </section>

          <footer
            className="row between"
            style={{
              paddingTop: 'var(--s-6)',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '11.5px',
              color: 'var(--text-faint)',
              fontFamily: 'var(--font-mono)',
              flexWrap: 'wrap',
              gap: 'var(--s-3)',
            }}
          >
            <span>FORGE v1.1 · built by Telvin Crasta</span>
            <span>
              Licensed under{' '}
              <a
                href="https://creativecommons.org/licenses/by-nc/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}
              >
                CC BY-NC 4.0
              </a>
            </span>
          </footer>
        </div>
      ) : (
        <section>
          <ChatPanel />
        </section>
      )}

      {selectedTool && (
        <ToolTester tool={selectedTool} onClose={() => setSelectedTool(null)} />
      )}
    </div>
  );
}
