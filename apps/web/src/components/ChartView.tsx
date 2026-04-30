import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartViewProps {
  data: any;
  type?: 'auto' | 'line' | 'scatter' | 'bar' | 'heatmap';
  height?: number;
}

// Normalise both Plotly format {data:[{x,y,type}]} and flat ECharts format {x,y} / {labels,values}
function normalise(raw: any): { x?: number[]; y?: number[]; labels?: string[]; values?: number[]; seriesType?: string } {
  if (raw == null) return {};
  // Plotly format
  if (Array.isArray(raw.data) && raw.data.length > 0) {
    const trace = raw.data[0] as any;
    if (Array.isArray(trace.x) && Array.isArray(trace.y)) return { x: trace.x, y: trace.y, seriesType: trace.type };
    if (Array.isArray(trace.labels) && Array.isArray(trace.values)) return { labels: trace.labels, values: trace.values };
  }
  // Flat ECharts format
  if (Array.isArray(raw.x) && Array.isArray(raw.y)) return { x: raw.x, y: raw.y };
  if (Array.isArray(raw.labels) && Array.isArray(raw.values)) return { labels: raw.labels, values: raw.values };
  return {};
}

function buildOption(data: any, type: string): echarts.EChartsOption {
  const norm = normalise(data);

  if (norm.x && norm.y) {
    const resolved = type === 'auto'
      ? (norm.x.length > 500 || norm.seriesType === 'scatter' ? 'scatter' : 'line')
      : type;
    return {
      backgroundColor: 'transparent',
      grid: { left: 48, right: 16, top: 16, bottom: 40 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLine: { lineStyle: { color: '#3a2e10' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLine: { lineStyle: { color: '#3a2e10' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      series: [{
        type: resolved as any,
        data: norm.x.map((xi, i) => [xi, norm.y![i]]),
        symbolSize: resolved === 'scatter' ? 3 : undefined,
        lineStyle: resolved === 'line' ? { color: '#f0a500', width: 1.5 } : undefined,
        itemStyle: { color: '#f0a500' },
        large: true,
      }],
      animation: false,
    };
  }

  if (norm.labels && norm.values) {
    return {
      backgroundColor: 'transparent',
      grid: { left: 60, right: 16, top: 16, bottom: 60 },
      xAxis: { type: 'category', data: norm.labels, axisLabel: { color: '#6a5c40', fontSize: 10, rotate: norm.labels.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      series: [{ type: type === 'line' ? 'line' : 'bar', data: norm.values, itemStyle: { color: '#f0a500' }, barMaxWidth: 40 }],
      animation: true,
    };
  }

  return {};
}

export function ChartView({ data, type = 'auto', height = 320 }: ChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    if (!chartRef.current) chartRef.current = echarts.init(containerRef.current, 'dark');
    const option = buildOption(data, type);
    if (Object.keys(option).length > 0) chartRef.current.setOption(option, true);
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [data, type]);

  useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);

  if (!data) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', height,
        background: '#0d0b07',
        borderRadius: 8, marginBottom: 10,
        border: '1px solid #2a1f08',
      }}
    />
  );
}
