# ◈ Math X — Brainstorm: Ultimate Cross-Domain Scientific Research Workbench

> Status: brainstorming / RFC. Date: 2026-10-22. Repo: ncsound919/math-x (v0.5.0).

## 0. North Star

Turn Math X from a **single-user, chat-centric math assistant** into the **ultimate cross-domain, multi-discipline mathematics and scientific research workbench**:

- A researcher can drop *any* artifact (paper PDF, dataset, code, image, genome, simulation) and ask questions that span domains.
- Every claim is **verifiable** (symbolic, numeric, or formal), **traceable** (provenance), and **reproducible** (notebook).
- Computation is **edge-first** (WASM/WebGPU) but can **burst to cloud/HPC** on demand.
- AI is an **orchestrator**, not a black box: plans, uses tools, shows its work, and is checked by independent verifiers.

---

## 1. Current State Audit

### Strengths (keep & amplify)
- Monorepo (Turborepo + pnpm) with shared `@mathx/math-core`.
- Edge-native compute: single shared Pyodide worker (NumPy/SciPy/SymPy/Pandas/Biopython), DuckDB-Wasm.
- Multi-model routing (Claude / DeepSeek-R1 / Qwen2.5-Math) by mode.
- 8 modes + 16 domain-expert prompts; cross-domain analogy engine.
- Derivation verifier (SymPy per step), Monte Carlo, bioinformatics parsers, folder intel, RAG-ish memory.
- Export (MD/LaTeX/Jupyter), session persistence.

### Gaps vs. "ultimate"
- **Modality**: text + charts only; no notebooks, no canvas, no 3D scene graph, no interactive simulations with parameters that feed back.
- **Domain coverage**: 16 math domains; missing chemistry, earth science, medicine, engineering, social science, CS theory depth, astronomy, materials, neuroscience.
- **Knowledge layer**: local memory only (no vector DB, no literature connectors, no citation graph, no structured KG).
- **Verification**: SymPy only; no formal proof (Lean/Coq), no numeric cross-checks, no uncertainty quantification, no hallucination guards.
- **Compute**: CPU-only WASM; no WebGPU, no GPU burst, no distributed/parallel, no CAS (Wolfram/Sage).
- **Collaboration**: single-user, localStorage sessions; no sharing, no multi-user, no versioning.
- **Extensibility**: hardcoded domains/modes; no plugin API.
- **Reproducibility**: exports exist but no pinned environments, no artifact hashing, no "re-run" button.
- **Trust**: no provenance, no confidence calibration, no source citations inline.

---

## 2. Expansion Pillars

### Pillar A — Discipline & Domain Coverage (the "multi-discipline" half)

**Mathematics (deepen)**
- Pure: algebraic geometry, number theory (analytic/arith), topology (differential/algebraic), category theory, homotopy type theory, model theory, set theory, combinatorics, probability theory, measure theory, functional analysis, harmonic analysis, operator algebras, dynamical systems, ergodic theory, chaos, fractals.
- Applied: numerical analysis, optimization (convex/nonconvex/stochastic), control, signal processing, information theory, coding theory, game theory, mechanism design, operations research, statistics (frequentist/Bayesian/nonparametric/causal).

**Natural Sciences**
- Physics: classical/quantum/relativistic/statistical/condensed matter/HEDP/astrophysics/cosmology/particle.
- Chemistry: quantum chem, thermodynamics, kinetics, spectroscopy, cheminformatics (RDKit in WASM?), materials science.
- Biology: genomics, proteomics, systems biology, ecology, evolution, neuroscience, epidemiology, pharmacology.
- Earth & Space: climate, geophysics, oceanography, astronomy, planetary science.
- Medicine: clinical stats, imaging, bioinformatics, epidemiology.

**Engineering & CS**
- EE, ME, CE, aerospace, robotics, control, signal, HPC, algorithms, complexity, cryptography, ML/AI math, software verification.

**Social & Formal Sciences**
- Economics, finance (quant), sociology (networks), linguistics (formal), philosophy of math.

**Implementation**: convert `DOMAIN_SYSTEM_PROMPTS` (string map) into a **domain registry** with metadata: id, name, parent, keywords, symbol glossary, default tools, example queries, verification strategy, and a pluggable prompt template. Auto-suggest domains from query via embedding classifier.

### Pillar B — Modalities & Workbench UX

- **Notebook mode**: Jupyter-like cells (markdown + code + output) with re-run, ordering, and export. Each cell can be math, Python, SQL, or "AI cell".
- **Canvas / whiteboard**: infinite canvas for diagrams, equation graphs, concept maps (React Flow / tldraw). AI can draw.
- **3D scene graph**: Plotly + Three.js/WebGPU for manifolds, molecules, fields, trajectories.
- **Interactive simulations**: parameter sliders that re-run WASM compute live (already `ParameterSliders` — generalize).
- **Document workspace**: PDF viewer with annotation, equation extraction, "ask about selection".
- **Dashboard mode**: compose charts/tables into a dashboard for a dataset.
- **Graph explorer**: knowledge graph of concepts/papers/equations with traversal.

### Pillar C — Knowledge & Literature Layer

- **Vector store**: DuckDB + pgvector (optional) or in-browser (Transformers.js embeddings) for RAG over user corpus + cached literature.
- **Literature connectors**: arXiv, PubMed, Semantic Scholar, Crossref, OpenAlex, bioRxiv/medRxiv. Fetch abstracts, full text where allowed, citations.
- **Citation graph**: build and traverse citation networks; "what papers cite this result".
- **Structured KG**: concepts, theorems, definitions, equations as nodes; relations (proves, generalizes, contradicts, applies-to). Enables "find all theorems that use this lemma".
- **Dataset catalog**: HuggingFace datasets, Kaggle, UCI, Zenodo; one-click load into DuckDB.
- **Personal memory**: long-term memory across sessions with consent & export/delete.

### Pillar D — Compute Layer

- **WebGPU**: GPU-accelerated linear algebra, FFT, Monte Carlo, neural net inference (via ONNX Runtime Web / Transformers.js). New `useWebGPU` hook.
- **WASM kernels**: extend Pyodide with more packages (RDKit? not available; use JS cheminformatics). Add SciPy stats, scikit-learn, statsmodels, networkx, sympy (already), mpmath, sage-lite.
- **Symbolic CAS bridge**: optional Wolfram Cloud / SageMath / SymPy (local) / Maxima. Unified "CAS" abstraction.
- **HPC burst**: optional cloud runner (Lambda/Batch/ECS or user's own) for heavy jobs; queue + progress + artifacts.
- **Distributed compute**: WebRTC/worker pools for embarrassingly parallel Monte Carlo.
- **Reproducibility**: pin package versions, hash inputs/outputs, store run metadata (like MLflow).

### Pillar E — AI Orchestration & Agents

- **Planner/executor**: current `/api/plan` → generalize to multi-step agent with tool calls (compute, search, fetch, verify, plot).
- **Tool registry**: standardized tools (run_python, run_sql, search_literature, fetch_paper, verify_step, plot, optimize, solve_ode, etc.) exposed to model via function calling.
- **Multi-model council**: for hard problems, run 2–3 models and reconcile (debate/consensus) with a judge.
- **Specialist agents**: per-domain agents with tools + retrieval; a "router agent" delegates.
- **Memory**: episodic (session), semantic (facts), procedural (workflows).
- **Self-critique**: model reviews its own output; verifier checks; loop until trust threshold.
- **Cost/latency aware**: choose cheapest model that meets confidence; cache.

### Pillar F — Verification & Trust

- **Symbolic**: SymPy (local) for algebra/calculus; Z3 for SMT/proofs.
- **Formal proof**: Lean 4 / Coq via WASM (lean4-web) or cloud; "prove this lemma" mode with tactic suggestions.
- **Numeric**: independent re-computation with different library; finite-difference checks; unit tests on generated code.
- **Statistical**: bootstrap CIs, power analysis, multiple-testing correction, reproducibility checks.
- **Uncertainty quantification**: every numeric answer carries CI / error bars; propagate uncertainty.
- **Provenance**: every statement cites source (paper, dataset, computation run id); inline citation markers.
- **Hallucination guard**: retrieval-grounded answers; "I don't know" when no support; flag speculative.
- **Benchmarks**: maintain an eval suite (GSM8K, MATH, FrontierMath, SciBench, BioASQ) to track regressions.

### Pillar G — Collaboration & Sharing

- **Accounts & workspaces**: optional auth (Cognito/Auth0) with teams.
- **Sharing**: read-only links, embeds, published notebooks.
- **Versioning**: git-like for notebooks (fork, diff, merge).
- **Comments/annotations**: on equations, charts, cells.
- **Real-time collab**: CRDT (Yjs) for shared notebooks.

### Pillar H — Extensibility & Ecosystem

- **Plugin API**: register new domains, tools, visualizations, data connectors, export formats.
- **Custom models**: bring-your-own endpoint (OpenAI-compatible) via settings.
- **Webhooks / API**: expose Math X as a service (REST + MCP server) so other agents can use it.
- **MCP server**: Math X itself as an MCP tool provider (compute, verify, search).
- **Theme & i18n**.

### Pillar I — Data Science & AutoML (adjacent)

- Auto-EDA, feature engineering, model training (scikit-learn in WASM), experiment tracking.
- Causal inference (DoWhy/EconML).
- Time series, spatial, network analysis.

---

## 3. Cross-Cutting Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  UI: Workbench (React) — Notebook | Canvas | Chat | Dash  │
├─────────────────────────────────────────────────────────────┤
│  State: sessions, memory, workspaces (Yjs/CRDT optional)    │
├─────────────────────────────────────────────────────────────┤
│  Client Compute: Pyodide worker, DuckDB, WebGPU, ONNX      │
├─────────────────────────────────────────────────────────────┤
│  API (edge/Node): orchestrator, auth, rate limit, routing  │
├─────────────────────────────────────────────────────────────┤
│  Services: planner/agent, tools, RAG, literature, CAS,     │
│            verification, provenance, eval                  │
├─────────────────────────────────────────────────────────────┤
│  Data: vector store, KG, dataset cache, artifact store     │
├─────────────────────────────────────────────────────────────┤
│  External: LLMs, arXiv/PubMed/OpenAlex, CAS, HPC, MCP     │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions to make**
1. Edge-first vs. cloud-first for RAG/vector store (in-browser Transformers.js vs. server pgvector).
2. Formal proof: ship Lean in WASM (heavy, ~tens MB) or cloud-only.
3. Collaboration: real-time CRDT vs. async sharing only.
4. Plugin sandboxing: iframe/worker vs. trusted code.
5. Monetization/licensing if any (not required for brainstorm).

---

## 4. Phased Roadmap (suggested)

- **Phase 1 (foundation, 4–6 wk)**: Domain registry refactor; notebook mode; RAG with local vector store + arXiv connector; WebGPU hook; provenance/citations; eval harness.
- **Phase 2 (depth, 6–10 wk)**: Agent tool-calling loop; formal verification (Z3 + Lean cloud); 3D scene graph; collaboration (sharing + versioning); CAS bridge; more domains (chem/bio/earth/eng).
- **Phase 3 (scale, 8–12 wk)**: HPC burst; distributed Monte Carlo; real-time collab; plugin API; MCP server; AutoML/data science.
- **Phase 4 (polish)**: benchmarks, accessibility, i18n, docs, community.

---

## 5. "Ultimate" Differentiators (what makes this not just another chatbot)

1. **Every answer is a notebook cell** — reproducible, re-runnable, exportable.
2. **Independent verification** — SymPy/Z3/Lean check the AI; trust scores shown.
3. **Cross-domain by construction** — analogy engine + KG make connections first-class, not an afterthought.
4. **Edge-native privacy** — sensitive data (genomes, patient data) never leaves the browser unless user opts in.
5. **Provenance everywhere** — no untraceable claims; citations inline.
6. **Burst compute** — start local, scale to HPC without leaving the workbench.
7. **Open & extensible** — plugin API + MCP server turns Math X into infrastructure, not just an app.

---

## 6. Open Questions for You

1. **Primary user**: solo researcher, lab/team, or classroom/education? (drives collab & auth priority)
2. **Deployment target**: fully static/edge (Cloudflare Pages) vs. self-hosted Docker vs. hosted SaaS?
3. **Formal proof**: is Lean/Coq integration a must-have, or is SymPy+Z3 enough?
4. **Scope of disciplines**: start with math+physics+ bio (current) and expand, or jump to full multi-discipline now?
5. **Monetization / sustainability**: OSS-only, freemium, or enterprise? (affects HPC burst & account design)
6. **Which pillar to prototype first?** (my recommendation: Pillar C knowledge layer + Pillar B notebook mode, since they compound everything else)

---

## 7. Decisions (from brainstorm Q&A)

- **Primary user**: Solo researcher → prioritize offline-first, single-user, no auth initially; collaboration deferred.
- **First prototype pillar**: Knowledge + Literature (RAG, arXiv/PubMed connectors, citation graph).
- **Deployment**: Hybrid via Cloudflare — static frontend on Cloudflare Pages; API as Cloudflare Workers (or Pages Functions) exposing REST endpoints that other apps can call; heavy compute stays local (WASM) with optional burst.
- **Domain registry**: scaffolded (`packages/math-core/src/domains/registry.ts`) — structured, metadata-rich, backward-compatible with `DOMAIN_SYSTEM_PROMPTS`.

## 8. Cloudflare Deployment Sketch

- `apps/web` → Cloudflare Pages (Vite build). Env: `VITE_API_URL=https://mathx-api.<you>.workers.dev`.
- `apps/api` → port to **Hono** on Cloudflare Workers (or keep Express behind a container/DO). Each route becomes a Worker endpoint callable by external apps.
- Secrets via `wrangler secret put` (ANTHROPIC_API_KEY, API_KEYS).
- Rate limiting via Cloudflare (WAF / Rate Limiting rules) instead of in-process middleware.
- Vector store: start with in-browser (Transformers.js) for privacy; optional Cloudflare Vectorize for shared/public corpora.
- Heavy compute (Pyodide) stays in the browser; Worker only orchestrates + RAG + literature.

## 7. Next Concrete Steps (if you say go)

Progress:
- [x] Refactor `DOMAIN_SYSTEM_PROMPTS` → domain registry (`packages/math-core/src/domains/`).
- [x] OpenAlex connector + citation graph + unified multi-source search (`apps/api/src/routes/literature.ts`).
- [x] Vercel AI SDK chat route with tool calling (`/api/chat-ai`) — searchLiterature + getCitations tools.
- [x] Cloudflare Worker scaffold (`apps/worker`) — Hono, auth, OpenAlex search-all, streaming chat-ai.
- [x] Local vector store (Transformers.js embeddings in worker) + in-browser RAG (`apps/web/src/hooks/useEmbeddings.ts`, `utils/vectorStore.ts`, `workers/embeddingWorker.ts`).
- [x] Wired embeddings into LiteraturePanel (auto-ingest + semantic RAG search box).
- [x] Provenance markers in message rendering (ResultsPane + Message type).
- [x] Cloudflare deploy docs + worker scaffold (`apps/worker/DEPLOY.md`).
- [x] Deploy worker to Cloudflare — live at https://mathx-api.tap4500.workers.dev (Gemini-backed, streaming).
- [x] Full audit: typecheck clean (api/web/worker), web build passes, tests 23+5 passing; fixed auth dev-mode, chat validation, ProofVerifier props, MafsPlot/PlotView types, sessions tags, WebGPU globals.
- [x] Expanded domain registry: +24 domains (topology, set theory, stochastic processes, econometrics, pharmacology, epidemiology, combinatorial optimization, etc.).
- [x] Client analysis tools module (`apps/web/src/utils/analysis.ts`): descriptive stats, linear regression, numerical derivative/integral, optimization, matrix ops, FFT, linear solve.
- [x] JEV (Judgment, Evaluation, Verification) decision model (`apps/web/src/utils/jev.ts`) producing certainty scores.
- [x] Agentic Analysis Lab UI (`apps/web/src/components/AnalysisLab.tsx`) with JEV certainty display.
- [x] Oncology pain-point domains (+10): oncology statistics, tumor genomics, clinical trials math, radiotherapy optimization, drug synergy, resistance evolution, single-cell, spatial omics, model calibration/uncertainty, reproducibility audit.
- [x] Oncology Analysis Lab (`apps/web/src/utils/oncology.ts` + `components/OncologyLab.tsx`): all 20 pain points now covered — BH-FDR, batch diagnostics, RMST, ctDNA LOD/FN, tumor purity, TMB calibration, Bliss/HSA synergy, BOIN, conformal, reproducibility, power/Bayesian borrowing, surrogate correlation, E-values, clonal tree enumeration, signature stability, driver gene null, single-cell dropout, Moran's I spatial, identifiability, adaptive therapy replicator dynamics, radiotherapy DVH — each with JEV certainty.
- [x] WebGPU compute hook (`apps/web/src/hooks/useWebGPU.ts`).
- [x] Cloudflare Pages-ready: set `VITE_API_URL=https://mathx-api.tap4500.workers.dev` in web env.
- [x] Eval harness: 50-problem dataset + runner (`apps/api/evals/`).
- [x] Notebook mode UI (`apps/web/src/components/Notebook.tsx`) with run-all + export.
- [ ] Provenance/citation markers in message rendering.
- [ ] Provenance/citation markers in message rendering.
- [ ] Eval harness with 50 problems + CI.
- [ ] WebGPU compute hook skeleton.
- [ ] Notebook mode UI.
- [ ] Port API to Cloudflare Workers (Hono).
- [ ] Write `PLUGIN_API.md` spec.

- [ ] Refactor `DOMAIN_SYSTEM_PROMPTS` → domain registry (`packages/math-core/src/domains/`).
- [ ] Add `NotebookCell` type + notebook UI route.
- [ ] Implement local vector store (Transformers.js embeddings in worker) + arXiv connector route.
- [ ] Add provenance/citation markers to message rendering.
- [ ] Stand up eval harness with 50 problems + CI.
- [ ] WebGPU compute hook skeleton.
- [ ] Write `PLUGIN_API.md` spec.

Tell me which direction excites you most and I'll start scaffolding.