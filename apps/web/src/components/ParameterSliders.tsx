// ParameterSliders — auto-detects named constants in Python code and renders sliders.
// When a slider changes, the code is re-emitted with the updated value via onCodeChange.
import { useMemo, useState } from 'react';

interface Param {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

interface ParameterSlidersProps {
  code: string;
  onCodeChange: (updatedCode: string) => void;
  accentColor?: string;
}

// Matches patterns like: n = 1000 or ALPHA = 0.05 or omega = 2.5
// Intentionally conservative — single-line assignments only
const PARAM_RE = /^([A-Z_][A-Z0-9_]*|[a-z_][a-z0-9_]*)\s*=\s*(-?\d+(?:\.\d+)?)\s*(?:#.*)?$/gm;

function detectParams(code: string): Param[] {
  const seen = new Set<string>();
  const params: Param[] = [];
  let m;
  // Reset lastIndex for safety (global regex)
  PARAM_RE.lastIndex = 0;
  while ((m = PARAM_RE.exec(code)) !== null) {
    const [, name, raw] = m;
    if (seen.has(name)) continue;
    // Skip obviously non-numeric or single-char loop vars
    if (['i', 'j', 'k', 'n_', 'e'].includes(name)) continue;
    seen.add(name);
    const v = parseFloat(raw);
    if (isNaN(v)) continue;
    // Heuristically set range: ±10× for >0, symmetric for <0
    const absV = Math.abs(v) || 1;
    params.push({
      name,
      value: v,
      min: v < 0 ? v * 10 : 0,
      max: absV * 10,
      step: absV >= 100 ? 1 : absV >= 10 ? 0.5 : absV >= 1 ? 0.1 : 0.01,
    });
  }
  return params.slice(0, 8); // max 8 sliders
}

function substituteParam(code: string, name: string, value: number): string {
  // Replace all occurrences of `name = <number>` on a line
  const re = new RegExp(`^(${name}\\s*=\\s*)(-?\\d+(?:\\.\\d+)?)`, 'gm');
  return code.replace(re, `$1${value}`);
}

export function ParameterSliders({ code, onCodeChange, accentColor = '#f0a500' }: ParameterSlidersProps) {
  const initialParams = useMemo(() => detectParams(code), [code]);
  const [params, setParams] = useState<Param[]>(initialParams);

  if (params.length === 0) return null;

  const handleChange = (idx: number, newValue: number) => {
    const updated = params.map((p, i) => i === idx ? { ...p, value: newValue } : p);
    setParams(updated);
    let updatedCode = code;
    for (const p of updated) {
      updatedCode = substituteParam(updatedCode, p.name, p.value);
    }
    onCodeChange(updatedCode);
  };

  return (
    <div style={{
      padding: '10px 14px', marginBottom: 10,
      background: '#080600', border: `1px solid ${accentColor}22`,
      borderRadius: 7, fontSize: '0.7rem',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ color: accentColor, fontSize: '0.58rem', letterSpacing: '0.15em', marginBottom: 8 }}>
        ⦺ PARAMETERS — drag to re-run
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {params.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#8a7040', minWidth: 80, textAlign: 'right' }}>{p.name}</span>
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={p.value}
              onChange={e => handleChange(i, parseFloat(e.target.value))}
              style={{ flex: 1, accentColor, cursor: 'pointer' }}
            />
            <span style={{ color: accentColor, minWidth: 52, textAlign: 'right' }}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
