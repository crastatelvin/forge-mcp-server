// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useMemo, useState } from 'react';
import ToolCard from './ToolCard';
import { Icon } from '../lib/icons';

const CATEGORIES = ['all', 'files', 'web', 'compute', 'memory', 'api', 'data'];

function SkeletonCard() {
  return (
    <div
      className="card"
      style={{ padding: 'var(--s-4)', minHeight: '142px' }}
      aria-hidden="true"
    >
      <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 11, width: '90%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 11, width: '70%' }} />
    </div>
  );
}

export default function ToolGrid({ tools, stats, calls, onSelect, loading = false }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) => {
      if (cat !== 'all' && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tools, query, cat]);

  const lastDurationFor = (name) => calls.find((c) => c.tool === name)?.duration_ms;
  const callCountFor = (name) => stats?.by_tool?.[name] || 0;

  return (
    <div className="col gap-4">
      <div className="row between gap-3" style={{ flexWrap: 'wrap' }}>
        <div
          className="row gap-2"
          style={{
            position: 'relative',
            flex: '1 1 280px',
            maxWidth: '420px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '0 12px',
            transition: 'all var(--t-fast) var(--ease)',
          }}
        >
          <Icon.Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              padding: '10px 0',
              fontSize: '13px',
              width: '100%',
            }}
          />
          {query && (
            <button
              className="btn-icon"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              style={{ padding: '4px' }}
            >
              <Icon.X size={12} />
            </button>
          )}
        </div>

        <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => {
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                data-cat={c === 'all' ? undefined : c}
                style={{
                  padding: '6px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderRadius: 'var(--r-md)',
                  border: `1px solid ${active ? (c === 'all' ? 'var(--accent-border)' : 'color-mix(in srgb, var(--cat) 30%, transparent)') : 'var(--border-subtle)'}`,
                  background: active
                    ? c === 'all'
                      ? 'var(--accent-soft)'
                      : 'color-mix(in srgb, var(--cat) 10%, transparent)'
                    : 'transparent',
                  color: active
                    ? c === 'all'
                      ? 'var(--accent-bright)'
                      : 'var(--cat)'
                    : 'var(--text-muted)',
                  transition: 'all var(--t-fast) var(--ease)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--s-3)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--s-12) var(--s-4)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon.Search size={22} style={{ color: 'var(--text-faint)', marginBottom: 8 }} />
          <div style={{ fontSize: '13px', marginBottom: 4 }}>No tools match your filter.</div>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            Try a different search term or category.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 'var(--s-3)',
          }}
        >
          {filtered.map((tool, i) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              index={i}
              callCount={callCountFor(tool.name)}
              lastDuration={lastDurationFor(tool.name)}
              onClick={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
