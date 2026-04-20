// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons';
import { getApiKey, setApiKey } from '../services/api';

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setKey(getApiKey());
  }, [open]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const save = () => {
    setApiKey(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const clear = () => {
    setKey('');
    setApiKey('');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost"
        aria-label="Settings"
        style={{ padding: '8px' }}
      >
        <Icon.Sliders size={14} />
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            padding: 14,
            zIndex: 80,
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <div className="col gap-2">
            <div className="label">FORGE API key</div>
            <input
              type="password"
              className="input"
              placeholder="Leave empty if auth is disabled"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              autoComplete="off"
            />
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.45,
              }}
            >
              Sent as <code>Authorization: Bearer …</code>. Stored in browser
              localStorage only.
            </div>
            <div className="row between" style={{ marginTop: 6 }}>
              <button onClick={clear} className="btn btn-ghost" style={{ padding: '8px 10px' }}>
                Clear
              </button>
              <button onClick={save} className="btn btn-primary" style={{ padding: '8px 14px' }}>
                {saved ? (
                  <>
                    <Icon.Check size={12} />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
