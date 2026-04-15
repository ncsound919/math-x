import { useState, useRef, useEffect, useCallback } from 'react';
import { Omnibar } from '../components/Omnibar';
import { ResultsPane } from '../components/ResultsPane';
import { LeftDrawer } from '../components/LeftDrawer';
import { usePyodide } from '../workers/usePyodide';
import { useDuckDB } from '../workers/useDuckDB';
import { useMemory } from '../state/memory';
import type { Message, Mode, Plan } from '../state/types';

const MODES: Mode[] = [
  { id: 'scientist', icon: '◈', label: 'Scientist',   color: '#f0a500', desc: 'Cross-domain research & discovery' },
  { id: 'formula',   icon: '∿', label: 'Formula Lab', color: '#00e5b0', desc: 'Build, mutate & translate formulas' },
  { id: 'hypothesis',icon: '⬡', label: 'Hypothesis',  color: '#e05aff', desc: 'Generate & test hypotheses' },
  { id: 'solve',     icon: '∂', label: 'Deep Solve',  color: '#00c8ff', desc: 'Rigorous step-by-step solutions' },
  { id: 'synergy',   icon: '⊗', label: 'Synergy',     color: '#ff6b35', desc: 'Hidden cross-domain connections' },
  { id: 'probability',icon:'🎲',label: 'Probability', color: '#e05aff', desc: 'Monte Carlo, Bayes, stochastic' },
  { id: 'files',     icon: '◫', label: 'File Intel',  color: '#7cff6b', desc: 'Analyze documents & datasets' },
];

export default function App() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [activeMode, setActiveMode]   = useState<string>('scientist');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [files, setFiles]             = useState<File[]>([]);
  const [ingestedFiles, setIngestedFiles] = useState<string[]>([]);

  const { ready: pyReady, compute }   = usePyodide();
  const { ready: dbReady, query: dbQuery, loadFile } = useDuckDB();
  const { search: memSearch, store: memStore } = useMemory();

  const modeObj = MODES.find(m => m.id === activeMode) || MODES[0];

  // Folder ingestion pipeline
  const ingestFolder = useCallback(async (newFiles: File[]) => {
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['csv', 'json', 'parquet'].includes(ext) && dbReady) {
        await loadFile(file);
      }
      setIngestedFiles(prev => [...prev, file.name]);
    }
  }, [dbReady, loadFile]);

  // Main send handler
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
    setFiles([]);
    setLoading(true);

    try {
      // Step 1: Get a plan from the API
      const planRes = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userText, mode: activeMode, hasFiles: attachedFiles.length > 0 }),
      });
      const { plan }: { plan: Plan } = await planRes.json();

      // Step 2: Local retrieval from memory
      const retrieved = userText ? await memSearch(userText, 5) : [];

      // Step 3: If code execution needed, get code and run locally
      let execution: Message['execution'] = undefined;
      if (plan.requires_code) {
        const codeRes = await fetch('/api/codegen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: userText, mode: plan.engine, context: retrieved.map(r => r.text).join('\n') }),
        });
        const { code } = await codeRes.json();
        const stdout = await compute(code);
        try {
          const parsed = JSON.parse(stdout);
          execution = { stdout, parsed };
        } catch {
          execution = { stdout };
        }
      }

      // Step 4: Send to chat API with retrieved context + execution results
      const apiMessages = history.map(m => ({ role: m.role, content: m.content }));
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, mode: activeMode, retrieved, execution }),
      });
      const { text } = await chatRes.json();

      const assistantMsg: Message = { role: 'assistant', content: text, execution, plan };
      setMessages(prev => [...prev, assistantMsg]);

      // Step 5: Store query + response in local memory
      await memStore(userText, text);
    } catch (e: any) {
      setError(e.message);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [messages, loading, activeMode, compute, memSearch, memStore]);

  return (
    <div style={{ minHeight: '100vh', background: '#060400', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `linear-gradient(rgba(240,165,0,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(240,165,0,0.025) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        animation: 'gridPulse 8s ease-in-out infinite',
      }} />

      {/* Header */}
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
            <button onClick={() => { setMessages([]); setError(null); }}
              style={{ background: 'none', border: '1px solid #2a2010', borderRadius: 4, padding: '2px 9px', color: '#4a3820', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.1em' }}
              onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = '#ff6b35'; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#4a3820'; }}>
              CLEAR
            </button>
          )}
        </div>
      </header>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', overflowX: 'auto',
        background: '#080600', borderBottom: '1px solid #1e1808',
        position: 'sticky', top: 52, zIndex: 15,
        padding: '0 8px', flexShrink: 0,
      }}>
        {MODES.map(m => (
          <button key={m.id}
            onClick={() => setActiveMode(m.id)}
            title={m.desc}
            style={{
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

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <LeftDrawer
          open={drawerOpen}
          ingestedFiles={ingestedFiles}
          onIngest={ingestFolder}
          modeColor={modeObj.color}
        />
        <ResultsPane
          messages={messages}
          loading={loading}
          error={error}
          modeObj={modeObj}
        />
      </div>

      {/* Input */}
      <Omnibar
        modeObj={modeObj}
        onSend={send}
        loading={loading}
        files={files}
        setFiles={setFiles}
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
