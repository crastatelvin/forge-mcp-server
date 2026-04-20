// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { motion } from 'framer-motion';
import { Icon } from '../lib/icons';
import { formatDuration, formatNumber } from '../lib/format';

function Sparkline({ data, color }) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{
          height: '22px',
          width: '100%',
          background:
            'linear-gradient(90deg, transparent, var(--border-subtle), transparent)',
          borderRadius: '2px',
          opacity: 0.6,
        }}
      />
    );
  }
  const w = 120;
  const h = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(' L ')}`;
  const area = `${path} L ${w},${h} L 0,${h} Z`;
  const gid = `sp-${color.replace('#', '')}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function StatsStrip({ stats, toolCount = 10, history = [] }) {
  const totalHist = history.map((h) => h.total);
  const avgHist = history.map((h) => h.avg_duration_ms);
  const failHist = history.map((h) => h.failed);

  const items = [
    {
      label: 'Total calls',
      value: formatNumber(stats?.total ?? 0),
      hint: 'since server started',
      color: '#ff7a3d',
      icon: <Icon.Activity size={14} />,
      spark: totalHist,
    },
    {
      label: 'Success rate',
      value: `${stats?.success_rate ?? 0}%`,
      hint: `${stats?.successful ?? 0} / ${stats?.total ?? 0}`,
      color: '#5ddba1',
      icon: <Icon.Check size={14} />,
      spark: null,
    },
    {
      label: 'Failures',
      value: formatNumber(stats?.failed ?? 0),
      hint: 'error responses',
      color: '#ff7a7a',
      icon: <Icon.AlertTriangle size={14} />,
      spark: failHist,
    },
    {
      label: 'Avg latency',
      value: formatDuration(stats?.avg_duration_ms ?? 0),
      hint: 'per tool call',
      color: '#7cb8ff',
      icon: <Icon.Clock size={14} />,
      spark: avgHist,
    },
    {
      label: 'Tools online',
      value: String(toolCount),
      hint: 'registered',
      color: '#f1c96a',
      icon: <Icon.Sliders size={14} />,
      spark: null,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 'var(--s-3)',
      }}
    >
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          className="card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: 'var(--s-4)' }}
        >
          <div className="row between" style={{ marginBottom: '10px' }}>
            <span className="label">{item.label}</span>
            <span style={{ color: item.color, display: 'inline-flex' }}>{item.icon}</span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '6px',
            }}
          >
            {item.value}
          </div>
          <div className="row between" style={{ gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.hint}</span>
          </div>
          {item.spark != null && (
            <div style={{ marginTop: '10px', height: '22px' }}>
              <Sparkline data={item.spark} color={item.color} />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
