# Math X — Fix Batch 1

Five targeted fixes in priority order. Each section explains the bug, the fix, and what to watch for during integration.

---

## 1. Auth — `apps/api/src/middleware/auth.ts` + `apps/api/src/index.ts`

**Bug:** Every `/api/*` route was unauthenticated. A `while True: requests.post(...)` loop against `/api/chat` runs up Anthropic API bills until the account hits its spend limit.

**Fix:** New `auth.ts` middleware with:
- `API_KEYS` env var (comma-separated, supports rotation without downtime)
- Keys hashed with SHA-256 at boot — raw secrets never held in memory past startup
- `timingSafeEqual` for comparison — prevents timing-based key enumeration
- 32-character minimum per key — rejects trivially weak secrets
- Health endpoint explicitly excluded — monitoring infrastructure must work without auth
- `initAuth()` throws at boot in production if no keys are configured — fail-fast, no silent open endpoints

**`index.ts` change:** `requireAuth` is wired as global middleware after rate limiting but before all routes. Rate limiting runs first intentionally — even attackers with wrong keys get throttled.

**Integration steps:**
```bash
# Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to apps/api/.env
API_KEYS=<generated_key>

# Web app must send the key with every request:
# Authorization: Bearer <key>
#
# Update apps/web/src/app/App.tsx — add this header to all fetch() calls:
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${import.meta.env.VITE_API_KEY}`,
}
#
# Add to apps/web/.env:
VITE_API_KEY=<same_key>
```

**One thing to verify:** The Vite dev proxy in `vite.config.ts` forwards requests to `localhost:5000`. The `Authorization` header will pass through the proxy untouched — no proxy config change needed.

---

## 2. XSS — `apps/web/src/components/MathRenderer.tsx`

**Bug:** The backtick regex `` /`([^`\n]+)`/g `` interpolated captured content directly into an HTML string assigned to `dangerouslySetInnerHTML`. Input like `` `<img src=x onerror=alert(1)>` `` became `<code><img src=x onerror=alert(1)></code>` in the DOM. The OCR route (user-controlled image → Claude response → MathRenderer) was the most plausible real attack path.

**Fix:** Two-layer defense:
1. The inline-code regex now calls `escapeHtml()` on the captured group before interpolating. This is the surgical fix.
2. All HTML produced by the full pipeline — KaTeX output included — is passed through DOMPurify with an allowlist of safe tags and attributes before hitting `dangerouslySetInnerHTML`. This is the belt-and-suspenders layer.

**Integration steps:**
```bash
pnpm add dompurify
pnpm add -D @types/dompurify
```

DOMPurify is loaded lazily via `require()` so the module doesn't break in SSR/test environments that lack `window`. The fallback strips all tags rather than passing raw HTML.

---

## 3. Pyodide Singletons — `apps/web/src/workers/`

**Bug:** `usePyodide`, `useBioPyodide`, and `useSymPyVerifier` each called `new Worker(blob)` in a `useEffect(() => {}, [])`. Three independent Pyodide runtimes, each 40-60MB of WASM + packages. A user who uploads a FASTA file while verifying a derivation loaded ~120MB of WASM simultaneously. `useBioPyodide` also attempted a `micropip.install('biopython')` at runtime — if this failed silently, the hook returned "ready" while being broken.

**Fix:** `PyodideWorkerManager.ts` — a module-level singleton that:
- Spawns exactly one Web Worker containing one Pyodide runtime
- Includes numpy, scipy, sympy in the base package set (always available)
- Loads pandas and biopython lazily on first bio request
- Reports `package-error` as a non-fatal message (bio formats that don't need biopython still work)
- Queues pending calls during boot via a `whenReady()` promise chain

`usePyodide`, `useBioPyodide`, and `useSymPyVerifier` are each refactored to call `getPyodideManager()` instead of spawning workers. They remain separate hooks (clean API) but share one runtime.

**One thing to verify:** The `workers/index.ts` barrel re-exports `useSymPyVerifier` and `usePyodide` — those exports still work since the hook signatures are unchanged. `VerifyResult` is now the exported type name from `useSymPyVerifier` (was `VerifyResult` before — no change).

---

## 4. Session Storage Fragmentation — `apps/web/src/components/WorkflowTemplates.tsx`

**Bug:** `WorkflowTemplates.tsx` contained an inline `useSessions()` hook writing to `localStorage('mathx_sessions')`. `sessions.ts` uses IndexedDB. Two separate storage backends, never synchronized. Sessions from `WorkflowTemplates` never appeared in `LeftDrawer`. The auto-save `useEffect` created a new `session_${Date.now()}` ID on every render, and the deduplication check compared against stale state, producing duplicate sessions.

**Fix:** The inline `useSessions()` hook is deleted. `WorkflowTemplates` now accepts `sessions`, `activeSessionId`, `onReplaySession`, and `onDeleteSession` as props — the same session state that `App.tsx` already manages and persists via `sessions.ts` (IndexedDB). The component becomes a pure presenter for session data it doesn't own.

**Integration steps:** Update the `WorkflowTemplates` call site in `App.tsx` (or wherever it's mounted) to pass the session props:
```tsx
<WorkflowTemplates
  onApplyTemplate={handleApplyTemplate}
  modeColor={modeObj.color}
  sessions={sessions}
  activeSessionId={currentSessionId.current}
  onReplaySession={restoreSession}
  onDeleteSession={handleDeleteSession}
/>
```

---

## 5. Model Router Tests — `apps/api/src/services/__tests__/modelRouter.test.ts`

**Bug:** The existing test mocked `selectProvider` with the `math-core` signature `(mode, ollamaAvailable?)` but the API's implementation takes only `(mode)` and reads `process.env` directly. The tests passed but covered the wrong interface — the actual production code path was untested.

**Fix:** Tests now use `vi.resetModules()` + dynamic `import()` to reload the module fresh for each test with different `process.env` values. This tests the real env-reading behavior. A comment in the file explains that once the math-core migration is complete, these tests can be collapsed into the shared package.

---

## What's Not Fixed Here

- **math-core migration** — `apps/api/src/services/modelRouter.ts` and `prompts.ts` still duplicate `packages/math-core/src/`. Completing that migration is the next batch.
- **No production Dockerfiles** — still needs `apps/api/Dockerfile` and `apps/web/Dockerfile` with multi-stage builds.
- **No structured logging** — `console.warn/error` calls throughout. Pino or Winston would be the right next step.
- **`ExampleGallery.tsx` weight** — 25KB static const array. Still needs to be extracted to a JSON file.
