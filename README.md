# ◈ MATH X

> Cross-Domain Mathematical Intelligence — Edge-Native AI Research System

![License](https://img.shields.io/badge/license-MIT-f0a500)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20Pyodide%20%2B%20DuckDB-00e5b0)

## What is Math X?

Math X is a full-stack, edge-first AI mathematics system that combines:

- 🧠 **LLM Reasoning** — Claude-powered cross-domain scientific intelligence
- ⚙️ **Pyodide/WASM** — Python (NumPy, SymPy, SciPy) running locally in the browser
- 📊 **DuckDB-Wasm** — In-browser analytical SQL for large CSV/Parquet/JSON datasets
- 🗂️ **Folder Intelligence** — Drop any folder of PDFs, code, CSVs, or images for instant analysis
- 🎲 **Probability Lab** — Monte Carlo, Bayesian inference, stochastic processes
- 🔍 **Edge RAG** — LanceDB local vector memory for cross-domain document retrieval
- 📈 **Interactive Charts** — Zero-copy Plotly rendering from WASM data

## Architecture

```
mathx/
├─ apps/
│  ├─ web/          # React frontend — minimal omnibar UI
│  └─ api/          # Express backend — orchestration, routing, auth
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
| AI Reasoning | Anthropic Claude (claude-sonnet) |
| Local Math | Pyodide 0.23 (NumPy, SymPy, SciPy, Pandas) |
| Local Data | DuckDB-Wasm |
| Local Memory | LanceDB (browser-native) |
| Charts | Plotly.js (zero-copy from WASM) |
| Monorepo | Turborepo + pnpm |
| Math Rendering | MathJax 3 |

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

## Quick Start

```bash
# Install dependencies
pnpm install

# Set your API key
cp apps/api/.env.example apps/api/.env
# Add ANTHROPIC_API_KEY=your_key_here

# Start all services
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:5000

## Features

### Folder Upload
Drop any folder directly into Math X. It will parse PDFs, CSVs, code files, and images locally — no upload to any server. Your data never leaves the browser.

### Monte Carlo Simulation
The Probability Lab runs vectorized NumPy simulations locally in WebAssembly. Ask Math X to simulate option prices, random walks, epidemiological spread, or any stochastic process.

### Edge RAG
All uploaded documents are chunked, embedded, and stored in a local LanceDB vector index. Math X retrieves the most relevant mathematical context before every query — no cloud vector DB required.

### Zero-Copy Charts
Pyodide passes NumPy arrays directly to Plotly.js via memory bridge — no JSON serialization overhead for large datasets.

## Environment Variables

```env
# apps/api/.env
ANTHROPIC_API_KEY=your_key_here
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## License

MIT © Overlay Eco
