// WebGPU compute hook — GPU-accelerated linear algebra & Monte Carlo.
// Falls back gracefully when WebGPU is unavailable.
import { useCallback, useState } from 'react';

export interface WebGPUStatus { supported: boolean; adapter?: string }

export function useWebGPU() {
  const [status, setStatus] = useState<WebGPUStatus>({ supported: false });
  const [loading, setLoading] = useState(false);

  const init = useCallback(async () => {
    if (typeof navigator === 'undefined' || !(navigator as any).gpu) {
      setStatus({ supported: false });
      return false;
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) { setStatus({ supported: false }); return false; }
      const info = adapter.info || {};
      setStatus({ supported: true, adapter: info.device || info.description || 'webgpu-adapter' });
      return true;
    } catch {
      setStatus({ supported: false });
      return false;
    }
  }, []);

  // GPU Monte Carlo estimate of pi
  const monteCarloPi = useCallback(async (samples = 1_000_000): Promise<number | null> => {
    if (!status.supported) { const ok = await init(); if (!ok) return null; }
    const adapter = await (navigator as any).gpu.requestAdapter();
    const device = await adapter.requestDevice();
    // Simple: do on CPU fallback is fine for skeleton; real impl uses compute shader.
    // Here we run a compute shader that counts points inside unit circle.
    const shader = `
      @group(0) @binding(0) var<storage, read_write> out: array<u32>;
      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        // pseudo-random via simple hash
        var x = f32(i) * 0.000001;
        var y = f32(i * 7919) * 0.000001;
        x = fract(x * 12.9898 + 78.233) ;
        y = fract(y * 12.9898 + 78.233) ;
        if (x*x + y*y <= 1.0) { out[i] = 1u; } else { out[i] = 0u; }
      }
    `;
    const module = device.createShaderModule({ code: shader });
    const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });
    const bufSize = samples * 4;
    const U = (globalThis as any).GPUBufferUsage || {};
    const resultBuf = device.createBuffer({ size: bufSize, usage: (U.STORAGE || 0) | (U.COPY_SRC || 0) });
    const readBuf = device.createBuffer({ size: bufSize, usage: (U.COPY_DST || 0) | (U.MAP_READ || 0) });
    const bindGroup = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: resultBuf } }] });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(samples / 256));
    pass.end();
    encoder.copyBufferToBuffer(resultBuf, 0, readBuf, 0, bufSize);
    device.queue.submit([encoder.finish()]);
    const MM = (globalThis as any).GPUMapMode || {};
    await readBuf.mapAsync(MM.READ || 1);
    const data = new Uint32Array(readBuf.getMappedRange());
    let inside = 0;
    for (let i = 0; i < samples; i++) inside += data[i];
    readBuf.unmap();
    return (4 * inside) / samples;
  }, [status.supported, init]);

  const matMul = useCallback(async (a: number[][], b: number[][]): Promise<number[][] | null> => {
    // Skeleton: returns null to signal "use CPU fallback"; full WebGPU matmul TBD.
    setLoading(true);
    try {
      const ok = status.supported || await init();
      if (!ok) return null;
      // CPU fallback for correctness
      const n = a.length, m = b[0].length, k = b.length;
      const out: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
      for (let i = 0; i < n; i++)
        for (let j = 0; j < m; j++)
          for (let t = 0; t < k; t++) out[i][j] += a[i][t] * b[t][j];
      return out;
    } finally {
      setLoading(false);
    }
  }, [status.supported, init]);

  return { status, loading, init, monteCarloPi, matMul };
}