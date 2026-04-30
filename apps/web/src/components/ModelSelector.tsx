import { useState } from 'react';

export type ProviderOption = 'auto' | 'claude' | 'ollama' | 'qwen';

const PROVIDERS: { value: ProviderOption; label: string; icon: string; desc: string }[] = [
  { value: 'auto',   icon: '◈', label: 'Auto',         desc: 'Smart routing by mode' },
  { value: 'claude', icon: '☁', label: 'Claude',       desc: 'Cloud · Best accuracy' },
  { value: 'ollama', icon: '⚡', label: 'DeepSeek-R1', desc: 'Local · Free · Fast' },
  { value: 'qwen',   icon: '∂', label: 'Qwen2.5-Math', desc: 'Local · Symbolic math' },
];

interface ModelSelectorProps {
  value: ProviderOption;
  onChange: (v: ProviderOption) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = PROVIDERS.find(p => p.value === value) ?? PROVIDERS[0];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#1a1408',
          border: '1px solid #3a2e10',
          borderRadius: 6,
          padding: '4px 10px',
          color: '#f0a500',
          fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{current.icon}</span>
        <span>{current.label}</span>
        <span style={{ opacity: 0.5, fontSize: '0.65rem' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          background: '#111008',
          border: '1px solid #3a2e10',
          borderRadius: 8,
          padding: 6,
          zIndex: 100,
          minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {PROVIDERS.map(p => (
            <button
              key={p.value}
              onClick={() => { onChange(p.value); setOpen(false); }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                background: value === p.value ? '#2a1f08' : 'transparent',
                border: 'none',
                borderRadius: 6,
                padding: '7px 10px',
                cursor: 'pointer',
                textAlign: 'left',
                marginBottom: 2,
              }}
            >
              <span style={{ color: '#f0a500', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.78rem' }}>
                {p.icon} {p.label}
              </span>
              <span style={{ color: '#6a5c40', fontSize: '0.68rem', marginTop: 2 }}>{p.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
