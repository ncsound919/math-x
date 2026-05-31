import '@testing-library/jest-dom'
// Stub out Web Workers — jsdom doesn't support them
class WorkerStub {
  onmessage: ((e: MessageEvent) => void) | null = null
  postMessage() {}
  terminate() {}
}
// @ts-expect-error jsdom stub
globalThis.Worker = WorkerStub
