# ◈ MATH X

> Cross-Domain Mathematical Intelligence — Edge-Native AI Research System

![License](https://img.shields.io/badge/license-MIT-f0a500)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Pyodide%20%2B%20DuckDB-00e5b0)
![Version](https://img.shields.io/badge/version-0.5.0-f0a500)

## What is Math X?

Math X is a full-stack, edge-first AI mathematics system that combines:

- 🧠 **Multi-Model AI** — Claude cloud + DeepSeek-R1 local + Qwen2.5-Math symbolic, auto-routed by mode
- ⚙️ **Pyodide/WASM** — Python 3.12 (NumPy, SymPy, SciPy, Pandas, Biopython) running locally in a single shared worker
- 📊 **DuckDB-Wasm** — In-browser analytical SQL for large CSV/Parquet/JSON datasets
- 🗂️ **Folder Intelligence** — Drop any folder of PDFs, code, CSVs, or images for instant analysis
- 🎲 **Probability Lab** — Monte Carlo, Bayesian inference, stochastic processes
- 🔬 **Bioinformatics** — Parse FASTA, FASTQ, VCF, BED, GFF, PDB files locally; no data leaves the browser
- 📈 **Interactive Charts** — ECharts 5 (large-scale) + Plotly (3D) + Mafs (function plots)

## Architecture

```
mathx/
├─ apps/
│  ├─ web/          # React frontend — minimal omnibar UI
│  └─ api/          # Express backend — orchestration, model routing, auth
├─ packages/
│  ├─ math-core/    # Shared math utilities, prompt schemas, routing logic
│  ├─ ui/           # Shared design system components
│  ├─ shared/       # Types, constants, utilities
│  └─ schemas/      # Zod validation schemas
└─ turbo.json
```

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| AI Reasoning (cloud) | Anthropic Claude (claude-sonnet-4) |
| AI Reasoning (local) | DeepSeek-R1 via Ollama |
| AI Math Specialist | Qwen2.5-Math via Ollama |
| Model Routing | Auto by mode (formula→Qwen, research→DeepSeek, complex→Claude) |
| Shared Logic | `@mathx/math-core` — routing, prompts, domain configs |
| Local Math | Pyodide 0.27 — single shared WASM worker (NumPy, SymPy, SciPy, Pandas, Biopython) |
| Local Data | DuckDB-Wasm 1.x |
| Charts | ECharts 5 + Plotly.js (3D) + Mafs (2D functions) |
| Math Rendering | KaTeX |
| Auth | Bearer token (API_KEYS env var) |
| Monorepo | Turborepo + pnpm |

## Modes

| Mode | Description |
|---|---|
| ◈ Scientist | Cross-domain research & pattern discovery |
| ∿ Formula Lab | Build, mutate, and translate formulas |
| ⬡ Hypothesis | Generate & test mathematical hypotheses |
| ∂ Deep Solve | Rigorous step-by-step solutions |
| ⊗ Synergy | Hidden cross-domain connections |
| 🎲 Probability | Monte Carlo, Bayesian, stochastic systems |
| ◫ File Intel | Analyze uploaded documents & datasets |
| 🧬 Bioinformatics | FASTA, FASTQ, VCF, PDB, BED, GFF parsed locally |
| ∫ Domain Expert | Advanced mathematics specialist (15 domains) |

## Quick Start

```bash
# 1. Install dependencies (requires pnpm 9+)
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — set ANTHROPIC_API_KEY and API_KEYS

# 3. Generate an API key (minimum 32 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output into API_KEYS= in apps/api/.env
# Also add it to apps/web/.env as VITE_API_KEY=<same_value>

# 4. Start all services
pnpm dev
# API:  http://localhost:5000
# Web:  http://localhost:3000
```

## Auth

All `/api/*` routes require a `Authorization: Bearer <key>` header. The health endpoint (`/health`) is exempt.

```bash
# Generate a key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# apps/api/.env
API_KEYS=your_key_here          # comma-separated for rotation: key1,key2

# apps/web/.env
VITE_API_KEY=your_key_here      # same value — sent with every fetch
```

Key rotation: add the new key to `API_KEYS` before removing the old one — both work simultaneously during the transition.

## Local AI Setup (Zero API Cost Mode)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models (one-time, ~9GB total)
ollama pull deepseek-r1:8b     # General reasoning
ollama pull qwen2.5-math:7b    # Symbolic math specialist
```

Then in `apps/api/.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
QWEN_BASE_URL=http://localhost:11434
QWEN_MODEL=qwen2.5-math:7b
# Leave ANTHROPIC_API_KEY blank for 100% local operation
```

## Docker (Production)

```bash
# Build and run both services
docker compose up --build

# Or build individually
docker build -f apps/api/Dockerfile -t mathx-api .
docker build -f apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://your-api-domain.com \
  --build-arg VITE_API_KEY=your_key \
  -t mathx-web .
```

> **Note on Genome Browser:** The `GenomeBrowser` component loads IGV.js and reference genome data from external CDNs. This feature requires internet access and does not run fully offline. All other features (Pyodide math, DuckDB, bio file parsing, RAG) are genuinely edge-native.

## Environment Variables

```env
# apps/api/.env
API_KEYS=your_key_here               # Required — comma-separated, min 32 chars each
ANTHROPIC_API_KEY=your_key_here      # Optional if using local models only
MODEL=claude-sonnet-4-20250514
MAX_TOKENS=4000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
QWEN_BASE_URL=http://localhost:11434
QWEN_MODEL=qwen2.5-math:7b
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000

# apps/web/.env
VITE_API_KEY=your_key_here           # Must match one of API_KEYS above
```

## Features

### Multi-Model Routing
Auto-routes by mode via `@mathx/math-core`: Formula Lab and Deep Solve → Qwen2.5-Math; Scientist, Hypothesis, Synergy → DeepSeek-R1; everything else → Claude. Falls back to Claude if local models are unreachable.

### Pyodide — Single Shared Worker
All WASM computation (general math, SymPy verification, bio file parsing) shares one Pyodide runtime via `PyodideWorkerManager`. Base packages (NumPy, SciPy, SymPy) load at boot; Pandas and Biopython load lazily on first bio request.

### Bioinformatics
Drop FASTA, FASTQ, VCF, BED, GFF, or PDB files into the left drawer. Parsed locally via Biopython/WASM — no data leaves the browser. Stats, quality metrics, and suggested analyses are injected into the Claude context automatically.

### Folder Upload
Drop any folder. PDFs, CSVs, code files, and images are parsed locally. Data never leaves the browser.

### Monte Carlo Simulation
Probability Lab runs vectorized NumPy simulations locally in WebAssembly.

### Derivation Verification
Deep Solve mode generates step-by-step derivations; each algebraic step is independently verified by SymPy running locally. Steps get VERIFIED ✓ or UNVERIFIED ⚠ badges with a trust score.

## License

MIT © Overlay Eco
