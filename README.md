# ◈ MATH X

> Cross-Domain Mathematical Intelligence — Edge-Native AI Research System

![License](https://img.shields.io/badge/license-MIT-f0a500)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Pyodide%20%2B%20DuckDB-00e5b0)
![Version](https://img.shields.io/badge/version-0.4.0-f0a500)

## What is Math X?

Math X is a full-stack, edge-first AI mathematics system that combines:

- 🧠 **Multi-Model AI** — Claude cloud + DeepSeek-R1 local + Qwen2.5-Math symbolic, auto-routed by mode
- ⚙️ **Pyodide/WASM** — Python 3.12 (NumPy, SymPy, SciPy, Pandas, scikit-learn) running locally
- 📊 **DuckDB-Wasm** — In-browser analytical SQL for large CSV/Parquet/JSON datasets
- 🗂️ **Folder Intelligence** — Drop any folder of PDFs, code, CSVs, or images for instant analysis
- 🎲 **Probability Lab** — Monte Carlo, Bayesian inference, stochastic processes
- 🔍 **Edge RAG** — LanceDB local vector memory for cross-domain document retrieval
- 📈 **Interactive Charts** — ECharts 5 (large-scale) + Plotly (3D) + Mafs (function plots)

## Architecture

```
mathx/
├─ apps/
│  ├─ web/          # React frontend — minimal omnibar UI
│  └─ api/          # Express backend — orchestration, model routing, auth
├─ packages/
│  ├─ math-core/    # Shared math utilities, prompt schemas, engines
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
| Local Math | Pyodide 0.27 (NumPy, SymPy, SciPy, Pandas, scikit-learn) |
| Local Data | DuckDB-Wasm 1.x |
| Local Memory | LanceDB (browser-native) |
| Charts | ECharts 5 (large data) + Plotly.js (3D) + Mafs (2D functions) |
| Math Rendering | KaTeX (replaces MathJax — 10x faster) |
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

## Local AI Setup (Zero API Cost Mode)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models (one-time)
ollama pull deepseek-r1:8b     # General reasoning ~4.9GB
ollama pull qwen2.5-math:7b    # Symbolic math specialist ~4.1GB

# Verify
ollama list
```

Then set in `apps/api/.env`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
QWEN_MODEL=qwen2.5-math:7b
# Leave ANTHROPIC_API_KEY blank for 100% local operation
```

The **ModelSelector** UI component in the Omnibar lets you switch between Auto / Claude / DeepSeek-R1 / Qwen2.5-Math at any time.

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your API key (optional if using local models)
cp apps/api/.env.example apps/api/.env

# Start all services
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:5000
- Model status: http://localhost:5000/api/models

## Features

### Multi-Model Routing
The API automatically routes queries to the best available model based on mode. Formula Lab and Deep Solve use Qwen2.5-Math (specialized symbolic reasoning). Scientist and Hypothesis modes use DeepSeek-R1 locally when Ollama is running. Claude handles complex multi-modal queries and is always available as fallback.

### Folder Upload
Drop any folder directly into Math X. It will parse PDFs, CSVs, code files, and images locally — no upload to any server. Your data never leaves the browser.

### Monte Carlo Simulation
The Probability Lab runs vectorized NumPy simulations locally in WebAssembly. Ask Math X to simulate option prices, random walks, epidemiological spread, or any stochastic process.

### Edge RAG
All uploaded documents are chunked, embedded, and stored in a local LanceDB vector index. Math X retrieves the most relevant mathematical context before every query — no cloud vector DB required.

### Lazy Extra Packages
Pyodide can load additional packages on demand (`pandas`, `scikit-learn`, `statsmodels`, `networkx`) via the `loadExtra()` API without restarting the kernel.

### Zero-Copy Charts
ECharts renders large simulation datasets (100k+ points) natively via canvas. Pyodide passes NumPy arrays to Plotly.js via memory bridge for 3D surface plots — no JSON serialization overhead.

## Environment Variables

```env
# apps/api/.env
ANTHROPIC_API_KEY=your_key_here   # Optional if using local models
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:8b
QWEN_BASE_URL=http://localhost:11434
QWEN_MODEL=qwen2.5-math:7b
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## License

MIT © Overlay Eco
