// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { motion } from 'framer-motion';
import { CategoryIcon, Icon } from '../lib/icons';
import { formatDuration, formatNumber } from '../lib/format';

export default function ToolCard({ tool, callCount = 0, lastDuration, onClick, index = 0 }) {
  return (
    <motion.button
      type="button"
      data-cat={tool.category}
      className="card card-hover"
      onClick={() => onClick(tool)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.025, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        textAlign: 'left',
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        minHeight: '142px',
      }}
    >
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div
          className="row gap-2"
          style={{
            color: 'var(--cat)',
            padding: '6px 8px',
            background: 'color-mix(in srgb, var(--cat) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--cat) 22%, transparent)',
            borderRadius: 'var(--r-sm)',
          }}
        >
          <CategoryIcon category={tool.category} size={13} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            {tool.category}
          </span>
        </div>
        <Icon.Play size={13} style={{ color: 'var(--text-faint)' }} />
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}
      >
        {tool.name}
      </div>

      <div
        style={{
          fontSize: '12.5px',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tool.description}
      </div>

      <div
        className="row between"
        style={{
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
        }}
      >
        <span style={{ color: callCount > 0 ? 'var(--cat)' : 'var(--text-faint)' }}>
          {formatNumber(callCount)} call{callCount === 1 ? '' : 's'}
        </span>
        <span style={{ color: 'var(--text-faint)' }}>
          {lastDuration != null ? formatDuration(lastDuration) : '—'}
        </span>
      </div>
    </motion.button>
  );
}
