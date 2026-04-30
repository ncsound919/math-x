import { useState, useRef, useEffect, useCallback } from 'react';
import { Omnibar } from '../components/Omnibar';
import { ResultsPane } from '../components/ResultsPane';
import { LeftDrawer } from '../components/LeftDrawer';
import { usePyodide } from '../workers/usePyodide';
import { useDuckDB } from '../workers/useDuckDB';
import { useMemory } from '../state/memory';
import { loadSessions, saveSessions } from '../state/sessions';
import type { Message, Mode, Plan, Session } from '../state/types';
import type { ProviderOption } from '../components/ModelSelector';

const MODES: Mode[] = [
  { id: 'scientist',   icon: '◈', label: 'Scientist',    color: '#f0a500', desc: 'Cross-domain research & discovery' },
  { id: 'formula',     icon: '∿', label: 'Formula Lab',  color: '#00e5b0', desc: 'Build, mutate & translate formulas' },
  { id: 'hypothesis',  icon: '⬡', label: 'Hypothesis',   color: '#e05aff', desc: 'Generate & test hypotheses' },
  { id: 'solve',       icon: '∂', label: 'Deep Solve',   color: '#00c8ff', desc: 'Rigorous step-by-step solutions' },
  { id: 'synergy',     icon: '⊗', label: 'Synergy',      color: '#ff6b35', desc: 'Hidden cross-domain connections' },
  { id: 'probability', icon: '🎲', label: 'Probability', color: '#e05aff', desc: 'Monte Carlo, Bayes, stochastic' },
  { id: 'files',       icon: '◫', label: 'File Intel',   color: '#7cff6b', desc: 'Analyze documents & datasets' },
  { id: 'domain',      icon: '∫', label: 'Domain Expert',color: '#e05aff', desc: 'Advanced mathematics specialist' },
];

export default function App() {
  const [messages, setMessages]           = useState<Message[]>([]);
  const [activeMode, setActiveMode]       = useState<string>('scientist');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [ingestedFiles, setIngestedFiles] = useState<string[]>([]);
  const [provider, setProvider]           = useState<ProviderOption>('auto');
  const [sessions, setSessions]           = useState<Session[]>([]);

  const abortRef         = useRef<AbortController | null>(null);
  const currentSessionId = useRef<string | null>(null);

  const { ready: pyReady, compute, loadExtra } = usePyodide();
  const { ready: dbReady, loadFile }           = useDuckDB();
  const { search: memSearch, store: memStore } = useMemory();

  const modeObj = MODES.find(m => m.id === activeMode) || MODES[0];

  useEffect(() => {
    loadSessions().then(setSessions).catch(() => {});
  }, []);

  const ingestFolder = useCallback(async (newFiles: File[]) => {
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['csv', 'json', 'parquet'].includes(ext) && dbReady) await loadFile(file);
      setIngestedFiles(prev => [...prev, file.name]);
    }
  }, [dbReady, loadFile]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setMessages(prev => {
      const next = [...prev];
      if (next.length > 0 && next[next.length - 1].role === 'assistant') {
        next[next.length - 1] = { ...next[next.length - 1], streaming: false };
      }
      return next;
    });
  }, []);

  const persistSession = useCallback((updatedMessages: Message[]) => {
    if (updatedMessages.length === 0) return;
    if (!currentSessionId.current) {
      currentSessionId.current = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    const sid  = currentSessionId.current;
    const now  = Date.now();
    setSessions(prev => {
      const idx  = prev.findIndex(s => s.id === sid);
      const name = updatedMessages[0]?.content?.slice(0, 50) || 'Session';
      const session: Session = idx >= 0
        ? { ...prev[idx], messages: updatedMessages, updatedAt: now }
        : { id: sid, name, mode: activeMode, messages: updatedMessages, createdAt: now, updatedAt: now, tags: [] };
      const next = idx >= 0 ? prev.map((s, i) => i === idx ? session : s) : [session, ...prev];
      saveSessions(next).catch(() => {});
      return next;
    });
  }, [activeMode]);

  const send = useCallback(async (userText: string, attachedFiles: File[]) => {
    if ((!userText.trim() && attachedFiles.length === 0) || loading) return;
    setError(null);

    const userMsg: Message = {
      role: 'user',
      content: userText || 'Analyze the attached files',
      files: attachedFiles.map(f => f.name),
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // Step 1: Plan
      const planRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, mode: activeMode, hasFiles: attachedFiles.length > 0 }),
        signal: abort.signal,
      });
      const { plan }: { plan: Plan } = await planRes.json();

      // Step 1b: Lazy-load extra Pyodide packages by engine type
      if (plan.requires_code) {
        if (plan.engine === 'dataset')  await loadExtra(['pandas', 'statsmodels']).catch(() => {});
        if (plan.engine === 'bayesian') await loadExtra(['pandas']).catch(() => {});
      }

      // Step 2: Local memory retrieval
      const retrieved = userText ? await memSearch(userText, 5) : [];

      // Step 3: Code execution
      let execution: Message['execution'] = undefined;
      if (plan.requires_code) {
        const codeRes = await fetch('/api/codegen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: userText, mode: plan.engine, context: retrieved.map(r => r.text).join('\n') }),
          signal: abort.signal,
        });
        const { code } = await codeRes.json();
        const stdout = await compute(code);
        try   { execution = { stdout, parsed: JSON.parse(stdout), code }; }
        catch { execution = { stdout, code }; }
      }

      // Step 4: Streaming chat via SSE
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })), mode: activeMode, provider, retrieved, execution }),
        signal: abort.signal,
      });

      if (!chatRes.ok || !chatRes.body) throw new Error(`Chat API error ${chatRes.status}`);

      // Push initial streaming placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, execution, plan }]);

      const reader  = chatRes.body.getReader();
      const decoder = new TextDecoder();
      let fullText         = '';
      let responseProvider: 'claude' | 'ollama' | 'qwen' | undefined;
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const evt = JSON.parse(raw);
            if (evt.delta) {
              fullText += evt.delta;
              setMessages(prev => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: fullText };
                return next;
              });
            }
            if (evt.done)  responseProvider = evt.provider;
            if (evt.error) throw new Error(evt.error);
          } catch (parseErr: any) {
            if (parseErr?.message && !parseErr.message.includes('JSON')) throw parseErr;
          }
        }
      }

      // Finalize message
      const finalMsg: Message = {
        role: 'assistant', content: fullText, streaming: false,
        provider: responseProvider, execution, plan,
      };
      setMessages(prev => {
        const next = [...prev];
        if (next[next.length - 1]?.role === 'assistant') next[next.length - 1] = finalMsg;
        return next;
      });

      persistSession([...history, finalMsg]);
      await memStore(userText, fullText);

    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(e.message);
      setMessages(prev => {
        const next = [...prev];
        if (next[next.length - 1]?.role === 'assistant' && !next[next.length - 1].content) return next.slice(0, -1);
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [messages, loading, activeMode, provider, compute, loadExtra, memSearch, memStore, persistSession]);

  const restoreSession = useCallback((session: Session) => {
    setMessages(session.messages);
    setActiveMode(session.mode);
    currentSessionId.current = session.id;
    setDrawerOpen(false);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessions(next).catch(() => {});
      return next;
    });
    if (currentSessionId.current === id) {
      setMessages([]);
      currentSessionId.current = null;
    }
  }, []);

  const startNewSession = useCallback(() => {
    setMessages([]);
    currentSessionId.current = null;
    setError(null);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#060400', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(240,165,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(240,165,0,0.025) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        animation: 'gridPulse 8s ease-in-out infinite',
      }} />

      <header style={{
        padding: '0 20px', height: 52,
        borderBottom: '1px solid #1e1808',
        background: 'rgba(6,4,0,0.97)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setDrawerOpen(d => !d)} style={{
            background: 'none', border: '1px solid #2a2010',
            borderRadius: 5, padding: '4px 8px',
            color: '#4a3820', cursor: 'pointer', fontSize: '0.65rem',
          }}>☰</button>
          <div style={{
            fontFamily: "'Libre Baskerville', serif",
            fontWeight: 700, fontSize: '1rem',
            color: '#f0a500', letterSpacing: '0.04em',
            animation: 'breathe 4s ease-in-out infinite',
          }}>MATH X</div>
          <div style={{ fontSize: '0.55rem', color: '#3a2e10', letterSpacing: '0.18em' }}>CROSS-DOMAIN INTELLIGENCE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dot active={pyReady} label="WASM" />
          <Dot active={dbReady} label="DB" />
          <Dot active={true} label="LIVE" pulse />
          {messages.length > 0 && (
            <button
              onClick={startNewSession}
              style={{ background: 'none', border: '1px solid #2a2010', borderRadius: 4, padding: '2px 9px', color: '#4a3820', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.1em' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#ff6b35'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#4a3820'; }}
            >NEW</button>
          )}
        </div>
      </header>

      <div style={{
        display: 'flex', overflowX: 'auto',
        background: '#080600', borderBottom: '1px solid #1e1808',
        position: 'sticky', top: 52, zIndex: 15,
        padding: '0 8px', flexShrink: 0,
      }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setActiveMode(m.id)} title={m.desc} style={{
            padding: '9px 16px',
            background: activeMode === m.id ? `${m.color}10` : 'transparent',
            border: 'none',
            borderBottom: activeMode === m.id ? `2px solid ${m.color}` : '2px solid transparent',
            color: activeMode === m.id ? m.color : '#4a3820',
            cursor: 'pointer', fontSize: '0.7rem',
            fontWeight: activeMode === m.id ? 500 : 400,
            whiteSpace: 'nowrap', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s ease',
          }}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <LeftDrawer
          open={drawerOpen}
          ingestedFiles={ingestedFiles}
          onIngest={ingestFolder}
          modeColor={modeObj.color}
          sessions={sessions}
          activeSessionId={currentSessionId.current}
          onRestoreSession={restoreSession}
          onDeleteSession={handleDeleteSession}
          onNewSession={startNewSession}
        />
        <ResultsPane
          messages={messages}
          loading={loading}
          error={error}
          modeObj={modeObj}
          compute={compute}
        />
      </div>

      <Omnibar
        modeObj={modeObj}
        onSend={send}
        loading={loading}
        onStop={stopGeneration}
        provider={provider}
        onProviderChange={setProvider}
      />
    </div>
  );
}

function Dot({ active, label, pulse }: { active: boolean; label: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: active ? '#7cff6b' : '#3a3020',
        boxShadow: active ? '0 0 5px #7cff6b' : 'none',
        animation: pulse && active ? 'breathe 2s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: '0.58rem', color: '#3a2e10', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}
