// ============================================
// Project: FORGE - Universal MCP Tool Server
// Author: Telvin Crasta | CC BY-NC 4.0
// ============================================

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../lib/icons';
import { streamChat } from '../services/chat';
import { truncate } from '../lib/format';

/**
 * A single assistant turn. Contains any number of text fragments and
 * tool_use/tool_result pairs, rendered inline in the order they streamed in.
 */
function AssistantTurn({ turn }) {
  return (
    <div
      className="col gap-2"
      style={{
        padding: '12px 14px',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--r-md)',
      }}
    >
      <div className="row gap-2" style={{ marginBottom: 4 }}>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--r-sm)',
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent-bright)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          F
        </span>
        <span
          className="label"
          style={{ color: 'var(--text-dim)' }}
        >
          FORGE · Claude
        </span>
      </div>
      {turn.parts.map((p, i) => {
        if (p.type === 'text') {
          return (
            <div
              key={i}
              style={{
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {p.text}
            </div>
          );
        }
        if (p.type === 'tool') {
          const hasError = p.output && p.output.error;
          return (
            <div
              key={i}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11.5px',
                background: 'var(--bg-0)',
                border: '1px solid var(--border-subtle)',
                borderLeft: `2px solid ${hasError ? 'var(--error)' : 'var(--accent)'}`,
                borderRadius: 'var(--r-sm)',
                padding: '8px 10px',
              }}
            >
              <div className="row gap-2" style={{ marginBottom: 6 }}>
                <Icon.Zap size={12} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600, color: 'var(--accent-bright)' }}>
                  {p.name}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>·</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {p.output ? (hasError ? 'error' : 'completed') : 'running…'}
                </span>
              </div>
              <details>
                <summary
                  style={{
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    userSelect: 'none',
                  }}
                >
                  View input / output
                </summary>
                <div style={{ marginTop: 6 }}>
                  <div
                    className="label"
                    style={{ marginBottom: 2, fontSize: '9px' }}
                  >
                    input
                  </div>
                  <pre
                    style={{
                      color: 'var(--text-dim)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                      marginBottom: 6,
                    }}
                  >
                    {JSON.stringify(p.input, null, 2)}
                  </pre>
                  {p.output && (
                    <>
                      <div
                        className="label"
                        style={{ marginBottom: 2, fontSize: '9px' }}
                      >
                        output
                      </div>
                      <pre
                        style={{
                          color: hasError ? 'var(--error)' : 'var(--text-dim)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                        }}
                      >
                        {truncate(JSON.stringify(p.output, null, 2), 1200)}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

function UserTurn({ text }) {
  return (
    <div
      style={{
        alignSelf: 'flex-end',
        maxWidth: '80%',
        padding: '10px 14px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        fontSize: '13.5px',
        lineHeight: 1.55,
        color: 'var(--text)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text}
    </div>
  );
}

const EXAMPLES = [
  'What files are in ./workspace?',
  'Calculate the first 20 Fibonacci numbers and save them to ./workspace/fib.txt',
  'Search the web for "Model Context Protocol" and summarize the top result.',
  "What's the weather in Tokyo right now?",
];

export default function ChatPanel() {
  const [turns, setTurns] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState(null);
  const [chatAvailable, setChatAvailable] = useState(true);
  const controllerRef = useRef(null);
  const bottomRef = useRef(null);
  const currentTurnRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Attempt a probe: if /chat returns 503 the backend isn't configured.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] }),
        });
        if (!cancelled && res.status === 503) setChatAvailable(false);
      } catch {
        /* network error probe; ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const send = (text) => {
    if (!text.trim() || streaming) return;
    setErr(null);

    const userTurn = { role: 'user', text };
    const asstTurn = { role: 'assistant', parts: [] };
    currentTurnRef.current = asstTurn;

    const next = [...turns, userTurn, asstTurn];
    setTurns(next);
    setInput('');
    setStreaming(true);

    // Build the message history for the server
    const history = next
      .filter((t) => t.role === 'user' || (t.role === 'assistant' && t.parts.length > 0))
      .map((t) =>
        t.role === 'user'
          ? { role: 'user', content: t.text }
          : {
              role: 'assistant',
              content: t.parts
                .filter((p) => p.type === 'text')
                .map((p) => p.text)
                .join(''),
            }
      );
    // The last user message is what the server responds to
    history.push({ role: 'user', content: text });
    // The empty assistant turn we just pushed is not part of "history" for the model
    const outgoing = history.slice(0, -1).concat({ role: 'user', content: text });

    const ctrl = streamChat({
      messages: outgoing,
      onEvent: ({ event, data }) => {
        const ref = currentTurnRef.current;
        if (!ref) return;
        if (event === 'message') {
          // Append or merge into the last text part
          const last = ref.parts[ref.parts.length - 1];
          if (last && last.type === 'text') {
            last.text += data.text || '';
          } else {
            ref.parts.push({ type: 'text', text: data.text || '' });
          }
        } else if (event === 'tool_use') {
          ref.parts.push({
            type: 'tool',
            name: data.name,
            input: data.input,
            output: null,
          });
        } else if (event === 'tool_result') {
          // Attach output to the most recent tool_use with matching name + no output
          for (let i = ref.parts.length - 1; i >= 0; i--) {
            const p = ref.parts[i];
            if (p.type === 'tool' && p.name === data.name && !p.output) {
              p.output = data.output;
              break;
            }
          }
        } else if (event === 'error') {
          setErr(data.error || 'Stream error');
        }
        // Force a re-render by cloning
        setTurns((prev) => prev.map((t) => (t === ref ? { ...ref, parts: [...ref.parts] } : t)));
      },
      onError: (e) => {
        setErr(e.message || String(e));
        setStreaming(false);
      },
      onDone: () => {
        setStreaming(false);
        controllerRef.current = null;
      },
    });
    controllerRef.current = ctrl;
  };

  const stop = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStreaming(false);
  };

  const reset = () => {
    stop();
    setTurns([]);
    setErr(null);
  };

  return (
    <div
      className="card col"
      style={{
        height: 'calc(100vh - 240px)',
        minHeight: 440,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div
        className="row between"
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div className="col" style={{ gap: 2 }}>
          <div className="row gap-2">
            <Icon.Brain size={15} style={{ color: 'var(--accent)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Claude + FORGE tools
            </span>
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Chat with Claude, watch it call tools live.
          </span>
        </div>
        <div className="row gap-2">
          {streaming ? (
            <button onClick={stop} className="btn btn-secondary">
              <Icon.X size={12} />
              Stop
            </button>
          ) : null}
          {turns.length > 0 && !streaming ? (
            <button onClick={reset} className="btn btn-ghost">
              Clear
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="col gap-3"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
        }}
      >
        {!chatAvailable && (
          <div
            style={{
              padding: '12px 14px',
              border: '1px solid rgba(245, 201, 106, 0.22)',
              background: 'rgba(245, 201, 106, 0.08)',
              borderRadius: 'var(--r-md)',
              color: 'var(--warning)',
              fontSize: '12.5px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Chat is unavailable — set <code>ANTHROPIC_API_KEY</code> on the server and restart.
          </div>
        )}

        {turns.length === 0 ? (
          <div
            className="col"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 14,
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <Icon.Brain size={28} style={{ color: 'var(--text-faint)' }} />
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text)',
                letterSpacing: '-0.01em',
              }}
            >
              Ask Claude to use the 10 tools
            </div>
            <div
              style={{
                fontSize: '12.5px',
                color: 'var(--text-muted)',
                maxWidth: 420,
                lineHeight: 1.55,
              }}
            >
              Every tool call appears inline, with live input/output preview.
              The same calls stream into the Dashboard's Activity feed.
            </div>
            <div
              className="row gap-2"
              style={{ flexWrap: 'wrap', justifyContent: 'center', maxWidth: 560, marginTop: 6 }}
            >
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  onClick={() => send(e)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '11.5px',
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {turns.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="col"
                style={{ alignItems: 'stretch' }}
              >
                {t.role === 'user' ? (
                  <UserTurn text={t.text} />
                ) : (
                  <AssistantTurn turn={t} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {err && (
          <div
            style={{
              padding: '10px 12px',
              border: '1px solid rgba(248, 113, 113, 0.22)',
              background: 'var(--error-soft)',
              borderRadius: 'var(--r-md)',
              color: 'var(--error)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {err}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="row gap-2"
        style={{
          padding: '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <textarea
          className="textarea"
          placeholder={
            chatAvailable ? 'Ask Claude anything…  (⌘/Ctrl+Enter to send)' : 'Chat disabled'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={!chatAvailable || streaming}
          rows={2}
          style={{ fontFamily: 'var(--font-sans)', fontSize: '13px' }}
        />
        <button
          onClick={() => send(input)}
          disabled={!chatAvailable || streaming || !input.trim()}
          className="btn btn-primary"
          style={{ alignSelf: 'stretch', padding: '0 16px' }}
        >
          {streaming ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              style={{ display: 'inline-flex' }}
            >
              <Icon.Activity size={13} />
            </motion.span>
          ) : (
            <Icon.Play size={13} />
          )}
        </button>
      </div>
    </div>
  );
}
