import { useState } from "react";

const EXAMPLES = [
  {
    id: "wave-interference",
    mode: "scientist",
    modeLabel: "Scientist",
    modeColor: "#f0a500",
    title: "Wave interference & superposition",
    subtitle: "Why does destructive interference conserve energy?",
    tags: ["physics", "waves", "cross-domain"],
    prompt: "Explain wave interference and superposition. Why does destructive interference conserve energy, and what does this tell us about the information-theoretic structure of the wave equation? Find the cross-domain analogue.",
    preview: "Explores the surprising connection between wave mechanics, quantum probability amplitudes, and communication channel capacity. Shows how Shannon entropy appears in the interference pattern.",
  },
  {
    id: "navier-stokes",
    mode: "scientist",
    modeLabel: "Scientist",
    modeColor: "#f0a500",
    title: "Navier-Stokes & turbulence",
    subtitle: "Unsolved millennium problem, visualised",
    tags: ["fluid dynamics", "PDEs", "millennium"],
    prompt: "What makes the Navier-Stokes existence and smoothness problem so hard? Show me the mathematical structure of turbulence and connect it to the renormalization group in quantum field theory.",
    preview: "Unpacks why smooth solutions might blow up in finite time, maps the analogy to QFT's ultraviolet divergences, and explains what 'energy cascade' really means mathematically.",
  },
  {
    id: "euler-identity",
    mode: "formula",
    modeLabel: "Formula Lab",
    modeColor: "#00e5b0",
    title: "Euler's identity derivation",
    subtitle: "e^(iπ) + 1 = 0 — full chain",
    tags: ["complex analysis", "calculus", "beauty"],
    prompt: "Derive Euler's identity e^(iπ) + 1 = 0 from first principles via the Taylor series. Then translate this formula to 3 other domains — what is its structural analogue in quantum mechanics, signal processing, and topology?",
    preview: "Full derivation chain via Taylor expansion, then maps to U(1) gauge symmetry, the DFT basis vectors, and the fundamental group of the circle. Rates novelty [KNOWN → UNDEREXPLORED].",
  },
  {
    id: "fourier-heat",
    mode: "formula",
    modeLabel: "Formula Lab",
    modeColor: "#00e5b0",
    title: "Fourier transform & the heat equation",
    subtitle: "Why convolution becomes multiplication",
    tags: ["analysis", "PDEs", "signal processing"],
    prompt: "Show why the Fourier transform converts the heat equation PDE into an ODE. Derive the convolution theorem from scratch and explain why this is the same phenomenon as why multiplication is faster in log space.",
    preview: "Full derivation of ∂u/∂t = α∂²u/∂x² → dÛ/dt = -αk²Û. Shows the structural isomorphism between frequency-domain convolution, log-space multiplication, and the Laplace transform.",
  },
  {
    id: "riemann-hypothesis",
    mode: "hypothesis",
    modeLabel: "Hypothesis",
    modeColor: "#e05aff",
    title: "Riemann hypothesis conjecture",
    subtitle: "Generate testable sub-hypotheses",
    tags: ["number theory", "primes", "millennium"],
    prompt: "Generate 3 precise, testable mathematical sub-hypotheses that would be implied by the Riemann Hypothesis being true. For each: state the conjecture, provide a numerical test, and give a confidence score.",
    preview: "Produces formal conjectures about zero-free regions, prime gaps, and Montgomery's pair correlation — each with Python test code that can run in the browser via Pyodide.",
  },
  {
    id: "ising-model",
    mode: "hypothesis",
    modeLabel: "Hypothesis",
    modeColor: "#e05aff",
    title: "Phase transitions & critical phenomena",
    subtitle: "Is the Ising model universal?",
    tags: ["statistical mechanics", "renormalization", "cross-domain"],
    prompt: "Generate a testable hypothesis about universality in the 2D Ising model. What does the critical exponent β = 1/8 imply about systems far outside physics? Connect to financial market crashes and neural criticality.",
    preview: "Conjectures that log-periodic oscillations before phase transitions appear in markets, epileptic seizures, and network failures — with a falsifiable prediction and Monte Carlo test code.",
  },
  {
    id: "stokes-theorem",
    mode: "solve",
    modeLabel: "Deep Solve",
    modeColor: "#00c8ff",
    title: "Generalized Stokes theorem",
    subtitle: "One theorem to rule them all",
    tags: ["differential geometry", "calculus", "unification"],
    prompt: "Prove the generalized Stokes theorem ∫_M dω = ∫_∂M ω and show how it unifies the fundamental theorem of calculus, Green's theorem, the classical Stokes theorem, and the divergence theorem as special cases.",
    preview: "Rigorous proof via differential forms on manifolds. Shows each classical theorem as a specific choice of ω and M. Ends with a 🔗 connection to de Rham cohomology and Poincaré duality.",
  },
  {
    id: "eigenvalue-pca",
    mode: "solve",
    modeLabel: "Deep Solve",
    modeColor: "#00c8ff",
    title: "PCA from eigendecomposition",
    subtitle: "Why does maximizing variance equal finding eigenvectors?",
    tags: ["linear algebra", "statistics", "ML"],
    prompt: "Derive PCA from scratch. Start from 'find the direction that maximizes variance of projected data' and show via Lagrange multipliers why this is exactly the eigenvalue problem for the covariance matrix.",
    preview: "Full Lagrangian derivation showing ∇(v^T Σ v - λ(v^T v - 1)) = 0 → Σv = λv. Then explains what eigenvalues literally measure and why the top eigenvectors are the 'information-richest' dimensions.",
  },
  {
    id: "black-scholes",
    mode: "synergy",
    modeLabel: "Synergy",
    modeColor: "#ff6b35",
    title: "Black-Scholes = heat equation",
    subtitle: "Finance is statistical mechanics",
    tags: ["financial math", "PDEs", "cross-domain"],
    prompt: "Show that the Black-Scholes equation is mathematically identical to the heat equation. What does this mean for option pricing? Find 3 other domains where this same PDE structure appears and rate the novelty.",
    preview: "Maps the substitution log(S/K) + (r - σ²/2)t → x, t → τ. Shows Black-Scholes, Fokker-Planck, Schrödinger (imaginary time), and diffusion are the same equation in different units. [UNDEREXPLORED]",
  },
  {
    id: "lotka-volterra",
    mode: "synergy",
    modeLabel: "Synergy",
    modeColor: "#ff6b35",
    title: "Lotka-Volterra beyond biology",
    subtitle: "Predator-prey dynamics in 5 domains",
    tags: ["biomathematics", "dynamical systems", "cross-domain"],
    prompt: "The Lotka-Volterra equations appear far beyond predator-prey biology. Find their structural analogues in 5 different domains — include epidemiology, economics, chemistry, arms races, and social networks.",
    preview: "Maps dx/dt = αx - βxy to SIR models, market competition (producers/consumers), autocatalytic reactions, Richardson's arms race model, and viral content spread. Finds the conserved quantity H in each.",
  },
  {
    id: "monte-carlo-pi",
    mode: "probability",
    modeLabel: "Probability",
    modeColor: "#e05aff",
    title: "Monte Carlo estimation of π",
    subtitle: "10,000-sample simulation with confidence intervals",
    tags: ["Monte Carlo", "statistics", "estimation"],
    prompt: "Run a Monte Carlo simulation to estimate π using random point sampling in a unit square. Use 10,000 samples, compute the 95% confidence interval, and plot the convergence. Show the mathematical basis for why this works.",
    preview: "Generates full Python simulation code that runs in Pyodide. Shows convergence rate O(1/√n), connects to the Law of Large Numbers, and plots the running estimate with error bands.",
  },
  {
    id: "bayesian-updating",
    mode: "probability",
    modeLabel: "Probability",
    modeColor: "#e05aff",
    title: "Bayesian updating: medical diagnosis",
    subtitle: "Why 99% accurate tests mislead",
    tags: ["Bayesian", "statistics", "decision theory"],
    prompt: "A disease affects 1 in 1000 people. A test is 99% accurate. You test positive. What is the actual probability you have the disease? Show the full Bayesian calculation, then explain why our intuition fails and what this implies for AI systems.",
    preview: "Full P(disease|positive) = P(positive|disease)P(disease)/P(positive) calculation giving ~9%. Connects to false positive rate in ML, the precision-recall tradeoff, and optimal decision theory under uncertainty.",
  },
  {
    id: "protein-folding",
    mode: "files",
    modeLabel: "File Intel",
    modeColor: "#7cff6b",
    title: "Protein structure from PDB file",
    subtitle: "AlphaFold + energy landscape mathematics",
    tags: ["bioinformatics", "PDB", "energy landscape"],
    prompt: "Analyze this PDB file of lysozyme (1HEW). Describe the mathematical model underlying protein folding energy landscapes — why is it a funnel and not a random walk? Connect to Boltzmann statistics and spin glass theory.",
    preview: "Extracts chain/residue/atom statistics from PDB locally, then explains the energy funnel as Z = ∑exp(-E_i/kT), connects to Edwards-Anderson spin glass order parameter, and flags why this is [NOVEL] cross-domain math.",
  },
  {
    id: "vcf-statistics",
    mode: "files",
    modeLabel: "File Intel",
    modeColor: "#7cff6b",
    title: "VCF variant statistical analysis",
    subtitle: "Transition/transversion ratio & population genetics",
    tags: ["genomics", "VCF", "statistics"],
    prompt: "Analyze the attached VCF file. Compute the Ti/Tv ratio and explain its mathematical basis — why should it be ~2.1 for human exomes? Connect to mutation rate models, Kimura's neutral theory, and Markov chain models of nucleotide substitution.",
    preview: "Parses VCF locally via Pyodide, computes variant type distribution, then derives the Ti/Tv expectation from base-pairing geometry and the Jukes-Cantor substitution model.",
  },
  {
    id: "shannon-entropy",
    mode: "scientist",
    modeLabel: "Scientist",
    modeColor: "#f0a500",
    title: "Shannon entropy = Boltzmann entropy",
    subtitle: "Information theory is thermodynamics",
    tags: ["information theory", "thermodynamics", "unification"],
    prompt: "Prove that Shannon entropy H = -∑p log p and Boltzmann entropy S = -k∑p_i ln(p_i) are the same object. What does this mean? Find 3 surprising implications and rate novelty.",
    preview: "Shows the isomorphism, derives Maxwell's demon paradox resolution, connects to Landauer's erasure principle (kT ln 2 per bit), and maps to von Neumann entropy in quantum information. [NOVEL at the applied level]",
  },
  {
    id: "rsa-cryptography",
    mode: "solve",
    modeLabel: "Deep Solve",
    modeColor: "#00c8ff",
    title: "RSA encryption from first principles",
    subtitle: "Why factoring is hard → why secrets exist",
    tags: ["cryptography", "number theory", "hardness"],
    prompt: "Derive the RSA cryptosystem from Euler's theorem. Show every step: key generation, the encryption/decryption proof, and explain why the security reduces to the hardness of integer factorization. Is this reduction tight?",
    preview: "Full derivation: Euler's theorem a^φ(n) ≡ 1 (mod n) → (m^e)^d ≡ m (mod n). Proves correctness. Discusses sub-exponential factoring algorithms and why quantum Shor's algorithm breaks RSA in O((log n)³).",
  },
  {
    id: "neural-odes",
    mode: "synergy",
    modeLabel: "Synergy",
    modeColor: "#ff6b35",
    title: "Neural ODEs: deep learning = dynamics",
    subtitle: "ResNets are Euler-method ODE solvers",
    tags: ["ML math", "dynamical systems", "cross-domain"],
    prompt: "Show that residual networks are Euler discretizations of continuous ODEs. What does this imply? Find the structural connections to Hamiltonian mechanics, symplectic integrators, and reversible computing.",
    preview: "Maps h_{t+1} = h_t + f(h_t, θ) → dh/dt = f(h,t,θ), connects to Hamiltonian flow preservation, explains why symplectic integrators give better energy conservation in physics-informed neural networks. [NOVEL]",
  },
  {
    id: "renormalization",
    mode: "hypothesis",
    modeLabel: "Hypothesis",
    modeColor: "#e05aff",
    title: "Renormalization group hypothesis",
    subtitle: "Does RG explain deep learning generalization?",
    tags: ["quantum field theory", "ML theory", "cross-domain"],
    prompt: "Generate a testable hypothesis: does the renormalization group explain why deep neural networks generalize despite overparameterization? State the formal conjecture, identify what would falsify it, and suggest an experiment.",
    preview: "Conjectures that gradient descent on overparameterized networks implements an RG flow that coarse-grains irrelevant features. Proposes measuring effective dimension vs. training steps as a falsifiable prediction.",
  },
  {
    id: "ricci-flow",
    mode: "scientist",
    modeLabel: "Scientist",
    modeColor: "#f0a500",
    title: "Ricci flow & Poincaré conjecture",
    subtitle: "How geometry healed itself",
    tags: ["differential geometry", "topology", "millennium"],
    prompt: "Explain Perelman's proof of the Poincaré conjecture via Ricci flow. What is ∂g/∂t = -2Ric(g) geometrically? Find the cross-domain bridge to heat diffusion and image processing.",
    preview: "Explains the geometric intuition: Ricci flow smooths irregular curvature like heat diffusion smooths temperature. Maps to image denoising PDEs and the mean curvature flow for surfaces. [UNDEREXPLORED in ML]",
  },
  {
    id: "lyapunov-stability",
    mode: "formula",
    modeLabel: "Formula Lab",
    modeColor: "#00e5b0",
    title: "Lyapunov stability & energy methods",
    subtitle: "Why does the pendulum stop?",
    tags: ["control theory", "dynamical systems", "stability"],
    prompt: "Derive Lyapunov's direct method for stability analysis. Show how choosing a Lyapunov function V(x) > 0 with dV/dt < 0 proves stability. Then find this exact structure in 4 other domains.",
    preview: "Derives the Lyapunov stability theorem from scratch, shows V as a 'generalized energy', maps to Gibbs free energy in thermodynamics, Bellman equations in RL, Bregman divergences in optimization, and Lyapunov exponents in chaos theory.",
  },
];

const MODE_COLORS = {
  scientist:   "#f0a500",
  formula:     "#00e5b0",
  hypothesis:  "#e05aff",
  solve:       "#00c8ff",
  synergy:     "#ff6b35",
  probability: "#e05aff",
  files:       "#7cff6b",
};

const ALL_MODES = ["All", "Scientist", "Formula Lab", "Hypothesis", "Deep Solve", "Synergy", "Probability", "File Intel"];
const ALL_TAGS  = ["cross-domain", "physics", "calculus", "statistics", "number theory", "ML", "bioinformatics", "cryptography", "dynamical systems"];

export default function MathXGallery() {
  const [activeMode, setActiveMode] = useState("All");
  const [activeTag,  setActiveTag]  = useState(null);
  const [search,     setSearch]     = useState("");
  const [expanded,   setExpanded]   = useState(null);
  const [copied,     setCopied]     = useState(null);

  const filtered = EXAMPLES.filter(ex => {
    if (activeMode !== "All" && ex.modeLabel !== activeMode) return false;
    if (activeTag  && !ex.tags.includes(activeTag))         return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        ex.title.toLowerCase().includes(q)     ||
        ex.subtitle.toLowerCase().includes(q)  ||
        ex.tags.some(t => t.includes(q))       ||
        ex.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function copyPrompt(ex) {
    navigator.clipboard.writeText(ex.prompt).catch(() => {});
    setCopied(ex.id);
    setTimeout(() => setCopied(null), 1800);
  }

  function launchExample(ex) {
    if (typeof window !== "undefined" && window.sendPrompt) {
      window.sendPrompt(ex.prompt);
    } else {
      copyPrompt(ex);
    }
  }

  const tagBg = (active) =>
    active ? "var(--color-background-info)" : "var(--color-background-secondary)";
  const tagColor = (active) =>
    active ? "var(--color-text-info)" : "var(--color-text-secondary)";

  return (
    <div style={{ padding: "0 0 2rem" }}>
      <h2 className="sr-only">Math X Example Gallery — 20 curated examples across all modes</h2>

      {/* Search */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          type="search"
          placeholder="Search examples…"
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveMode("All"); setActiveTag(null); }}
          style={{ width: "100%", fontSize: 15 }}
        />
      </div>

      {/* Mode filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" }}>
        {ALL_MODES.map(m => {
          const active = activeMode === m;
          const col = m === "All" ? null : Object.entries({
            Scientist: "#f0a500", "Formula Lab": "#00e5b0", Hypothesis: "#e05aff",
            "Deep Solve": "#00c8ff", Synergy: "#ff6b35", Probability: "#c084fc", "File Intel": "#7cff6b",
          }).find(([k]) => k === m)?.[1];
          return (
            <button
              key={m}
              onClick={() => { setActiveMode(m); setActiveTag(null); }}
              style={{
                fontSize: 12, padding: "4px 12px",
                borderRadius: "var(--border-radius-md)",
                background: active ? (col ? col + "22" : "var(--color-background-secondary)") : "transparent",
                border: active
                  ? `0.5px solid ${col || "var(--color-border-secondary)"}`
                  : "0.5px solid var(--color-border-tertiary)",
                color: active
                  ? (col || "var(--color-text-primary)")
                  : "var(--color-text-secondary)",
                fontWeight: active ? 500 : 400,
                cursor: "pointer",
              }}
            >{m}</button>
          );
        })}
      </div>

      {/* Tag filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: "1.25rem" }}>
        {ALL_TAGS.map(t => {
          const active = activeTag === t;
          return (
            <button
              key={t}
              onClick={() => setActiveTag(active ? null : t)}
              style={{
                fontSize: 11, padding: "3px 9px",
                borderRadius: 20,
                background: tagBg(active),
                border: "0.5px solid var(--color-border-tertiary)",
                color: tagColor(active),
                cursor: "pointer",
                fontWeight: active ? 500 : 400,
              }}
            >{t}</button>
          );
        })}
      </div>

      {/* Results count */}
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
        {filtered.length} example{filtered.length !== 1 ? "s" : ""}
        {activeMode !== "All" ? ` · ${activeMode}` : ""}
        {activeTag ? ` · #${activeTag}` : ""}
      </p>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {filtered.map(ex => {
          const isExpanded = expanded === ex.id;
          const isCopied   = copied   === ex.id;
          return (
            <div
              key={ex.id}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: "var(--border-radius-lg)",
                padding: "1rem 1.25rem",
                display: "flex", flexDirection: "column", gap: 10,
                transition: "border-color 0.15s",
                borderTop: `2px solid ${ex.modeColor}`,
              }}
            >
              {/* Mode badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: 11, fontWeight: 500, padding: "2px 8px",
                  borderRadius: "var(--border-radius-md)",
                  background: ex.modeColor + "18",
                  color: ex.modeColor,
                  border: `0.5px solid ${ex.modeColor}44`,
                }}>
                  {ex.modeLabel}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  {ex.tags.slice(0, 2).map(t => (
                    <span key={t} style={{
                      fontSize: 10, padding: "1px 6px",
                      borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)",
                      color: "var(--color-text-tertiary)",
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 15, lineHeight: 1.4 }}>{ex.title}</p>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                  {ex.subtitle}
                </p>
              </div>

              {/* Preview (expandable) */}
              <p style={{
                margin: 0, fontSize: 13, lineHeight: 1.6,
                color: "var(--color-text-secondary)",
                display: isExpanded ? "block" : "-webkit-box",
                WebkitLineClamp: isExpanded ? "unset" : 2,
                WebkitBoxOrient: "vertical",
                overflow: isExpanded ? "visible" : "hidden",
              }}>
                {ex.preview}
              </p>

              {!isExpanded && (
                <button
                  onClick={() => setExpanded(ex.id)}
                  style={{
                    alignSelf: "flex-start", fontSize: 12,
                    color: "var(--color-text-secondary)", background: "none",
                    border: "none", padding: 0, cursor: "pointer",
                  }}
                >
                  <i className="ti ti-chevron-down" aria-hidden="true" style={{ fontSize: 14, verticalAlign: -2 }} /> more
                </button>
              )}

              {/* Prompt preview */}
              {isExpanded && (
                <div style={{
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-md)",
                  padding: "10px 12px",
                  fontSize: 12, lineHeight: 1.6,
                  color: "var(--color-text-secondary)",
                  fontFamily: "var(--font-mono)",
                  border: "0.5px solid var(--color-border-tertiary)",
                }}>
                  {ex.prompt}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button
                  onClick={() => launchExample(ex)}
                  style={{
                    flex: 1, fontSize: 13, padding: "7px 0",
                    borderRadius: "var(--border-radius-md)",
                    background: ex.modeColor + "18",
                    border: `0.5px solid ${ex.modeColor}66`,
                    color: ex.modeColor, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  <i className="ti ti-player-play" aria-hidden="true" style={{ fontSize: 14, verticalAlign: -1, marginRight: 4 }} />
                  Try this ↗
                </button>
                <button
                  onClick={() => isCopied ? null : copyPrompt(ex)}
                  style={{
                    fontSize: 12, padding: "7px 12px",
                    borderRadius: "var(--border-radius-md)",
                    background: "transparent",
                    border: "0.5px solid var(--color-border-secondary)",
                    color: isCopied ? "var(--color-text-success)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                  title={isCopied ? "Copied!" : "Copy prompt"}
                >
                  <i className={`ti ${isCopied ? "ti-check" : "ti-copy"}`} aria-hidden="true" style={{ fontSize: 14 }} />
                </button>
                <button
                  onClick={() => setExpanded(isExpanded ? null : ex.id)}
                  style={{
                    fontSize: 12, padding: "7px 12px",
                    borderRadius: "var(--border-radius-md)",
                    background: "transparent",
                    border: "0.5px solid var(--color-border-tertiary)",
                    color: "var(--color-text-tertiary)",
                    cursor: "pointer",
                  }}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"}`} aria-hidden="true" style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          color: "var(--color-text-secondary)", fontSize: 15,
        }}>
          <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 32, display: "block", marginBottom: 12, opacity: 0.4 }} />
          No examples match that filter.
          <br />
          <button
            onClick={() => { setSearch(""); setActiveMode("All"); setActiveTag(null); }}
            style={{
              marginTop: 12, fontSize: 13, cursor: "pointer",
              background: "none", border: "0.5px solid var(--color-border-secondary)",
              borderRadius: "var(--border-radius-md)", padding: "6px 16px",
              color: "var(--color-text-secondary)",
            }}
          >Clear filters</button>
        </div>
      )}
    </div>
  );
}
