import type { Mode } from '../state/types';

const DOMAIN_GROUPS: { label: string; domains: { id: string; name: string; desc: string; icon: string }[] }[] = [
  {
    label: 'PURE MATHEMATICS',
    domains: [
      { id: 'algebraic_number_theory', name: 'Algebraic Number Theory', desc: 'Number fields, Galois theory, ideal class groups', icon: 'ℕ' },
      { id: 'algebraic_topology',      name: 'Algebraic Topology',      desc: 'Homology, homotopy, high-dimensional invariants', icon: 'Ω' },
      { id: 'differential_geometry',   name: 'Differential Geometry',   desc: 'Manifolds, curvature tensors, metric structures', icon: '∫' },
      { id: 'functional_analysis',     name: 'Functional Analysis',     desc: 'Operator algebras, spectral theory, Hilbert spaces', icon: 'ℳ' },
      { id: 'combinatorics_graph',     name: 'Combinatorics & Graph',   desc: 'Ramsey theory, structural limits, extremal bounds', icon: '⋄' },
    ],
  },
  {
    label: 'APPLIED MATHEMATICS',
    domains: [
      { id: 'pde',                name: 'Partial Differential Equations', desc: 'Existence, regularity, Sobolev space methods', icon: '∂' },
      { id: 'mathematical_physics', name: 'Mathematical Physics',        desc: 'QFT foundations, gauge theories, string math', icon: 'Ψ' },
      { id: 'financial_math',     name: 'Financial Mathematics',         desc: 'Stochastic calculus, Black-Scholes, risk measures', icon: 'Σ' },
      { id: 'biomathematics',     name: 'Biomathematics',                desc: 'Reaction-diffusion, population dynamics, epi ODEs', icon: '∮' },
      { id: 'climate_math',       name: 'Climate Mathematics',           desc: 'Dynamical systems, bifurcations, tipping points', icon: '∇' },
    ],
  },
  {
    label: 'COMPUTATIONAL & CS MATH',
    domains: [
      { id: 'complexity_theory',   name: 'Complexity Theory',    desc: 'Complexity classes, reductions, circuit bounds', icon: '⊤' },
      { id: 'cryptographic_math',  name: 'Cryptographic Math',   desc: 'Lattice hardness, elliptic curves, hard reductions', icon: 'Φ' },
      { id: 'information_theory',  name: 'Information Theory',   desc: 'Shannon capacity, coding bounds, MDL', icon: 'ℎ' },
      { id: 'machine_learning_math', name: 'ML Mathematics',     desc: 'Optimization, PAC learning, kernel methods', icon: 'θ' },
      { id: 'control_theory',      name: 'Control Theory',       desc: 'Lyapunov stability, optimal control, Kalman filters', icon: 'λ' },
    ],
  },
  {
    label: 'PHYSICS MATHEMATICS',
    domains: [
      { id: 'quantum_math',        name: 'Quantum Mathematics',  desc: 'C*-algebras, unitary evolution, non-commutative geometry', icon: '⟨' },
    ],
  },
];

interface DomainPickerProps {
  activeDomain: string;
  onSelect: (id: string) => void;
  modeColor: string;
  visible: boolean;
}

export function DomainPicker({ activeDomain, onSelect, modeColor, visible }: DomainPickerProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(6,4,0,0.97)',
      backdropFilter: 'blur(16px)',
      zIndex: 30,
      overflowY: 'auto',
      padding: '28px 20px',
      animation: 'fadeIn 0.2s ease-out',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: modeColor, fontSize: '1.2rem' }}>∫</span>
          <div>
            <div style={{ color: modeColor, fontSize: '0.72rem', letterSpacing: '0.14em', fontWeight: 700 }}>DOMAIN EXPERT MODE</div>
            <div style={{ color: '#4a3820', fontSize: '0.62rem', letterSpacing: '0.1em', marginTop: 2 }}>SELECT A MATHEMATICS SPECIALIST</div>
          </div>
        </div>

        {DOMAIN_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: '0.58rem', color: '#3a2e10', letterSpacing: '0.2em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #1e1808' }}>
              {group.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {group.domains.map(d => {
                const isActive = d.id === activeDomain;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelect(d.id)}
                    style={{
                      background: isActive ? `${modeColor}12` : '#0a0800',
                      border: isActive ? `1px solid ${modeColor}66` : '1px solid #2a2010',
                      borderRadius: 8,
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = modeColor + '44';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2010';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ color: isActive ? modeColor : '#6a5a3a', fontSize: '0.9rem' }}>{d.icon}</span>
                      <span style={{ color: isActive ? modeColor : '#a89870', fontSize: '0.72rem', fontWeight: 600 }}>{d.name}</span>
                    </div>
                    <div style={{ color: '#4a3820', fontSize: '0.62rem', lineHeight: 1.5 }}>{d.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
