import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartViewProps {
  data: any;
  type?: 'auto' | 'line' | 'scatter' | 'bar' | 'heatmap' | 'plotly';
  height?: number;
}

function buildEChartsOption(data: any, type: string): echarts.EChartsOption {
  if (Array.isArray(data?.x) && Array.isArray(data?.y)) {
    const series: any = {
      type: type === 'scatter' ? 'scatter' : type === 'bar' ? 'bar' : 'line',
      data: data.x.map((xi: number, i: number) => [xi, data.y[i]]),
      symbolSize: type === 'scatter' ? 3 : undefined,
      lineStyle: type === 'line' ? { color: '#f0a500', width: 1.5 } : undefined,
      itemStyle: { color: '#f0a500' },
      large: true,
    };
    return {
      backgroundColor: 'transparent',
      grid: { left: 48, right: 16, top: 16, bottom: 40 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLine: { lineStyle: { color: '#3a2e10' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLine: { lineStyle: { color: '#3a2e10' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      series: [series],
      animation: false,
    };
  }

  if (Array.isArray(data?.labels) && Array.isArray(data?.values)) {
    return {
      backgroundColor: 'transparent',
      grid: { left: 60, right: 16, top: 16, bottom: 60 },
      xAxis: { type: 'category', data: data.labels, axisLabel: { color: '#6a5c40', fontSize: 10, rotate: data.labels.length > 8 ? 30 : 0 } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2a2010' } }, axisLabel: { color: '#6a5c40', fontSize: 10 } },
      series: [{ type: type === 'line' ? 'line' : 'bar', data: data.values, itemStyle: { color: '#f0a500' }, barMaxWidth: 40 }],
      animation: true,
    };
  }

  return {};
}

export function ChartView({ data, type = 'auto', height = 320 }: ChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;
    if (data?.type === 'plotly' || type === 'plotly') return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, 'dark');
    }

    const resolvedType = type === 'auto'
      ? (data?.x && data.x.length > 500 ? 'scatter' : 'line')
      : type;

    const option = buildEChartsOption(data, resolvedType);
    chartRef.current.setOption(option, true);

    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [data, type]);

  useEffect(() => {
    return () => { chartRef.current?.dispose(); chartRef.current = null; };
  }, []);

  if (!data) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        background: '#0d0b07',
        borderRadius: 8,
        border: '1px solid #2a1f08',
      }}
    />
  );
}
