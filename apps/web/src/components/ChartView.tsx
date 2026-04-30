import { useEffect, useRef, useState } from 'react';

interface ChartSpec {
  type: string;
  data: any[];
  layout?: Record<string, any>;
}

interface ChartViewProps {
  spec: ChartSpec;
}

export function ChartView({ spec }: ChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !spec?.data?.length) return;
    setError(null);

    import('plotly.js-dist-min').then((Plotly: any) => {
      const layout = {
        font: { family: "'JetBrains Mono', monospace", color: '#c8bfa8', size: 11 },
        paper_bgcolor: 'rgba(6,4,0,0)',
        plot_bgcolor: 'rgba(10,8,0,0.55)',
        margin: { t: 44, r: 16, b: 44, l: 48 },
        xaxis: { gridcolor: '#1a1408', zerolinecolor: '#2a2010', ...(spec.layout?.xaxis || {}) },
        yaxis: { gridcolor: '#1a1408', zerolinecolor: '#2a2010', ...(spec.layout?.yaxis || {}) },
        legend: { bgcolor: 'rgba(0,0,0,0)', bordercolor: '#2a2010' },
        ...spec.layout,
        title: {
          text: spec.layout?.title || '',
          font: { size: 13, color: '#f0a500' },
          x: 0.5,
        },
      };

      const config = {
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'toImage'],
        displaylogo: false,
        responsive: true,
      };

      Plotly.react(containerRef.current, spec.data, layout, config);
    }).catch((e: any) => setError(String(e)));
  }, [spec]);

  const height = ['surface', 'scatter3d'].includes(spec?.type) ? 460 : 340;

  if (error) {
    return (
      <div style={{ padding: '10px 14px', background: '#1a0800', border: '1px solid #ff6b3544', borderRadius: 6, color: '#ff6b35', fontSize: '0.7rem', marginBottom: 10 }}>
        Chart error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        marginBottom: 12,
        borderRadius: 8,
        border: '1px solid #2a2010',
        overflow: 'hidden',
        background: '#060400',
      }}
    />
  );
}
