import { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node, Edge, addEdge, Connection,
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

export interface ProofNode {
  id: string;
  statement: string;
  type: 'hypothesis' | 'step' | 'conclusion' | 'dead_end';
  verified?: boolean | null; // true=✓, false=✗, null=unverified
  sympyCode?: string;
}

interface ProofTreeProps {
  accent?: string;
  onNodeVerify?: (nodeId: string, statement: string) => Promise<boolean | null>;
}

const NODE_COLORS: Record<ProofNode['type'], string> = {
  hypothesis:  '#3a2f00',
  step:        '#0a1a2a',
  conclusion:  '#0a2a0a',
  dead_end:    '#2a0a0a',
};

const NODE_BORDERS: Record<ProofNode['type'], string> = {
  hypothesis:  '#f0a500',
  step:        '#4a9eff',
  conclusion:  '#7cff6b',
  dead_end:    '#ff4444',
};

function verifiedColor(v: boolean | null | undefined): string {
  if (v === true)  return '#7cff6b';
  if (v === false) return '#ff4444';
  return '#6a5a3a';
}

// Custom node renderer
function ProofNodeComponent({ data, id }: NodeProps) {
  const node = data as ProofNode & { onVerify: (id: string) => void; onDelete: (id: string) => void; onTypeChange: (id: string, t: ProofNode['type']) => void };
  const border = NODE_BORDERS[node.type] || '#4a3820';
  const bg = NODE_COLORS[node.type] || '#0a0800';

  return (
    <div style={{
      background: bg,
      border: `1.5px solid ${border}`,
      borderRadius: 8,
      padding: '10px 14px',
      minWidth: 220,
      maxWidth: 320,
      boxShadow: `0 0 12px ${border}22`,
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: border, border: 'none', width: 8, height: 8 }} />

      {/* Type badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <select
          value={node.type}
          onChange={e => node.onTypeChange(id, e.target.value as ProofNode['type'])}
          style={{ background: 'transparent', border: 'none', color: border, fontSize: '0.6rem', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
        >
          <option value="hypothesis">HYPOTHESIS</option>
          <option value="step">STEP</option>
          <option value="conclusion">CONCLUSION</option>
          <option value="dead_end">DEAD END</option>
        </select>
        <span style={{ fontSize: '0.75rem', color: verifiedColor(node.verified) }}>
          {node.verified === true ? '✓' : node.verified === false ? '✗' : '○'}
        </span>
      </div>

      {/* Statement */}
      <div style={{
        fontSize: '0.78rem',
        color: '#c8bfa8',
        lineHeight: 1.5,
        fontFamily: "'JetBrains Mono', monospace",
        wordBreak: 'break-word',
      }}>
        {node.statement}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          onClick={() => node.onVerify(id)}
          style={{
            fontSize: '0.58rem', background: '#1a2a1a', border: '1px solid #2a4a2a',
            color: '#7cff6b', borderRadius: 3, padding: '2px 7px', cursor: 'pointer',
          }}
        >VERIFY</button>
        <button
          onClick={() => node.onDelete(id)}
          style={{
            fontSize: '0.58rem', background: '#2a1a1a', border: '1px solid #4a2a2a',
            color: '#ff6b35', borderRadius: 3, padding: '2px 7px', cursor: 'pointer',
          }}
        >× DELETE</button>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: border, border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes = { proofNode: ProofNodeComponent };

let idCounter = 100;

export function ProofTree({ accent = '#f0a500', onNodeVerify }: ProofTreeProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [newStatement, setNewStatement] = useState('');
  const [newType, setNewType] = useState<ProofNode['type']>('step');

  const handleVerify = useCallback(async (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !onNodeVerify) return;
    const result = await onNodeVerify(nodeId, node.data.statement);
    setNodes(ns => ns.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, verified: result } } : n
    ));
  }, [nodes, onNodeVerify, setNodes]);

  const handleDelete = useCallback((nodeId: string) => {
    setNodes(ns => ns.filter(n => n.id !== nodeId));
    setEdges(es => es.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const handleTypeChange = useCallback((nodeId: string, type: ProofNode['type']) => {
    setNodes(ns => ns.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, type } } : n
    ));
  }, [setNodes]);

  const addNode = useCallback(() => {
    if (!newStatement.trim()) return;
    const id = String(++idCounter);
    const col = nodes.length % 3;
    const row = Math.floor(nodes.length / 3);
    const newNode: Node = {
      id,
      type: 'proofNode',
      position: { x: 60 + col * 380, y: 60 + row * 180 },
      data: {
        id,
        statement: newStatement.trim(),
        type: newType,
        verified: null,
        onVerify: handleVerify,
        onDelete: handleDelete,
        onTypeChange: handleTypeChange,
      } satisfies ProofNode & { onVerify: any; onDelete: any; onTypeChange: any },
    };
    setNodes(ns => [...ns, newNode]);
    setNewStatement('');
  }, [newStatement, newType, nodes.length, handleVerify, handleDelete, handleTypeChange, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges(es => addEdge({ ...params, animated: true, style: { stroke: accent } }, es)),
    [setEdges, accent]
  );

  const verifiedCount = nodes.filter(n => n.data.verified === true).length;
  const failedCount   = nodes.filter(n => n.data.verified === false).length;
  const totalNodes    = nodes.length;

  return (
    <div style={{
      background: '#050300',
      border: `1px solid ${accent}33`,
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${accent}22`,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '0.65rem', color: accent, letterSpacing: '0.12em' }}>PROOF TREE</span>
        {totalNodes > 0 && (
          <span style={{ fontSize: '0.6rem', color: '#6a5a3a' }}>
            {totalNodes} nodes • {verifiedCount} ✓ • {failedCount} ✗
          </span>
        )}
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <input
            value={newStatement}
            onChange={e => setNewStatement(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addNode()}
            placeholder="Add statement or expression…"
            style={{
              flex: 1, background: '#0a0800', border: '1px solid #2a2010',
              borderRadius: 4, padding: '4px 8px', color: '#c8bfa8',
              fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace",
              outline: 'none',
            }}
          />
          <select
            value={newType}
            onChange={e => setNewType(e.target.value as ProofNode['type'])}
            style={{
              background: '#0a0800', border: '1px solid #2a2010',
              borderRadius: 4, padding: '4px 6px', color: '#c8bfa8',
              fontSize: '0.7rem', cursor: 'pointer',
            }}
          >
            <option value="hypothesis">Hypothesis</option>
            <option value="step">Step</option>
            <option value="conclusion">Conclusion</option>
            <option value="dead_end">Dead End</option>
          </select>
          <button
            onClick={addNode}
            style={{
              background: '#1a1408', border: `1px solid ${accent}55`,
              color: accent, borderRadius: 4, padding: '4px 12px',
              cursor: 'pointer', fontSize: '0.7rem',
            }}
          >+ ADD</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ height: 480 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          style={{ background: '#050300' }}
          defaultEdgeOptions={{ animated: true, style: { stroke: accent, strokeWidth: 1.5 } }}
        >
          <Background color="#1a1408" gap={20} size={1} />
          <Controls style={{ background: '#0a0800', border: '1px solid #2a2010' }} />
          <MiniMap
            style={{ background: '#050300', border: '1px solid #2a2010' }}
            nodeColor={(n) => NODE_BORDERS[n.data?.type as ProofNode['type']] || '#4a3820'}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
