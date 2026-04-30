import { useMemo, useState } from 'react';
import {
  Mafs, Coordinates, Plot, Line, Vector, Point,
  Theme, useMovablePoint, vec,
} from 'mafs';
import 'mafs/core.css';

export type MafsSpec =
  | { kind: 'function'; fn: string; color?: string }
  | { kind: 'parametric'; x: string; y: string; domain?: [number, number]; color?: string }
  | { kind: 'vectorField'; fn: string }
  | { kind: 'polar'; fn: string; color?: string };

interface MafsPlotProps {
  spec: MafsSpec;
  accent?: string;
  height?: number;
}

function safeEval(expr: string): ((x: number) => number) | null {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('x', 't', 'Math',
      `'use strict'; try { return (${expr}); } catch(e) { return 0; }`
    ) as (x: number) => number;
  } catch {
    return null;
  }
}

export function MafsPlot({ spec, accent = '#f0a500', height = 300 }: MafsPlotProps) {
  const [error, setError] = useState<string | null>(null);

  const content = useMemo(() => {
    setError(null);
    try {
      if (spec.kind === 'function') {
        const fn = safeEval(spec.fn);
        if (!fn) { setError('Could not parse function'); return null; }
        return (
          <Plot.OfX
            y={(x) => fn(x, x, Math)}
            color={spec.color || accent}
          />
        );
      }

      if (spec.kind === 'parametric') {
        const xFn = safeEval(spec.x);
        const yFn = safeEval(spec.y);
        if (!xFn || !yFn) { setError('Could not parse parametric expressions'); return null; }
        const [tMin, tMax] = spec.domain || [-Math.PI * 2, Math.PI * 2];
        return (
          <Plot.Parametric
            xy={(t) => [xFn(t, t, Math), yFn(t, t, Math)]}
            t={[tMin, tMax]}
            color={spec.color || accent}
          />
        );
      }

      if (spec.kind === 'polar') {
        const fn = safeEval(spec.fn);
        if (!fn) { setError('Could not parse polar function'); return null; }
        return (
          <Plot.Parametric
            xy={(t) => {
              const r = fn(t, t, Math);
              return [r * Math.cos(t), r * Math.sin(t)];
            }}
            t={[0, Math.PI * 2]}
            color={spec.color || accent}
          />
        );
      }

      if (spec.kind === 'vectorField') {
        const fn = safeEval(spec.fn);
        if (!fn) { setError('Could not parse vector field'); return null; }
        return (
          <Plot.VectorField
            xy={([x, y]) => {
              // fn should return [dx, dy] — evaluate as array string
              try {
                // eslint-disable-next-line no-new-func
                const result = new Function('x', 'y', 'Math',
                  `'use strict'; return (${spec.fn});`
                )(x, y, Math);
                return Array.isArray(result) ? result as [number, number] : [0, 0];
              } catch { return [0, 0]; }
            }}
            step={0.5}
          />
        );
      }

      return null;
    } catch (e) {
      setError(String(e));
      return null;
    }
  }, [spec, accent]);

  return (
    <div style={{
      marginBottom: 12,
      borderRadius: 8,
      border: '1px solid #2a2010',
      overflow: 'hidden',
      background: '#060400',
    }}>
      {error && (
        <div style={{ padding: '6px 12px', background: '#1a0800', color: '#ff6b35', fontSize: '0.7rem' }}>
          Mafs error: {error}
        </div>
      )}
      <Mafs
        height={height}
        viewBox={{ x: [-6, 6], y: [-4, 4] }}
        preserveAspectRatio={false}
        theme={{
          foreground: '#c8bfa8',
          background: '#060400',
          red: '#ff6b35',
          orange: accent,
          green: '#7cff6b',
          blue: '#4a9eff',
          indigo: '#9b8bff',
          violet: '#d48fff',
          pink: '#ff8bbb',
          white: '#f0e8d0',
        } as any}
      >
        <Coordinates.Cartesian
          xAxis={{ labels: (n) => n !== 0 ? String(n) : '' }}
          yAxis={{ labels: (n) => n !== 0 ? String(n) : '' }}
        />
        {content}
      </Mafs>
    </div>
  );
}
