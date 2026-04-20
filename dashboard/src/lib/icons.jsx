// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================
// Minimal inline SVG icons (Lucide-style). No runtime dependency.

const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

export const Icon = {
  Folder: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M4 6a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
    </svg>
  ),
  Globe: (p) => (
    <svg {...base(p?.size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Zap: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  ),
  Brain: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3v1a3 3 0 0 0 1 2v1a3 3 0 0 0 3 3h1v2h4v-2h1a3 3 0 0 0 3-3v-1a3 3 0 0 0 1-2v-1a3 3 0 0 0-2-3V7a3 3 0 0 0-3-3h-1a2 2 0 0 0-4 0H9z" />
      <path d="M12 4v16" />
    </svg>
  ),
  Plug: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M9 2v5M15 2v5M7 7h10v5a5 5 0 0 1-10 0V7zM12 17v5" />
    </svg>
  ),
  Database: (p) => (
    <svg {...base(p?.size)} {...p}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
    </svg>
  ),
  Search: (p) => (
    <svg {...base(p?.size)} {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Play: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  ),
  X: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Copy: (p) => (
    <svg {...base(p?.size)} {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  ),
  Check: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="m5 12 5 5 9-11" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  ),
  ChevronDown: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Activity: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M3 12h4l3-9 4 18 3-9h4" />
    </svg>
  ),
  Clock: (p) => (
    <svg {...base(p?.size)} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  AlertTriangle: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
    </svg>
  ),
  Github: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M9 19c-4 1.5-4-2-6-2m12 5v-3.5a3.5 3.5 0 0 0-1-2.5c3 0 6-2 6-5.5a4 4 0 0 0-1-2.75A4 4 0 0 0 19 3c0 0-2 0-3 1a11.5 11.5 0 0 0-6 0C9 3 7 3 7 3a4 4 0 0 0 0 2.75A4 4 0 0 0 6 8.5c0 3.5 3 5.5 6 5.5a3.5 3.5 0 0 0-1 2.5V20" />
    </svg>
  ),
  Sliders: (p) => (
    <svg {...base(p?.size)} {...p}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
    </svg>
  ),
};

export function CategoryIcon({ category, size = 16, ...rest }) {
  const map = {
    files: Icon.Folder,
    web: Icon.Globe,
    compute: Icon.Zap,
    memory: Icon.Brain,
    api: Icon.Plug,
    data: Icon.Database,
  };
  const C = map[category] || Icon.Activity;
  return <C size={size} {...rest} />;
}
