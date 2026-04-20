// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

export default function ConnectionStatus({ connected }) {
  return (
    <div
      className="row gap-2"
      style={{
        padding: '6px 10px 6px 12px',
        borderRadius: 'var(--r-full)',
        background: connected ? 'var(--success-soft)' : 'var(--error-soft)',
        border: `1px solid ${connected ? 'rgba(93,219,161,0.22)' : 'rgba(255,122,122,0.22)'}`,
        transition: 'all var(--t-norm) var(--ease)',
      }}
      aria-live="polite"
    >
      <span
        className={connected ? 'pulse-dot' : ''}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: connected ? 'var(--success)' : 'var(--error)',
          boxShadow: connected ? '0 0 8px var(--success)' : '0 0 8px var(--error)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.08em',
          color: connected ? 'var(--success)' : 'var(--error)',
          fontWeight: 500,
        }}
      >
        {connected ? 'CONNECTED' : 'DISCONNECTED'}
      </span>
    </div>
  );
}
