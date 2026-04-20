// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE, callTool } from '../services/api';
import { TOOL_PRESETS } from '../lib/presets';
import { CategoryIcon, Icon } from '../lib/icons';
import { copyToClipboard, formatDuration, toolToCurl } from '../lib/format';

const NUMERIC_PARAMS = new Set(['max_results', 'max_chars']);

function coerceParams(tool, raw) {
  const out = {};
  for (const key of tool.params) {
    const v = raw[key];
    if (v === undefined || v === '') continue;
    if (NUMERIC_PARAMS.has(key)) {
      const n = Number(v);
      out[key] = Number.isFinite(n) ? n : v;
    } else {
      out[key] = v;
    }
  }
  return out;
}

function CopyButton({ getValue, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  const click = async () => {
    const ok = await copyToClipboard(getValue());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };
  return (
    <button
      onClick={click}
      className="btn btn-ghost"
      style={{ padding: '6px 10px', fontSize: '11.5px' }}
    >
      {copied ? <Icon.Check size={13} /> : <Icon.Copy size={13} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
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
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        color: active ? 'var(--text)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all var(--t-fast) var(--ease)',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

export default function ToolTester({ tool, onClose }) {
  const [params, setParams] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('params');

  useEffect(() => {
    setParams({});
    setResult(null);
    setError(null);
    setTab('params');
  }, [tool]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.key === 'Enter') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCall();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, params]);

  const presets = useMemo(() => (tool ? TOOL_PRESETS[tool.name] || [] : []), [tool]);

  const handleCall = async () => {
    if (!tool) return;
    setLoading(true);
    setError(null);
    try {
      const res = await callTool(tool.name, coerceParams(tool, params));
      setResult(res);
      setTab('result');
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Request failed';
      setError(msg);
      setResult(null);
      setTab('result');
    } finally {
      setLoading(false);
    }
  };

  if (!tool) return null;

  const resultStr = result ? JSON.stringify(result.result ?? result, null, 2) : '';
  const curlStr = toolToCurl(API_BASE, tool.name, coerceParams(tool, params));
  const required = tool.required || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 6, 10, 0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 'var(--s-4)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          data-cat={tool.category}
          className="card"
          style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '86vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--border-strong)',
            boxShadow: 'var(--shadow-lg), var(--shadow-glow)',
          }}
        >
          {/* Header */}
          <div
            className="row between"
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div className="row gap-3">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--r-md)',
                  background: 'color-mix(in srgb, var(--cat) 10%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--cat) 22%, transparent)',
                  color: 'var(--cat)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CategoryIcon category={tool.category} size={16} />
              </div>
              <div className="col" style={{ gap: 2 }}>
                <div
                  className="mono"
                  style={{ fontWeight: 600, fontSize: '15px', letterSpacing: '-0.01em' }}
                >
                  {tool.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {tool.description}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-icon"
              aria-label="Close"
            >
              <Icon.X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="row"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              paddingLeft: '8px',
            }}
          >
            <Tab active={tab === 'params'} onClick={() => setTab('params')}>Params</Tab>
            <Tab active={tab === 'result'} onClick={() => setTab('result')}>
              Result {result && (result.result?.error || error) ? '· error' : ''}
            </Tab>
            <Tab active={tab === 'curl'} onClick={() => setTab('curl')}>cURL</Tab>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px',
            }}
          >
            {tab === 'params' && (
              <>
                {presets.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Examples</div>
                    <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                      {presets.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setParams(p.params)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11.5px' }}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {tool.params.length === 0 ? (
                  <div
                    style={{ color: 'var(--text-muted)', fontSize: '12.5px', padding: '8px 0' }}
                  >
                    This tool takes no parameters.
                  </div>
                ) : (
                  <div className="col gap-3">
                    {tool.params.map((param) => {
                      const isLong = param === 'code' || param === 'content';
                      const isReq = required.includes(param);
                      return (
                        <div key={param} className="col gap-1">
                          <div className="row between">
                            <label className="label">
                              {param}
                              {isReq && (
                                <span style={{ color: 'var(--error)', marginLeft: 6 }}>*</span>
                              )}
                            </label>
                          </div>
                          <textarea
                            className="textarea"
                            value={params[param] || ''}
                            onChange={(e) =>
                              setParams((prev) => ({ ...prev, [param]: e.target.value }))
                            }
                            placeholder={
                              NUMERIC_PARAMS.has(param)
                                ? 'number…'
                                : param === 'code'
                                  ? 'Python code (sandboxed)'
                                  : `Enter ${param}…`
                            }
                            rows={isLong ? 6 : 1}
                            spellCheck={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div
                  className="row between"
                  style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    style={{ fontSize: '11px', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}
                  >
                    Tip: ⌘/Ctrl + Enter to run
                  </span>
                  <button
                    onClick={handleCall}
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? (
                      <>
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                          style={{ display: 'inline-flex' }}
                        >
                          <Icon.Activity size={13} />
                        </motion.span>
                        <span>Calling…</span>
                      </>
                    ) : (
                      <>
                        <Icon.Play size={12} />
                        <span>Run {tool.name}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {tab === 'result' && (
              <>
                {error && (
                  <div
                    className="card"
                    style={{
                      borderColor: 'rgba(255,122,122,0.22)',
                      background: 'var(--error-soft)',
                      color: 'var(--error)',
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      fontFamily: 'var(--font-mono)',
                      marginBottom: 12,
                    }}
                  >
                    {error}
                  </div>
                )}

                {!result && !error && (
                  <div
                    className="col"
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px 16px',
                      color: 'var(--text-muted)',
                      gap: 8,
                    }}
                  >
                    <Icon.Play size={20} style={{ color: 'var(--text-faint)' }} />
                    <div style={{ fontSize: '12.5px' }}>No result yet.</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-faint)' }}>
                      Run the tool to see output here.
                    </div>
                  </div>
                )}

                {result && (
                  <>
                    <div className="row between" style={{ marginBottom: 8 }}>
                      <div className="row gap-2">
                        <span
                          className={`badge ${result.result?.error ? 'badge-error' : 'badge-success'}`}
                        >
                          {result.result?.error ? 'Error' : 'Success'}
                        </span>
                        <span
                          className="mono"
                          style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                        >
                          {formatDuration(result.duration_ms)}
                        </span>
                      </div>
                      <CopyButton getValue={() => resultStr} />
                    </div>
                    <pre
                      style={{
                        background: 'var(--bg-0)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--r-md)',
                        padding: '12px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11.5px',
                        color: 'var(--text-dim)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                        maxHeight: '50vh',
                        overflowY: 'auto',
                      }}
                    >
                      {resultStr}
                    </pre>
                  </>
                )}
              </>
            )}

            {tab === 'curl' && (
              <>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="label">Reproducible request</span>
                  <CopyButton getValue={() => curlStr} />
                </div>
                <pre
                  style={{
                    background: 'var(--bg-0)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--r-md)',
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11.5px',
                    color: 'var(--text-dim)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    maxHeight: '50vh',
                    overflowY: 'auto',
                  }}
                >
                  {curlStr}
                </pre>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: '11.5px',
                    color: 'var(--text-faint)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Drop into any shell to replay this exact call against{' '}
                  <span style={{ color: 'var(--text-dim)' }}>{API_BASE}</span>.
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
