/**
 * apiFetch — thin wrapper around fetch that injects the API auth header.
 *
 * VITE_API_KEY is set at build time via Vite's import.meta.env.
 * In development, set it in apps/web/.env (same value as API_KEYS in apps/api/.env).
 * In production Docker builds, pass --build-arg VITE_API_KEY=<key>.
 */
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

function authHeaders(): HeadersInit {
  if (!API_KEY) {
    // Dev convenience: warn once, don't throw — lets you run without auth in local dev
    if (import.meta.env.DEV) {
      console.warn('[apiFetch] VITE_API_KEY is not set. API calls will fail with 401 if auth is enabled.')
    }
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  }
}

/**
 * Drop-in replacement for fetch('/api/...', { method, body }).
 * Automatically injects Content-Type and Authorization headers.
 */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}
