// ProofTree — interactive SVG proof-tree canvas.
// Nodes are mathematical statements; edges are deduction steps.
// SymPy verification badges: green = verified, red = failed, gray = unverifiable.
// Users can add nodes, connect them, and run SymPy on any step.
import { useState, useRef, useCallback, useEffect } from 'react';

export interface ProofNode {
  id: string;
  label: string;       // the mathematical statement / expression
  x: number;
  y: number;
  status: 'unverified' | 'verified' | 'failed' | 'unverifiable';
  note?: string;
}

export interface ProofEdge {
  from: string;
  to: string;
  operation?: string;
}

interface ProofTreeProps {
  initialNodes?: ProofNode[];
  initialEdges?: ProofEdge[];
  accentColor?: string;
  onRequestVerify?: (from: string, to: string) => void;
}

const STATUS_COLORS: Record<ProofNode['status'], string> = {
  unverified:  '#4a3820',
  verified:    '#7cff6b',
  failed:      '#ff6b35',
  unverifiable:'#5a4a70',
};

const W = 190, H = 60;

export function ProofTree({
  initialNodes = [],
  initialEdges = [],
  accentColor = '#f0a500',
  onRequestVerify,
}: ProofTreeProps) {
  const [nodes, setNodes] = useState<ProofNode[]>(initialNodes);
  const [edges, setEdges] = useState<ProofEdge[]>(initialEdges);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const addNode = useCallback(() => {
    if (!newLabel.trim()) return;
    const id = `node_${Date.now()}`;
    setNodes(prev => [...prev, {
      id, label: newLabel.trim(),
      x: 80 + Math.random() * 400,
      y: 80 + Math.random() * 200,
      status: 'unverified',
    }]);
    setNewLabel('');
  }, [newLabel]);

  const deleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setEdges(prev => prev.filter(e => e.from !== id && e.to !== id));
    if (selected === id) setSelected(null);
  }, [selected]);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connecting) {
      if (connecting !== id) {
        const exists = edges.some(ed => ed.from === connecting && ed.to === id);
        if (!exists) setEdges(prev => [...prev, { from: connecting, to: id, operation: '' }]);
      }
      setConnecting(null);
      return;
    }
    setSelected(id);
    const svg = svgRef.current!.getBoundingClientRect();
    setDragging({ id, ox: e.clientX - svg.left, oy: e.clientY - svg.top });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const svg = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - svg.left;
    const y = e.clientY - svg.top;
    const node = nodes.find(n => n.id === dragging.id)!;
    const dx = x - dragging.ox;
    const dy = y - dragging.oy;
    setNodes(prev => prev.map(n => n.id === dragging.id
      ? { ...n, x: n.x + dx, y: n.y + dy } : n));
    setDragging({ ...dragging, ox: x, oy: y });
  };

  const cycleStatus = (id: string) => {
    const order: ProofNode['status'][] = ['unverified', 'verified', 'failed', 'unverifiable'];
    setNodes(prev => prev.map(n => {
      if (n.id !== id) return n;
      return { ...n, status: order[(order.indexOf(n.status) + 1) % order.length] };
    }));
  };

  const svgH = Math.max(300, ...nodes.map(n => n.y + H + 30));
  const svgW = Math.max(600, ...nodes.map(n => n.x + W + 30));

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.58rem', color: accentColor, letterSpacing: '0.12em' }}>PROOF TREE</span>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNode()}
          placeholder="Statement or expression…"
          style={{
            flex: 1, background: '#0a0800', border: `1px solid ${accentColor}44`,
            borderRadius: 5, padding: '4px 8px', color: '#c8bfa8',
            fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace",
          }}
        />
        <button onClick={addNode} style={{
          padding: '4px 10px', background: `${accentColor}22`,
          border: `1px solid ${accentColor}`, borderRadius: 5,
          color: accentColor, fontSize: '0.65rem', cursor: 'pointer',
        }}>+ Node</button>
        {selected && (
          <>
            <button onClick={() => { setConnecting(selected); setSelected(null); }} style={{
              padding: '4px 10px', background: '#0a0800', border: '1px solid #00c8ff44',
              borderRadius: 5, color: '#00c8ff', fontSize: '0.65rem', cursor: 'pointer',
            }}>Connect →</button>
            <button onClick={() => deleteNode(selected)} style={{
              padding: '4px 10px', background: '#0a0800', border: '1px solid #ff6b3544',
              borderRadius: 5, color: '#ff6b35', fontSize: '0.65rem', cursor: 'pointer',
            }}>Delete</button>
          </>
        )}
        {connecting && (
          <span style={{ fontSize: '0.62rem', color: '#e05aff' }}>
            Click target node…
          </span>
        )}
      </div>

      <div style={{
        border: `1px solid ${accentColor}22`, borderRadius: 8,
        background: '#060400', overflow: 'auto', position: 'relative',
      }}>
        <svg
          ref={svgRef}
          width={svgW} height={svgH}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
          style={{ cursor: dragging ? 'grabbing' : 'default', display: 'block' }}
        >
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#3a2e10" />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodes.find(n => n.id === e.from);
            const to   = nodes.find(n => n.id === e.to);
            if (!from || !to) return null;
            const x1 = from.x + W / 2, y1 = from.y + H;
            const x2 = to.x + W / 2,   y2 = to.y;
            return (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#2a2010" strokeWidth={1.5}
                  markerEnd="url(#arrow)" />
                {e.operation && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4}
                    fontSize={10} fill="#4a3820"
                    textAnchor="middle" fontFamily="JetBrains Mono">
                    {e.operation}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const col = STATUS_COLORS[n.status];
            const isSel = selected === n.id;
            return (
              <g key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onMouseDown={e => handleMouseDown(e, n.id)}
                style={{ cursor: 'grab' }}
              >
                <rect width={W} height={H} rx={8} ry={8}
                  fill="#0a0800"
                  stroke={isSel ? accentColor : col}
                  strokeWidth={isSel ? 2 : 1} />
                {/* Status dot */}
                <circle cx={W - 10} cy={10} r={5} fill={col}
                  onClick={ev => { ev.stopPropagation(); cycleStatus(n.id); }}
                  style={{ cursor: 'pointer' }}
                />
                <foreignObject x={6} y={4} width={W - 20} height={H - 10}>
                  <div style={{
                    fontSize: '0.68rem', color: '#c8bfa8',
                    fontFamily: "'JetBrains Mono', monospace",
                    overflow: 'hidden', height: '100%',
                    display: 'flex', alignItems: 'center',
                    padding: '2px 2px',
                    wordBreak: 'break-word',
                  }}>
                    {n.label}
                  </div>
                </foreignObject>
                {onRequestVerify && isSel && (
                  <text x={W / 2} y={H + 14}
                    fontSize={9} fill={accentColor}
                    textAnchor="middle" fontFamily="JetBrains Mono"
                    style={{ cursor: 'pointer' }}
                    onClick={ev => {
                      ev.stopPropagation();
                      const parent = edges.find(e => e.to === n.id);
                      if (parent) onRequestVerify(parent.from, n.id);
                    }}
                  >
                    ► VERIFY STEP
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: '0.58rem' }}>
        {Object.entries(STATUS_COLORS).map(([s, c]) => (
          <span key={s} style={{ color: c }}>● {s}</span>
        ))}
      </div>
    </div>
  );
}
