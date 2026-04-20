// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import ConnectionStatus from './ConnectionStatus';
import SettingsMenu from './SettingsMenu';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#12141c" stroke="rgba(255,255,255,0.08)" />
      <path d="M10 9h13v4h-9v3h8v4h-8v7h-4z" fill="#ff7a3d" />
      <circle cx="24" cy="24" r="2.5" fill="#ff7a3d" opacity="0.35" />
      <circle cx="24" cy="24" r="1.25" fill="#ff7a3d" />
    </svg>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11.5px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        borderRadius: 'var(--r-md)',
        border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent-bright)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontWeight: 500,
        transition: 'all var(--t-fast) var(--ease)',
      }}
    >
      {children}
    </button>
  );
}

export default function Header({ connected, toolCount, view, onViewChange }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--s-4) 0',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 'var(--s-6)',
        gap: 'var(--s-3)',
        flexWrap: 'wrap',
      }}
    >
      <div className="row gap-3">
        <Logo />
        <div className="col" style={{ gap: '2px' }}>
          <div className="row gap-2" style={{ alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '17px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              FORGE
            </span>
            <span className="eyebrow" style={{ fontSize: '10px' }}>
              MCP Tool Server
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {toolCount ?? '—'} tools · built by Telvin Crasta
          </div>
        </div>
      </div>

      <nav className="row gap-1" aria-label="Main navigation">
        <Tab active={view === 'dashboard'} onClick={() => onViewChange('dashboard')}>
          Dashboard
        </Tab>
        <Tab active={view === 'chat'} onClick={() => onViewChange('chat')}>
          Chat
        </Tab>
      </nav>

      <div className="row gap-2">
        <ConnectionStatus connected={connected} />
        <SettingsMenu />
        <a
          href="https://github.com/crastatelvin"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          aria-label="GitHub"
          style={{ padding: '8px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.96c-3.2.7-3.88-1.54-3.88-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.2-3.09-.12-.3-.52-1.48.11-3.08 0 0 .98-.31 3.2 1.18a11.1 11.1 0 0 1 5.82 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.6.23 2.78.11 3.08.75.8 1.2 1.83 1.2 3.09 0 4.44-2.69 5.41-5.26 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56 4.56-1.52 7.85-5.83 7.85-10.91C23.5 5.74 18.27.5 12 .5z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
