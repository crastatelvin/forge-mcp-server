// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../lib/icons';
import { formatDuration, relativeTime, truncate } from '../lib/format';

function useTick(ms = 5000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

function CallRow({ call, expanded, onToggle }) {
  const ok = call.success;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{
        border: '1px solid var(--border-subtle)',
        borderLeft: `2px solid ${ok ? 'var(--success)' : 'var(--error)'}`,
        borderRadius: 'var(--r-sm)',
        background: 'var(--bg-1)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="row between"
        style={{
          width: '100%',
          padding: '8px 10px',
          gap: '10px',
          cursor: 'pointer',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          color: 'inherit',
        }}
      >
        <div className="row gap-2 flex-1 truncate">
          <span
            style={{
              display: 'inline-flex',
              color: ok ? 'var(--success)' : 'var(--error)',
              flexShrink: 0,
            }}
          >
            {ok ? <Icon.Check size={12} /> : <Icon.X size={12} />}
          </span>
          <span
            className="mono"
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--accent)',
              minWidth: '96px',
              flexShrink: 0,
            }}
          >
            {call.tool}
          </span>
          <span
            className="mono truncate"
            style={{
              fontSize: '11.5px',
              color: 'var(--text-muted)',
              flex: 1,
              minWidth: 0,
            }}
            title={call.result_preview}
          >
            {truncate(call.result_preview, 72)}
          </span>
        </div>
        <div className="row gap-2" style={{ flexShrink: 0 }}>
          <span
            className="mono"
            style={{ fontSize: '11px', color: 'var(--text-faint)' }}
          >
            {formatDuration(call.duration_ms)}
          </span>
          <span
            style={{
              color: 'var(--text-faint)',
              display: 'inline-flex',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform var(--t-fast) var(--ease)',
            }}
          >
            <Icon.ChevronRight size={12} />
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '10px 12px 12px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-0)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
              }}
            >
              <div className="label" style={{ marginBottom: 4 }}>Params</div>
              <pre
                style={{
                  color: 'var(--text-dim)',
                  background: 'transparent',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  marginBottom: 10,
                }}
              >
                {JSON.stringify(call.params, null, 2)}
              </pre>
              <div className="label" style={{ marginBottom: 4 }}>Result preview</div>
              <pre
                style={{
                  color: 'var(--text-dim)',
                  background: 'transparent',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {call.result_preview}
              </pre>
              <div
                className="row between"
                style={{
                  marginTop: 10,
                  color: 'var(--text-faint)',
                  fontSize: '11px',
                }}
              >
                <span>ID #{call.id}</span>
                <span>{relativeTime(call.timestamp)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LiveCallFeed({ calls }) {
  useTick(5000); // keep relative timestamps fresh
  const [expanded, setExpanded] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const visible = calls.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'ok') return c.success;
    return !c.success;
  });

  return (
    <div className="card card-accent col" style={{ height: 420, padding: 0 }}>
      <div
        className="row between"
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="row gap-2">
          <span className="pulse-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
            Live stream
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
            {visible.length} event{visible.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="row gap-1">
          {[
            ['all', 'All'],
            ['ok', 'OK'],
            ['err', 'Errors'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              style={{
                padding: '4px 9px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: 'var(--r-sm)',
                border: '1px solid',
                borderColor: statusFilter === k ? 'var(--border-strong)' : 'transparent',
                background: statusFilter === k ? 'var(--bg-2)' : 'transparent',
                color: statusFilter === k ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all var(--t-fast) var(--ease)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="col gap-2"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
        }}
      >
        {visible.length === 0 ? (
          <div
            className="col gap-2"
            style={{
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '40px 12px',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Icon.Activity size={22} style={{ color: 'var(--text-faint)' }} />
            <div style={{ fontSize: '13px' }}>Waiting for tool calls…</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>
              Click any tool card to test it.
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((call) => (
              <CallRow
                key={call.id ?? `${call.timestamp}-${call.tool}`}
                call={call}
                expanded={expanded === call.id}
                onToggle={() => setExpanded(expanded === call.id ? null : call.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
