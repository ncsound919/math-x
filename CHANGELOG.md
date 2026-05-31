# Changelog

All notable changes to Math X are documented in this file.
This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.

---

## [0.5.0] - 2026-05-30

### Added
- `packages/math-core` — real shared package with 7 implementation files: `types.ts`, `modelRouter.ts`, `prompts.ts`, `domainPrompts.ts`, `verify.ts`, `tokenizer.ts`, `index.ts`
- `ExampleGallery` component — 20 curated prompts across all 7 modes with filters, search, copy-to-clipboard, and "Try this" wiring
- Production Dockerfiles for `apps/api` and `apps/web` (3-stage builds, non-root user, nginx)
- Bearer token authentication with SHA-256 key hashing, timing-safe comparison, and fail-fast boot in production
- DOMPurify + `escapeHtml` XSS sanitization; `<a>` tags forbidden in rendered math output
- Single shared Pyodide WASM worker (`PyodideWorkerManager`) replacing 3 concurrent instances
- IndexedDB-only session storage (replaced split localStorage/IndexedDB approach)
- `pino` structured logging with `authorization` header and API key redaction
- `PyodideErrorBoundary` with retry UX for WASM failures
- Rate limiting on `/chat`, `/verify`, `/ocr`, `/literature` endpoints
- `vitest` test configs with coverage for both `apps/api` (node) and `apps/web` (jsdom) with Web Worker stubs
- Full monorepo lint coverage — all four packages now have a `lint` script
- `tsconfig.json` added to `packages/math-core`, `packages/ui`, `packages/shared`
- `build` script added to all shared packages
- `SECURITY.md` — security model, vulnerability reporting, and self-hosting checklist
- `CONTRIBUTING.md` — setup, branch strategy, commit conventions
- CSS variable migration — 0 hardcoded hex values, 338 CSS var references across 32 files
- `FIXES.md` — living document of patch history
- GitHub Actions CI workflow (lint, typecheck, build, test with coverage upload)
- `docker-compose.yml` for local development (api + web + Ollama services)

### Fixed
- Missing `logger` import in `apps/api/src/services/modelRouter.ts`
- `export.ts` route was registered as dead code — now active
- Real token count from Ollama SSE stream (was hardcoded 0)
- `VerifyResult` type mismatch in verification pipeline
- IGV.js and NGL bundled via npm instead of CDN runtime

### Deprecated
- `apps/api/src/services/domainPrompts.ts` — thin re-export from `@mathx/math-core`; use the package directly
- `apps/api/src/services/prompts.ts` — thin re-export from `@mathx/math-core`; use the package directly

---

## [0.4.0] - 2026-04-30

### Added
- Model router with DeepSeek-R1, Qwen2.5-Math, and Claude provider support
- KaTeX rendering for LaTeX output
- ECharts integration for data visualization
- Pyodide extras (NumPy, SciPy, SymPy, scikit-learn, Biopython) in WASM worker
- `ModelSelector` UI component
- Session persistence via IndexedDB
- `LeftDrawer` with session history
- Per-mode `MAX_TOKENS` override (Deep Solve: 8000, others: 4000)

---

## [0.3.0] - 2026-04-30

### Added
- `ParameterSliders` component for interactive equation parameter tuning
- `PlotView` with Plotly.js integration
- `MoleculeViewer` (NGL.js) for 3D molecular visualization
- `GenomeBrowser` (IGV.js) for genomic data visualization
- `ProofTree` component for structured proof display
- API routes: `/bio`, `/hypothesis`, `/analogies`
- `DuckDB-WASM` for in-browser analytical SQL on CSV/Parquet/JSON files
- `LanceDB` edge RAG with local vector memory

---

## [0.2.0] - 2026-04-01

### Added
- 7 reasoning modes: Scientist, Formula Lab, Hypothesis, Deep Solve, Synergy, Probability, File Intel
- `Omnibar` unified input interface
- `ResultsPane` streaming output
- OCR route for handwritten math recognition
- Literature search with RAG pipeline
- `ProofVerifier` and `DerivationVerifier` with SymPy backend

---

## [0.1.0] - 2026-03-15

### Added
- Initial monorepo scaffold (Turborepo + pnpm workspaces)
- `apps/api` (Express + TypeScript)
- `apps/web` (Vite + React + TypeScript)
- Basic chat route with Anthropic Claude streaming
- ESLint + Prettier configuration
