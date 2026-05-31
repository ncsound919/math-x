// PlotView — renders Plotly chart specs produced by Python code.
// Lazily loads plotly.js so the initial bundle stays small.
// Accepts the JSON output shape: { chart: { data: [...], layout: {...} } }
import { useEffect, useRef, useState } from 'react';
import type { PlotlySpec } from '../state/types';

interface PlotViewProps {
  spec: PlotlySpec;
  accentColor?: string;
}

export function PlotView({ spec, accentColor = 'var(--gold)' }: PlotViewProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!divRef.current || !spec?.data) return;
    let cancelled = false;

    (async () => {
      try {
        // Dynamic import — only loads when a chart is actually rendered
        const Plotly = await import('plotly.js-dist-min');
        if (cancelled) return;

        // Deep-clone and inject dark theme defaults
        const layout = {
          paper_bgcolor: 'var(--bg)',
          plot_bgcolor: 'var(--bg1)',
          font: { color: 'var(--text)', family: "'JetBrains Mono', monospace", size: 11 },
          xaxis: { gridcolor: 'var(--border-dim)', zerolinecolor: 'var(--border)' },
          yaxis: { gridcolor: 'var(--border-dim)', zerolinecolor: 'var(--border)' },
          margin: { t: 40, r: 20, b: 40, l: 50 },
          colorway: [accentColor, 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--orange)', 'var(--teal)'],
          ...(spec.layout ?? {}),
        };

        // Colour each trace with the accent if no colour set
        const data = (spec.data ?? []).map((trace: Record<string, unknown>) => ({
          ...trace,
          ...(trace.type === 'scatter' && !trace.line ? { line: { color: accentColor } } : {}),
        }));

        await (Plotly as any).react(divRef.current!, data, layout, {
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        });
        setLoading(false);
      } catch (e: unknown) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => { cancelled = true; };
  }, [spec, accentColor]);

  if (error) {
    return (
      <div style={{ padding: 10, color: 'var(--orange)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
        Chart error: {error}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-muted)', fontSize: '0.7rem',
        }}>
          Loading chart…
        </div>
      )}
      <div
        ref={divRef}
        style={{
          width: '100%', minHeight: 300,
          borderRadius: 8, overflow: 'hidden',
          border: `1px solid ${accentColor}22`,
          opacity: loading ? 0 : 1,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  );
}
