// Client-side mathematical analysis tools (mathjs-backed).
// Pure functions; safe to call from components or workers.
import * as math from 'mathjs';

export interface DescriptiveStats {
  n: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  variance: number;
  sum: number;
}

export function descriptiveStats(data: number[]): DescriptiveStats {
  const n = data.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, min: 0, max: 0, std: 0, variance: 0, sum: 0 };
  const mean = math.mean(data) as number;
  const median = math.median(data) as number;
  const min = math.min(data) as number;
  const max = math.max(data) as number;
  const variance = math.variance(data, 'unbiased') as number;
  const std = Math.sqrt(variance);
  const sum = math.sum(data) as number;
  return { n, mean, median, min, max, std, variance, sum };
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  residuals: number[];
}

export function linearRegression(xs: number[], ys: number[]): LinearRegressionResult {
  const n = xs.length;
  const mx = math.mean(xs) as number;
  const my = math.mean(ys) as number;
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  const intercept = my - slope * mx;
  const pred = xs.map(x => slope * x + intercept);
  const residuals = ys.map((y, i) => y - pred[i]);
  const ssRes = residuals.reduce((a, b) => a + b * b, 0);
  const r2 = syy === 0 ? 1 : 1 - ssRes / syy;
  return { slope, intercept, r2, residuals };
}

export function numericalDerivative(f: (x: number) => number, x: number, h = 1e-5): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

export function numericalIntegral(f: (x: number) => number, a: number, b: number, n = 1000): number {
  // Simpson's rule
  if (n % 2 !== 0) n += 1;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    s += (i % 2 === 0 ? 2 : 4) * f(x);
  }
  return (h / 3) * s;
}

export function goldenSectionMin(f: (x: number) => number, a: number, b: number, tol = 1e-6, maxIter = 200): number {
  const phi = (Math.sqrt(5) - 1) / 2;
  let c = b - phi * (b - a);
  let d = a + phi * (b - a);
  for (let i = 0; i < maxIter && Math.abs(b - a) > tol; i++) {
    if (f(c) < f(d)) b = d; else a = c;
    c = b - phi * (b - a);
    d = a + phi * (b - a);
  }
  return (a + b) / 2;
}

export function matrixDeterminant(m: number[][]): number {
  return math.det(m) as number;
}

export function matrixInverse(m: number[][]): number[][] {
  return math.inv(m) as unknown as number[][];
}

export function matrixMultiply(a: number[][], b: number[][]): number[][] {
  return math.multiply(a, b) as unknown as number[][];
}

export function fft(signal: number[]): { re: number[]; im: number[] } {
  // Use mathjs fft if available
  try {
    const out = (math as any).fft(signal);
    return { re: out.map((c: any) => (typeof c === 'object' ? c.re : c)), im: out.map((c: any) => (typeof c === 'object' ? c.im : 0)) };
  } catch {
    return { re: [...signal], im: signal.map(() => 0) };
  }
}

export function solveLinearSystem(A: number[][], b: number[]): number[] {
  const inv = math.inv(A) as any;
  const x = math.multiply(inv, b) as any;
  return Array.isArray(x) ? x.map((v: any) => (Array.isArray(v) ? v[0] : v)) : [x];
}