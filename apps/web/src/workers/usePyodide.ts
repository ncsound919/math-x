/**
 * usePyodide — general-purpose Python execution hook.
 * Now backed by the shared PyodideWorkerManager instead of spawning its own worker.
 */
import { useState, useEffect, useCallback } from 'react'
import { getPyodideManager } from './PyodideWorkerManager'

export interface PyodideStatus {
  ready: boolean
  loading: boolean
  kernelCleared: boolean
  extraPackages: string[]
}

export function usePyodide() {
  const [status, setStatus] = useState<PyodideStatus>({
    ready: false,
    loading: true,
    kernelCleared: false,
    extraPackages: [],
  })

  useEffect(() => {
    const manager = getPyodideManager()

    if (manager.isReady()) {
      setStatus(s => ({ ...s, ready: true, loading: false }))
      return
    }

    // Poll until ready — the manager fires no events, so we wait on run()
    // by sending a trivial no-op. This also confirms the channel is live.
    const check = async () => {
      try {
        await manager.run('pass')
        setStatus(s => ({ ...s, ready: true, loading: false }))
      } catch {
        // Still booting — try again
        setTimeout(check, 500)
      }
    }
    check()
  }, [])

  const compute = useCallback(async (code: string): Promise<string> => {
    const manager = getPyodideManager()
    return manager.run(code)
  }, [])

  const loadExtra = useCallback(async (packages: string[]): Promise<string> => {
    const manager = getPyodideManager()
    const loaded = await manager.loadPackages(packages)
    if (loaded.length > 0) {
      setStatus(s => ({
        ...s,
        extraPackages: [...new Set([...s.extraPackages, ...loaded])],
      }))
    }
    return loaded.join(',')
  }, [])

  const clearKernel = useCallback(async (): Promise<void> => {
    const manager = getPyodideManager()
    await manager.clear()
    setStatus(s => ({ ...s, kernelCleared: true }))
    setTimeout(() => setStatus(s => ({ ...s, kernelCleared: false })), 2000)
  }, [])

  // Expose top-level ready/loading for components that check these directly
  const { ready, loading } = status

  return { status, ready, loading, compute, loadExtra, clearKernel }
}
