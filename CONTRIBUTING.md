# Contributing to Math X

Thank you for your interest in contributing. Math X is an edge-native AI math platform and contributions across backend, frontend, verification, and documentation are all welcome.

## Quick Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/math-x.git
cd math-x

# 2. Install dependencies (requires pnpm 9+)
pnpm install

# 3. Copy environment variables
cp apps/api/.env.example apps/api/.env
# Add your ANTHROPIC_API_KEY to apps/api/.env

# 4. Start dev servers
pnpm dev
# API runs on http://localhost:5000
# Web runs on http://localhost:3000

# 5. (Optional) Start Ollama for local model support
ollama pull qwen2.5-math
ollama pull deepseek-r1
```

## Branch Strategy

| Branch | Purpose |
|--------|--------|
| `main` | Stable, release-ready |
| `dev` | Integration branch |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, deps, config |
| `test/*` | Test additions |

Always branch from `dev`, not `main`.

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add GenomeBrowser chromosome zoom
fix: correct SSE stream abort on client disconnect
chore: update Pyodide to 0.28.0
test: add verify route integration tests
docs: update math-core README with API examples
```

## Pull Request Rules

- Target `dev` branch (never `main` directly)
- CI must pass (lint + typecheck + build + test)
- New features require tests
- One approval required from a maintainer
- Keep PRs focused: one concern per PR

## Running Tests

```bash
# Run all tests
pnpm turbo test

# Run tests for a specific package
pnpm --filter @math-x/api test
pnpm --filter @math-x/web test

# Watch mode
pnpm --filter @math-x/api test:watch
```

## Code Style

- TypeScript strict mode across all packages
- ESLint + Prettier enforced (run `pnpm turbo lint`)
- No `any` types without a comment explaining why
- React components: functional + hooks only
- Backend: Express + Zod validation on all routes

## Architecture Notes

- **Model routing**: `apps/api/src/services/modelRouter.ts` controls provider selection
- **Verification**: `apps/api/src/routes/verify.ts` + `apps/web/src/workers/useSymPyVerifier.ts`
- **Shared packages**: Logic that spans API and web belongs in `packages/math-core`
- **Worker hooks**: All WASM/worker hooks live in `apps/web/src/workers/` and export from `workers/index.ts`

## Getting Help

Open an issue with the `question` label or start a Discussion on GitHub.
