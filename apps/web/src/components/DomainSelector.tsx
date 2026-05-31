import { useState } from 'react';

const DOMAINS = [
  { id: 'algebraic_number_theory',  label: 'Algebraic Number Theory',   icon: 'ℤ', color: 'var(--gold)' },
  { id: 'algebraic_topology',       label: 'Algebraic Topology',        icon: '⊙', color: 'var(--purple)' },
  { id: 'differential_geometry',    label: 'Differential Geometry',     icon: '∇', color: 'var(--blue)' },
  { id: 'pde',                      label: 'Partial Diff. Equations',   icon: '∂', color: 'var(--green)' },
  { id: 'functional_analysis',      label: 'Functional Analysis',       icon: '∧', color: 'var(--teal)' },
  { id: 'quantum_math',             label: 'Quantum Mathematics',       icon: 'Ψ', color: 'var(--purple)' },
  { id: 'combinatorics_graph',      label: 'Combinatorics & Graphs',    icon: '△', color: 'var(--orange)' },
  { id: 'complexity_theory',        label: 'Complexity Theory',         icon: 'Σ', color: 'var(--blue)' },
  { id: 'cryptographic_math',       label: 'Cryptographic Math',        icon: '🔐', color: 'var(--green)' },
  { id: 'mathematical_physics',     label: 'Mathematical Physics',      icon: '∞', color: 'var(--gold)' },
];

interface DomainSelectorProps {
  activeDomain: string;
  onSelect: (domain: string) => void;
  isProofMode: boolean;
  onToggleProof: () => void;
  accentColor?: string;
}

export function DomainSelector({
  activeDomain,
  onSelect,
  isProofMode,
  onToggleProof,
  accentColor = 'var(--purple)',
}: DomainSelectorProps) {
  const [open, setOpen] = useState(false);
  const current = DOMAINS.find(d => d.id === activeDomain) || DOMAINS[0];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: `${current.color}15`,
          border: `1px solid ${current.color}55`,
          borderRadius: 6,
          padding: '5px 12px',
          color: current.color,
          cursor: 'pointer',
          fontSize: '0.7rem',
          letterSpacing: '0.07em',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: '0.9rem' }}>{current.icon}</span>
        {current.label}
        <span style={{ opacity: 0.5, fontSize: '0.6rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Proof toggle */}
      <button
        onClick={onToggleProof}
        title="Toggle formal proof mode"
        style={{
          marginLeft: 6,
          background: isProofMode ? `${accentColor}25` : 'transparent',
          border: `1px solid ${isProofMode ? accentColor : 'var(--border)'}`,
          borderRadius: 6,
          padding: '5px 10px',
          color: isProofMode ? accentColor : 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '0.65rem',
          letterSpacing: '0.06em',
          transition: 'all 0.15s ease',
        }}
      >
        ⊢ PROOF
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            zIndex: 100,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            minWidth: 260,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            overflow: 'hidden',
          }}
        >
          {DOMAINS.map(d => (
            <button
              key={d.id}
              onClick={() => { onSelect(d.id); setOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                background: activeDomain === d.id ? `${d.color}15` : 'transparent',
                border: 'none',
                borderLeft: activeDomain === d.id ? `2px solid ${d.color}` : '2px solid transparent',
                color: activeDomain === d.id ? d.color : 'var(--text-dim)',
                cursor: 'pointer',
                fontSize: '0.68rem',
                letterSpacing: '0.05em',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${d.color}10`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = activeDomain === d.id ? `${d.color}15` : 'transparent'; }}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { DOMAINS };
