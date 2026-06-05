# Math X — Code Review Patch Notes

Nine issues addressed across six files, plus one new shared utility.
Listed by priority order with exact file targets and rationale.

---

## 🔴 High Priority

### 1. ANTHROPIC_API_KEY validation at boot
**File:** `apps/api/src/middleware/auth.ts`

`initAuth()` previously only validated `API_KEYS`. If `ANTHROPIC_API_KEY` was
missing or blank, all Claude-backed routes (chat, OCR, export, domain, etc.)
would fail at request time with an opaque upstream error instead of a clear
boot-time failure.

**Fix applied:**
- In **production**: if no `ANTHROPIC_API_KEY` is set AND no local model
  (`OLLAMA_BASE_URL` / `QWEN_BASE_URL`) is configured, `initAuth()` throws
  immediately — the server refuses to start.
- If only local models are configured (zero-API-cost mode), a console warning
  is printed listing which routes will degrade.
- In **development**: a warning is printed but startup continues, preserving the
  existing "partial local dev" workflow.

**Replace:** `apps/api/src/middleware/auth.ts` → `patches/auth.ts`

---

### 2. Zod validation missing from domain route
**File:** `apps/api/src/routes/domain.ts`

The domain route destructured `req.body` directly with no validation, trusting
that `domain`, `query`, and `isProofRequest` existed and had correct types.
A missing or overlong `query` could cause the Anthropic SDK call to fail with a
confusing upstream error, and there was no max-length guard preventing prompt
stuffing.

Additionally the route hardcoded `claude-3-5-sonnet-20240620` instead of
reading `process.env.MODEL` like every other route.

**Fix applied:**
- `DomainRequestSchema` (Zod) validates `domain` (1–100 chars), `query`
  (1–20 000 chars), and `isProofRequest` (boolean, optional, default false).
- Validation failures return 400 with structured `details` from Zod.
- Model string changed to `process.env.MODEL || 'claude-sonnet-4-20250514'`.
- Raw `error.message` replaced with generic server error (see fix 3).

**Replace:** `apps/api/src/routes/domain.ts` → `patches/domain.ts`

---

### 3. Raw `error.message` exposed to clients
**Files:** All API route handlers

Every route had `catch (err: any) { res.status(500).json({ error: err.message }) }`.
This leaks internal information: library version strings, file system paths,
SQL error messages, upstream API error details, and environment variable names
can all appear in `err.message`.

**Fix applied:**

New shared utility: `apps/api/src/lib/errors.ts`

```ts
// Server-side only — full detail for logs
console.error('Analogies route error:', toLogMessage(err))

// Client-facing — always generic
res.status(500).json(serverError())
// → { error: 'An error occurred processing your request' }
```

All routes updated to use this pattern. `analogies.ts` and `ocr.ts` patches are
included; apply the same `toLogMessage` / `serverError()` pattern to the
remaining routes (`bio.ts`, `chat.ts`, `codegen.ts`, `export.ts`, `hypothesis.ts`,
`literature.ts`, `plan.ts`, `verify.ts`).

**New file:** `apps/api/src/lib/errors.ts` → `patches/errors.ts`
**Replace (sample):** `apps/api/src/routes/analogies.ts` → `patches/analogies.ts`
**Replace (sample):** `apps/api/src/routes/ocr.ts` → `patches/ocr.ts`

---

## 🟡 Medium Priority

### 4. Unescaped user content in LaTeX generator
**File:** `apps/web/src/components/ExportPanel.tsx` (also `ExportPanel.tsx` at root)

`generateLaTeX()` interpolated `sessionName` directly into `\title{...}` and
message content into the LaTeX body. Characters like `&`, `%`, `#`, `_`, `^`,
`{`, `}`, `~`, `<`, `>`, and `\` all have special meaning in LaTeX. A session
named `"3 & 5% of x_1"` would produce a LaTeX file that fails to compile, and
a maliciously crafted session name could inject arbitrary LaTeX commands.

**Fix applied:**

Two escape functions:
- `latexEscapePlainText(text)` — for title/name strings that are pure plain text.
  Escapes all special chars including `$` and `\`.
- `latexEscapeBody(text)` — for assistant message content that may contain
  `$...$` and `$$...$$` math blocks. Splits on math delimiters and escapes only
  the plain-text segments, leaving KaTeX output intact.

The `\` escape runs **last** in the plain-text variant to avoid double-escaping
sequences that were already escaped by earlier passes.

**Replace:** `apps/web/src/components/ExportPanel.tsx` → `patches/ExportPanel.tsx`

---

### 5. Misplaced root-level files
**Files:** `auth.test.ts`, `domain.ts`, `index.ts`, `sessions.ts`, `useOCR.ts`
at the **repo root**

These are duplicates (or near-duplicates) of files in `apps/api/src/` and
`apps/web/src/`. They are not referenced by any `package.json`, `turbo.json`,
or import. They appear to be editor artefacts or partial copies created during
development.

**Fix:** Delete them from the repo root. No content is lost — canonical versions
live in their proper locations under `apps/`.

```bash
# From repo root
git rm auth.test.ts domain.ts index.ts sessions.ts useOCR.ts
```

If any differ from the canonical version, reconcile the diff before deleting.

---

### 6. `Math.random()` used for session IDs
**File:** `apps/web/src/state/sessions.ts`

`Math.random()` is not cryptographically random. While session IDs here are
not used for authentication (they are local IndexedDB keys), using predictable
IDs is a bad habit and causes real problems if sessions are ever shared via URL
(see `shareSession.ts`, which encodes them).

**Fix applied:** `generateId()` uses `crypto.randomUUID()`, which is available
in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and Node ≥ 19.
A `Math.random()`-based fallback is included for environments that lack the
Web Crypto API (very old browsers, some test runners).

The same pattern should be applied to `App.tsx` where session IDs are generated
inline:
```ts
// App.tsx line ~81 — change this:
currentSessionId.current = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
// to:
currentSessionId.current = typeof crypto?.randomUUID === 'function'
  ? `session-${crypto.randomUUID()}`
  : `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
```

**Replace:** `apps/web/src/state/sessions.ts` → `patches/sessions.ts`

---

## 🟢 Low Priority

### 7. JSON body size limit (50 MB → 10 MB)
**File:** `apps/api/src/index.ts`

The 50 MB limit on `express.json()` and `express.urlencoded()` is far larger
than any legitimate use case requires:
- Base64-encoded images for OCR: typically 1–5 MB
- PDB/FASTA files: 1–10 MB raw, but sent as text not JSON payload
- Jupyter notebook exports: < 1 MB

A 50 MB JSON body requires the Node.js process to buffer that much RAM per
concurrent request before any validation runs, creating a trivial memory
exhaustion vector for authenticated clients.

**Fix applied:** Default limit reduced to **10 MB**. Override by setting
`BODY_SIZE_LIMIT_MB` in `.env` if a specific deployment genuinely needs more.

**Replace:** `apps/api/src/index.ts` → `patches/index.ts`

---

### 8. DOCX export is a placeholder
**File:** `apps/web/src/components/ExportPanel.tsx`

The DOCX branch POSTed to `/api/export` with `format: 'plain'` (not `'docx'`),
which returns plain text. The file was then saved with a `.docx` extension —
a plain text file with a Word extension that Word cannot open.

**Fix applied in patch 4:** The download now uses `.txt` extension until a real
DOCX pipeline (e.g. `docx` npm package on the API side, or `mammoth`/`pizzip`
on the client) is implemented. The comment in the code now accurately describes
the current state instead of claiming server-side DOCX generation that does not
exist.

**Longer-term fix:** Implement a `/api/export/docx` endpoint using the `docx`
npm package (already indirectly available via `mammoth` in `apps/web/package.json`).

---

### 9. Commit pnpm-lock.yaml
**File:** `pnpm-lock.yaml` (missing from context — likely gitignored or absent)

The CI workflow installs with `--no-frozen-lockfile`, which means CI resolves
dependency versions fresh on every run. This can cause CI to pass with different
package versions than production, making builds non-reproducible.

**Fix:**
1. Ensure `pnpm-lock.yaml` exists at the repo root.
2. Remove `--no-frozen-lockfile` from the CI `Install dependencies` step.
3. Use `--frozen-lockfile` (the pnpm default in CI) instead.

```yaml
# .github/workflows/ci.yml — change:
- name: Install dependencies
  run: pnpm install --no-frozen-lockfile

# to:
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

If the lockfile is absent, run `pnpm install` locally first to generate it,
then commit it.

---

## File Map

| Patch file | Replaces |
|---|---|
| `patches/auth.ts` | `apps/api/src/middleware/auth.ts` |
| `patches/domain.ts` | `apps/api/src/routes/domain.ts` |
| `patches/errors.ts` | *(new)* `apps/api/src/lib/errors.ts` |
| `patches/analogies.ts` | `apps/api/src/routes/analogies.ts` |
| `patches/ocr.ts` | `apps/api/src/routes/ocr.ts` |
| `patches/ExportPanel.tsx` | `apps/web/src/components/ExportPanel.tsx` |
| `patches/sessions.ts` | `apps/web/src/state/sessions.ts` |
| `patches/index.ts` | `apps/api/src/index.ts` |

Apply remaining route fixes (bio, chat, codegen, export, hypothesis,
literature, plan, verify) by adding the same `import { serverError, toLogMessage } from '../lib/errors'`
header and swapping `res.status(500).json({ error: err.message })` for
`console.error('… error:', toLogMessage(err)); res.status(500).json(serverError())`.
