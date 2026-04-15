import { useEffect, useRef } from 'react';

interface ChartSpec {
  chart: boolean;
  type?: string;
  title?: string;
  xlabel?: string;
  ylabel?: string;
  x?: number[];
  y?: number[];
  series?: Array<{ name: string; x: number[]; y: number[] }>;
}

export function ChartView({ spec }: { spec: ChartSpec }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    import('plotly.js-dist-min').then((Plotly: any) => {
      const traces = spec.series
        ? spec.series.map(s => ({ x: s.x, y: s.y, name: s.name, type: spec.type || 'scatter', mode: 'lines' }))
        : [{ x: spec.x, y: spec.y, type: spec.type || 'scatter', mode: spec.type === 'bar' ? undefined : 'lines+markers', marker: { color: '#f0a500' }, line: { color: '#f0a500', width: 1.5 } }];

      Plotly.newPlot(ref.current!, traces, {
        title: { text: spec.title || '', font: { color: '#f0a500', family: 'JetBrains Mono', size: 13 } },
        paper_bgcolor: '#0a0800',
        plot_bgcolor: '#0a0800',
        font: { color: '#c8bfa8', family: 'JetBrains Mono', size: 11 },
        xaxis: { title: spec.xlabel, gridcolor: '#2a2010', zerolinecolor: '#3a3010', color: '#6a5a3a' },
        yaxis: { title: spec.ylabel, gridcolor: '#2a2010', zerolinecolor: '#3a3010', color: '#6a5a3a' },
        margin: { t: 40, l: 50, r: 20, b: 50 },
        legend: { font: { color: '#c8bfa8' } },
        modebar: { bgcolor: 'transparent', color: '#4a3820', activecolor: '#f0a500' },
      }, { responsive: true, displaylogo: false });
    });

    return () => {
      import('plotly.js-dist-min').then((Plotly: any) => {
        if (ref.current) Plotly.purge(ref.current);
      });
    };
  }, [spec]);

  return (
    <div ref={ref} style={{ width: '100%', marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2010' }} />
  );
}
