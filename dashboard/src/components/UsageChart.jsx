// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icon } from '../lib/icons';
import { formatNumber } from '../lib/format';

const CATEGORY_COLORS = {
  files: '#7cb8ff',
  web: '#7cd992',
  compute: '#ff9a66',
  memory: '#f1c96a',
  api: '#b599ff',
  data: '#5fd6b1',
};

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: '8px 10px',
        boxShadow: 'var(--shadow-lg)',
        fontFamily: 'var(--font-mono)',
        fontSize: '11.5px',
      }}
    >
      <div style={{ color: 'var(--text)', fontWeight: 600 }}>{p.name}</div>
      <div style={{ color: 'var(--text-muted)' }}>
        {formatNumber(p.count)} call{p.count === 1 ? '' : 's'}
      </div>
    </div>
  );
}

export default function UsageChart({ byTool, tools = [] }) {
  const lookup = Object.fromEntries(tools.map((t) => [t.name, t.category]));

  const data = Object.entries(byTool || {})
    .map(([name, count]) => ({
      name,
      count,
      category: lookup[name] || 'compute',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const total = data.reduce((a, b) => a + b.count, 0);

  return (
    <div className="card" style={{ padding: 'var(--s-4)' }}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row gap-2">
          <Icon.Activity size={14} style={{ color: 'var(--text-muted)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Tool usage
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
          {formatNumber(total)} total
        </span>
      </div>

      {data.length === 0 ? (
        <div
          className="col"
          style={{
            height: 150,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-faint)',
            fontSize: '12px',
            gap: 6,
          }}
        >
          <Icon.Activity size={20} />
          <span>No tool calls yet.</span>
        </div>
      ) : (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 24, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{
                  fill: 'var(--text-muted)',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                }}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickLine={false}
                angle={-28}
                textAnchor="end"
                interval={0}
                height={44}
              />
              <YAxis
                tick={{ fill: 'var(--text-faint)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: 'var(--bg-2)', opacity: 0.4 }}
                content={<TooltipContent />}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {data.map((d, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[d.category] || '#ff7a3d'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
