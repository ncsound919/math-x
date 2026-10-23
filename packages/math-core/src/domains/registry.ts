/**
 * Domain registry for Math X.
 *
 * Replaces the flat string map in domainPrompts.ts with a structured,
 * metadata-rich registry. Each domain declares its specialist prompt,
 * category, keywords, suggested tools, and verification strategy so the
 * planner, router, and UI can reason about domains uniformly.
 */

export type DomainCategory =
  | 'pure_math'
  | 'applied_math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'earth_space'
  | 'medicine'
  | 'engineering'
  | 'computer_science'
  | 'social_formal';

export type VerificationStrategy =
  | 'symbolic'      // SymPy
  | 'smt'           // Z3
  | 'numeric'       // recompute / finite-difference
  | 'formal'        // Lean/Coq
  | 'statistical'   // bootstrap / CI
  | 'none';

export interface DomainSpec {
  id: string;
  name: string;
  category: DomainCategory;
  parent?: string;
  /** Short human-readable description. */
  description: string;
  /** Keywords used for auto-suggestion from a query. */
  keywords: string[];
  /** Specialist system-prompt extension. */
  prompt: string;
  /** Preferred computation tools for this domain. */
  tools: string[];
  /** How claims in this domain should be verified. */
  verification: VerificationStrategy;
  /** Example queries shown in the UI. */
  examples: string[];
}

export const DOMAINS: Record<string, DomainSpec> = {
  // ---- Pure mathematics ----
  algebraic_number_theory: {
    id: 'algebraic_number_theory',
    name: 'Algebraic Number Theory',
    category: 'pure_math',
    description: 'Number fields, Galois theory, ideal class groups, L-functions.',
    keywords: ['number field', 'galois', 'ideal class', 'L-function', 'ring of integers', 'modular form'],
    prompt: `You are a specialist in Algebraic Number Theory. Focus on ideal class groups and units in number fields, Galois theory of number fields and local fields, class field theory and L-functions, modular forms and elliptic curves. Use abstract algebra notation (rings, fields, modules). Prioritize structural proofs over raw calculation.`,
    tools: ['sympy', 'sage'],
    verification: 'symbolic',
    examples: ['Compute the class number of Q(sqrt(-23))', 'Explain class field theory for imaginary quadratic fields'],
  },
  algebraic_topology: {
    id: 'algebraic_topology',
    name: 'Algebraic Topology',
    category: 'pure_math',
    description: 'Homology, cohomology, homotopy groups, spectral sequences.',
    keywords: ['homology', 'cohomology', 'homotopy', 'manifold', 'simplicial', 'spectral sequence', 'fibration'],
    prompt: `You are a specialist in Algebraic Topology. Focus on homology and cohomology theories (Simplicial, Singular, de Rham), homotopy groups and fibrations, category theory applications in topology, manifolds and surgery theory. Reason about high-dimensional shapes abstractly. Use commutative diagrams in descriptions where appropriate.`,
    tools: ['sympy'],
    verification: 'formal',
    examples: ['Compute H_2 of the Klein bottle', 'Explain the long exact sequence of a fibration'],
  },
  differential_geometry: {
    id: 'differential_geometry',
    name: 'Differential Geometry',
    category: 'pure_math',
    description: 'Riemannian manifolds, curvature, connections, Lie groups.',
    keywords: ['riemannian', 'manifold', 'curvature', 'ricci', 'connection', 'lie group', 'metric tensor', 'geodesic'],
    prompt: `You are a specialist in Differential Geometry. Focus on Riemannian manifolds and metric tensors, connections, curvature (Riemann, Ricci, scalar), Lie groups and Lie algebras, geometric flows and variational problems. Translate between coordinate-based index notation and coordinate-free invariant notation.`,
    tools: ['sympy', 'numpy'],
    verification: 'symbolic',
    examples: ['Compute Christoffel symbols for the Schwarzschild metric', 'Explain parallel transport on a sphere'],
  },
  pde: {
    id: 'pde',
    name: 'Partial Differential Equations',
    category: 'pure_math',
    description: 'Sobolev spaces, weak solutions, elliptic/parabolic/hyperbolic systems.',
    keywords: ['pde', 'sobolev', 'weak solution', 'elliptic', 'parabolic', 'hyperbolic', 'boundary value', 'green function'],
    prompt: `You are a specialist in Partial Differential Equations. Focus on Sobolev spaces and weak solutions, elliptic, parabolic, and hyperbolic systems, non-linear PDEs and blow-up analysis, numerical approximation methods (FEM, Spectral). Emphasize existence, uniqueness, and regularity results.`,
    tools: ['sympy', 'scipy', 'fenics'],
    verification: 'numeric',
    examples: ['Solve the heat equation on a disk', 'Prove uniqueness for a semilinear elliptic PDE'],
  },
  functional_analysis: {
    id: 'functional_analysis',
    name: 'Functional Analysis',
    category: 'pure_math',
    description: 'Banach/Hilbert spaces, operator theory, spectral theorem.',
    keywords: ['banach', 'hilbert', 'operator', 'spectral theorem', 'compact operator', 'distribution', 'fixed point'],
    prompt: `You are a specialist in Functional Analysis. Focus on Banach and Hilbert spaces, operator theory (spectral theorem, compact operators), distributions and generalized functions, fixed point theorems and convexity. Focus on the infinite-dimensional nature of the spaces and convergence in various topologies.`,
    tools: ['sympy'],
    verification: 'formal',
    examples: ['State and prove the spectral theorem for compact self-adjoint operators'],
  },
  combinatorics_graph: {
    id: 'combinatorics_graph',
    name: 'Combinatorics & Graph Theory',
    category: 'pure_math',
    description: 'Extremal graph theory, Ramsey theory, enumerative combinatorics.',
    keywords: ['graph', 'ramsey', 'extremal', 'combinatorics', 'generating function', 'coloring', 'matching', 'networkx'],
    prompt: `You are a specialist in Advanced Combinatorics and Graph Theory. Focus on extremal graph theory and Ramsey theory, probabilistic methods in combinatorics, enumerative combinatorics and generating functions, algorithmic graph theory and optimization. Focus on the scaling limits and structural properties of large discrete systems.`,
    tools: ['networkx', 'sympy'],
    verification: 'numeric',
    examples: ['Find the Ramsey number R(3,3)', 'Count labeled trees on n vertices'],
  },
  complexity_theory: {
    id: 'complexity_theory',
    name: 'Computational Complexity Theory',
    category: 'computer_science',
    description: 'Complexity classes, reductions, circuit complexity, PCP.',
    keywords: ['complexity class', 'NP', 'PSPACE', 'reduction', 'circuit', 'PCP', 'oracle', 'Turing machine'],
    prompt: `You are a specialist in Computational Complexity Theory. Focus on complexity classes (P, NP, PSPACE, #P, etc.), reductions and completeness, circuit complexity and communication complexity, interactive proofs and PCP theorem. Maintain rigorous logical flow and clear separation between known results and open conjectures.`,
    tools: ['sympy'],
    verification: 'formal',
    examples: ['Explain the PCP theorem and its implications', 'Show 3-SAT is NP-complete'],
  },
  cryptographic_math: {
    id: 'cryptographic_math',
    name: 'Cryptographic Mathematics',
    category: 'computer_science',
    description: 'Hardness assumptions, ECC, lattices, zero-knowledge proofs.',
    keywords: ['cryptography', 'discrete log', 'factoring', 'LWE', 'elliptic curve', 'lattice', 'zero-knowledge', 'post-quantum'],
    prompt: `You are a specialist in Cryptographic Mathematics. Focus on hardness assumptions (discrete log, factoring, LWE), elliptic curve cryptography (pairings, isogenies), lattice-based cryptography, zero-knowledge proof systems. Focus on the mathematical reduction from security parameters to hard mathematical problems.`,
    tools: ['sympy', 'sage'],
    verification: 'symbolic',
    examples: ['Explain LWE and its reduction to SVP', 'Compute a pairing on an elliptic curve'],
  },
  information_theory: {
    id: 'information_theory',
    name: 'Information Theory',
    category: 'applied_math',
    description: 'Entropy, channel capacity, rate-distortion, coding bounds.',
    keywords: ['entropy', 'mutual information', 'channel capacity', 'rate-distortion', 'kolmogorov', 'shannon', 'coding bound', 'hamming'],
    prompt: `You are a specialist in Information Theory. Focus on Shannon entropy, mutual information, and channel capacity, rate-distortion theory and data compression, minimum description length (MDL) and Kolmogorov complexity, coding bounds: Hamming, Gilbert-Varshamov, Reed-Solomon. Connect information-theoretic inequalities to statistical physics and machine learning.`,
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Compute the capacity of a binary symmetric channel', 'Derive the rate-distortion function for Gaussian source'],
  },
  // ---- Physics / quantum ----
  quantum_math: {
    id: 'quantum_math',
    name: 'Quantum Mathematics',
    category: 'physics',
    description: 'C*-algebras, spectral theory, representation theory, non-commutative geometry.',
    keywords: ['c*-algebra', 'von neumann', 'spectral theory', 'unitary', 'hilbert space', 'quantum', 'path integral', 'non-commutative'],
    prompt: `You are a specialist in Quantum Mathematics. Focus on C*-algebras and von Neumann algebras, spectral theory of self-adjoint operators, representation theory of Lie groups, path integrals and non-commutative geometry. Bridge the gap between formal mathematical rigor and physical intuition.`,
    tools: ['sympy', 'numpy'],
    verification: 'symbolic',
    examples: ['Explain the spectral theorem in quantum mechanics', 'Compute commutator [x,p]'],
  },
  mathematical_physics: {
    id: 'mathematical_physics',
    name: 'Mathematical Physics / QFT',
    category: 'physics',
    description: 'Axiomatic QFT, renormalization, gauge theories, string math.',
    keywords: ['qft', 'gauge theory', 'fiber bundle', 'renormalization', 'string theory', 'topological field theory', 'lagrangian'],
    prompt: `You are a specialist in Mathematical Physics / Quantum Field Theory. Focus on axiomatic and Algebraic QFT, renormalization group theory, gauge theories and fiber bundles, string theory mathematics and dualities. Operate at the frontier where math is still developing. Be comfortable with heuristic but mathematically motivated arguments.`,
    tools: ['sympy'],
    verification: 'none',
    examples: ['Explain gauge invariance as a principal bundle', 'Derive the beta function for phi^4 theory'],
  },
  // ---- Applied ----
  financial_math: {
    id: 'financial_math',
    name: 'Financial Mathematics',
    category: 'applied_math',
    description: 'Stochastic calculus, Black-Scholes, risk measures, term structure.',
    keywords: ['black-scholes', 'stochastic calculus', 'ito', 'var', 'cvar', 'martingale', 'option pricing', 'term structure', 'hjm'],
    prompt: `You are a specialist in Financial Mathematics. Focus on stochastic calculus and Itô's lemma, Black-Scholes-Merton theory and extensions, coherent risk measures (VaR, CVaR, Expected Shortfall), martingale pricing and term structure models (HJM, Hull-White). Maintain the rigour of mathematical finance: state assumptions clearly, distinguish risk-neutral from physical measures.`,
    tools: ['numpy', 'scipy', 'sympy'],
    verification: 'numeric',
    examples: ['Derive Black-Scholes via risk-neutral pricing', 'Compute CVaR for a portfolio'],
  },
  machine_learning_math: {
    id: 'machine_learning_math',
    name: 'Mathematics of Machine Learning',
    category: 'computer_science',
    description: 'PAC learning, VC dimension, optimization landscapes, kernels.',
    keywords: ['pac learning', 'vc dimension', 'generalization', 'sgd', 'kernel', 'convexity', 'saddle point', 'statistical learning'],
    prompt: `You are a specialist in the Mathematics of Machine Learning. Focus on PAC learning and VC dimension, statistical learning theory and generalization bounds, optimization landscapes: convexity, saddle points, convergence of SGD, kernel methods and the kernel trick in Hilbert spaces. Connect mathematical theory to practical algorithmic behaviour.`,
    tools: ['numpy', 'scipy', 'sklearn'],
    verification: 'numeric',
    examples: ['Derive a generalization bound via Rademacher complexity', 'Analyze the loss landscape of a 2-layer net'],
  },
  control_theory: {
    id: 'control_theory',
    name: 'Control Theory',
    category: 'engineering',
    description: 'Lyapunov stability, LQR/LQG, Kalman, H-infinity.',
    keywords: ['lyapunov', 'lqr', 'lqg', 'kalman', 'h-infinity', 'stability', 'pontryagin', 'optimal control'],
    prompt: `You are a specialist in Control Theory. Focus on Lyapunov stability and LaSalle's invariance principle, LQR/LQG optimal control, Kalman filtering (linear and extended/unscented), H-infinity robust control and Pontryagin's minimum principle. Work comfortably in both continuous and discrete time.`,
    tools: ['scipy', 'control', 'numpy'],
    verification: 'numeric',
    examples: ['Design an LQR controller for an inverted pendulum', 'Prove stability with a Lyapunov function'],
  },
  climate_math: {
    id: 'climate_math',
    name: 'Climate Mathematics',
    category: 'earth_space',
    description: 'Energy balance, dynamical systems, tipping points, data assimilation.',
    keywords: ['climate', 'energy balance', 'radiative forcing', 'tipping point', 'bifurcation', 'data assimilation', 'kalman', '4d-var'],
    prompt: `You are a specialist in Climate Mathematics. Focus on energy balance models and radiative forcing, dynamical systems theory applied to climate (attractors, tipping points), bifurcation theory and early warning signals, data assimilation (Kalman filters, 4D-Var), stochastic climate models and extreme event statistics. Be precise about timescales and sources of uncertainty.`,
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Analyze a tipping point in an energy balance model', 'Explain early warning signals via autocorrelation'],
  },
  biomathematics: {
    id: 'biomathematics',
    name: 'Biomathematics',
    category: 'biology',
    description: 'Reaction-diffusion, epidemiology, population dynamics, neuron models.',
    keywords: ['reaction-diffusion', 'turing', 'sir', 'seir', 'lotka-volterra', 'hodgkin-huxley', 'epidemiology', 'population dynamics'],
    prompt: `You are a specialist in Biomathematics. Focus on reaction-diffusion systems and Turing instability for morphogenesis, SIR/SEIR/SEIRD epidemiological ODE/PDE models, population dynamics: Lotka-Volterra, age-structured models, Hodgkin-Huxley and FitzHugh-Nagumo neuron models, evolutionary game theory and replicator dynamics. Always connect mathematical structure to biological mechanism.`,
    tools: ['scipy', 'numpy', 'biopython'],
    verification: 'numeric',
    examples: ['Simulate a SIR epidemic', 'Find Turing instability conditions for a 2-species system'],
  },

  // ---- Additional pure mathematics ----
  algebraic_geometry: {
    id: 'algebraic_geometry',
    name: 'Algebraic Geometry',
    category: 'pure_math',
    description: 'Varieties, schemes, sheaves, cohomology, moduli spaces.',
    keywords: ['variety', 'scheme', 'sheaf', 'cohomology', 'moduli', 'divisor', 'line bundle', 'elliptic curve'],
    prompt: `You are a specialist in Algebraic Geometry. Focus on varieties and schemes, sheaf cohomology, divisors and line bundles, moduli spaces, intersection theory, and the interplay between algebraic and analytic geometry. Translate between local and global perspectives.`,
    tools: ['sage', 'sympy'],
    verification: 'formal',
    examples: ['Explain the Riemann-Roch theorem', 'Compute the genus of a plane curve'],
  },
  category_theory: {
    id: 'category_theory',
    name: 'Category Theory',
    category: 'pure_math',
    description: 'Categories, functors, natural transformations, limits, adjunctions.',
    keywords: ['category', 'functor', 'natural transformation', 'adjunction', 'limit', 'colimit', 'monad', 'topos'],
    prompt: `You are a specialist in Category Theory. Focus on categories, functors, natural transformations, limits and colimits, adjunctions, monads, and topos theory. Emphasize universal properties and structural abstraction.`,
    tools: ['sympy'],
    verification: 'formal',
    examples: ['Define an adjunction and give examples', 'Explain monads in functional programming'],
  },
  harmonic_analysis: {
    id: 'harmonic_analysis',
    name: 'Harmonic Analysis',
    category: 'pure_math',
    description: 'Fourier analysis, wavelets, singular integrals, representation theory.',
    keywords: ['fourier', 'wavelet', 'singular integral', 'convolution', 'plancherel', 'representation', 'character'],
    prompt: `You are a specialist in Harmonic Analysis. Focus on Fourier series and transforms, wavelets, singular integral operators, convolution, Plancherel and Parseval identities, and representation theory of locally compact groups.`,
    tools: ['numpy', 'scipy', 'sympy'],
    verification: 'numeric',
    examples: ['Derive the Fourier transform of a Gaussian', 'Explain the uncertainty principle'],
  },
  analytic_number_theory: {
    id: 'analytic_number_theory',
    name: 'Analytic Number Theory',
    category: 'pure_math',
    description: 'Prime distribution, zeta functions, L-functions, sieves.',
    keywords: ['prime number theorem', 'riemann zeta', 'dirichlet L', 'sieve', 'chebyshev', 'von mangoldt'],
    prompt: `You are a specialist in Analytic Number Theory. Focus on the distribution of primes, the Riemann zeta function and its zeros, Dirichlet L-functions, sieve methods, and the prime number theorem. Connect analytic estimates to arithmetic structure.`,
    tools: ['sympy', 'mpmath'],
    verification: 'numeric',
    examples: ['Explain the Riemann Hypothesis', 'Derive the prime number theorem via contour integration'],
  },
  probability_theory: {
    id: 'probability_theory',
    name: 'Probability Theory',
    category: 'applied_math',
    description: 'Measure-theoretic probability, martingales, stochastic processes.',
    keywords: ['measure', 'martingale', 'brownian motion', 'stochastic process', 'law of large numbers', 'central limit'],
    prompt: `You are a specialist in Probability Theory. Focus on measure-theoretic foundations, martingales and stopping times, Brownian motion and stochastic calculus, laws of large numbers, and central limit theorems. Emphasize almost-sure vs. in-distribution convergence.`,
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Prove the strong law of large numbers', 'Explain martingale convergence theorem'],
  },
  statistics: {
    id: 'statistics',
    name: 'Statistics',
    category: 'applied_math',
    description: 'Estimation, hypothesis testing, regression, Bayesian inference.',
    keywords: ['estimation', 'hypothesis test', 'regression', 'bayesian', 'mle', 'confidence interval', 'p-value'],
    prompt: `You are a specialist in Statistics. Focus on point and interval estimation, hypothesis testing, linear and generalized linear models, Bayesian inference, maximum likelihood, and model selection. Distinguish frequentist and Bayesian interpretations.`,
    tools: ['scipy', 'statsmodels', 'numpy'],
    verification: 'statistical',
    examples: ['Derive the MLE for normal variance', 'Explain multiple testing correction'],
  },
  operations_research: {
    id: 'operations_research',
    name: 'Operations Research',
    category: 'applied_math',
    description: 'Linear programming, network flows, scheduling, optimization.',
    keywords: ['linear programming', 'simplex', 'network flow', 'scheduling', 'integer programming', 'convex optimization'],
    prompt: `You are a specialist in Operations Research. Focus on linear and integer programming, the simplex method, network flows, scheduling and routing, convex optimization, and duality theory. Connect formulations to real-world decision problems.`,
    tools: ['scipy', 'pulp', 'numpy'],
    verification: 'numeric',
    examples: ['Solve a transportation problem', 'Explain strong duality in LP'],
  },
  signal_processing: {
    id: 'signal_processing',
    name: 'Signal Processing',
    category: 'engineering',
    description: 'Filters, transforms, spectral analysis, sampling theory.',
    keywords: ['filter', 'fft', 'sampling', 'nyquist', 'convolution', 'spectral', 'wavelet', 'z-transform'],
    prompt: `You are a specialist in Signal Processing. Focus on sampling and Nyquist, Fourier and Z-transforms, digital filters (FIR/IIR), spectral estimation, convolution, and wavelets. Bridge continuous and discrete representations.`,
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Design a low-pass Butterworth filter', 'Explain aliasing and the Nyquist rate'],
  },
  numerical_analysis: {
    id: 'numerical_analysis',
    name: 'Numerical Analysis',
    category: 'applied_math',
    description: 'Interpolation, quadrature, ODE solvers, linear systems, stability.',
    keywords: ['interpolation', 'quadrature', 'ode solver', 'newton', 'runge-kutta', 'condition number', 'stability'],
    prompt: `You are a specialist in Numerical Analysis. Focus on polynomial interpolation, numerical quadrature, ODE/PDE solvers, iterative methods for linear systems, error analysis, and stability/conditioning. Quantify truncation and round-off errors.`,
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Compare Euler and RK4 for an ODE', 'Explain condition number of a matrix'],
  },
  game_theory: {
    id: 'game_theory',
    name: 'Game Theory',
    category: 'applied_math',
    description: 'Nash equilibrium, mechanism design, cooperative games.',
    keywords: ['nash equilibrium', 'mechanism design', 'cooperative game', 'shapley', 'auction', 'zero-sum'],
    prompt: `You are a specialist in Game Theory. Focus on Nash and correlated equilibria, zero-sum games and minimax, mechanism design and auctions, cooperative games and the Shapley value, and evolutionary game dynamics. Connect equilibrium concepts to incentives.`,
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Find Nash equilibrium of a 2x2 game', 'Explain the Vickrey auction'],
  },
  chaos_dynamical_systems: {
    id: 'chaos_dynamical_systems',
    name: 'Chaos & Dynamical Systems',
    category: 'applied_math',
    description: 'Attractors, bifurcations, Lyapunov exponents, fractals.',
    keywords: ['chaos', 'attractor', 'bifurcation', 'lyapunov exponent', 'fractal', 'strange attractor', 'logistic map'],
    prompt: `You are a specialist in Chaos and Dynamical Systems. Focus on attractors and basins, bifurcations, Lyapunov exponents, strange attractors, fractal dimensions, and the route to chaos. Connect mathematical structure to observed irregularity.`,
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Compute Lyapunov exponent of the logistic map', 'Explain period-doubling bifurcation'],
  },
  materials_science_math: {
    id: 'materials_science_math',
    name: 'Materials Science Mathematics',
    category: 'chemistry',
    description: 'Crystallography, phase transitions, diffusion, composite mechanics.',
    keywords: ['crystal', 'phase transition', 'diffusion', 'composite', 'stress', 'strain', 'bravais lattice'],
    prompt: `You are a specialist in the Mathematics of Materials Science. Focus on crystallographic symmetry groups, phase transitions and Landau theory, diffusion in solids, composite and effective medium theory, and stress/strain tensors. Connect microstructure to macroscopic properties.`,
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Explain Bravais lattices', 'Model diffusion in a composite material'],
  },
  neuroscience_math: {
    id: 'neuroscience_math',
    name: 'Neuroscience Mathematics',
    category: 'biology',
    description: 'Neural models, population coding, learning rules, connectomics.',
    keywords: ['neuron', 'hodgkin-huxley', 'population coding', 'hebbian', 'connectome', 'neural network dynamics'],
    prompt: `You are a specialist in the Mathematics of Neuroscience. Focus on single-neuron models (Hodgkin-Huxley, Izhikevich), population coding and decoding, Hebbian and STDP learning rules, neural field theory, and connectomics. Connect mathematical dynamics to neural computation.`,
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Analyze a Hopf bifurcation in a neuron model', 'Explain population vector decoding'],
  },
  astronomy_math: {
    id: 'astronomy_math',
    name: 'Astronomy & Astrophysics Mathematics',
    category: 'earth_space',
    description: 'Orbital mechanics, radiative transfer, cosmology, gravitational lensing.',
    keywords: ['orbital mechanics', 'kepler', 'radiative transfer', 'cosmology', 'gravitational lensing', 'black hole'],
    prompt: `You are a specialist in the Mathematics of Astronomy and Astrophysics. Focus on orbital mechanics and Kepler's laws, radiative transfer, cosmological models and expansion, gravitational lensing, and black hole physics. Connect equations to observable phenomena.`,
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Derive Kepler\'s third law', 'Explain gravitational lensing magnification'],
  },
  topology: {
    id: 'topology',
    name: 'Topology',
    category: 'pure_math',
    description: 'General topology, manifolds, homotopy, knot theory.',
    keywords: ['topology', 'manifold', 'homotopy', 'knot', 'compact', 'connected', 'homeomorphism'],
    prompt: 'You are a specialist in Topology. Focus on general topology, manifolds, homotopy and homology, knot invariants, and topological data analysis.',
    tools: ['sympy'],
    verification: 'formal',
    examples: ['Prove a space is compact', 'Compute the fundamental group of the circle'],
  },
  set_theory: {
    id: 'set_theory',
    name: 'Set Theory & Logic',
    category: 'pure_math',
    description: 'Axiomatic set theory, ordinals, cardinals, forcing.',
    keywords: ['set theory', 'ordinal', 'cardinal', 'forcing', 'axiom of choice', 'continuum hypothesis'],
    prompt: 'You are a specialist in Set Theory and Logic. Focus on ZFC axioms, ordinals and cardinals, forcing and independence results, and large cardinals.',
    tools: ['z3'],
    verification: 'formal',
    examples: ['Explain forcing and the continuum hypothesis', 'Compare ordinal and cardinal arithmetic'],
  },
  stochastic_processes: {
    id: 'stochastic_processes',
    name: 'Stochastic Processes',
    category: 'applied_math',
    description: 'Markov chains, Poisson processes, Brownian motion, queues.',
    keywords: ['markov chain', 'poisson process', 'brownian motion', 'queue', 'renewal', 'branching process'],
    prompt: 'You are a specialist in Stochastic Processes. Focus on Markov chains, Poisson and renewal processes, Brownian motion and martingales, queueing theory, and branching processes.',
    tools: ['numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Compute stationary distribution of a Markov chain', 'Analyze an M/M/1 queue'],
  },
  econometrics: {
    id: 'econometrics',
    name: 'Econometrics',
    category: 'social_formal',
    description: 'Regression, time series, causal inference, panel data.',
    keywords: ['regression', 'time series', 'causal inference', 'panel data', 'instrumental variable', 'difference in differences'],
    prompt: 'You are a specialist in Econometrics. Focus on linear regression and inference, time-series models, causal inference (IV, DiD, RDD), panel data methods, and model specification tests.',
    tools: ['statsmodels', 'scipy', 'numpy'],
    verification: 'statistical',
    examples: ['Explain instrumental variables', 'Implement difference-in-differences'],
  },
  pharmacology_math: {
    id: 'pharmacology_math',
    name: 'Pharmacology Mathematics',
    category: 'medicine',
    description: 'PK/PD modeling, dose-response, compartment models.',
    keywords: ['pharmacokinetics', 'pharmacodynamics', 'compartment model', 'dose-response', 'half-life', 'auc'],
    prompt: 'You are a specialist in the Mathematics of Pharmacology. Focus on compartmental PK models, dose-response curves, bioavailability and clearance, AUC and half-life.',
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Fit a one-compartment PK model', 'Compute AUC and half-life'],
  },
  epidemiology_math: {
    id: 'epidemiology_math',
    name: 'Epidemiology Mathematics',
    category: 'medicine',
    description: 'Compartment models, R0, network epidemics, intervention modeling.',
    keywords: ['epidemiology', 'compartment model', 'R0', 'reproduction number', 'network epidemic', 'intervention'],
    prompt: 'You are a specialist in the Mathematics of Epidemiology. Focus on SIR/SEIR and variants, reproduction numbers, network and spatial epidemics, intervention and vaccination modeling.',
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Estimate R0 from early growth', 'Model vaccination threshold'],
  },
  combinatorial_optimization: {
    id: 'combinatorial_optimization',
    name: 'Combinatorial Optimization',
    category: 'computer_science',
    description: 'TSP, matching, network design, approximation algorithms.',
    keywords: ['tsp', 'matching', 'network design', 'approximation algorithm', 'branch and bound', 'cutting plane'],
    prompt: 'You are a specialist in Combinatorial Optimization. Focus on the TSP, matching and assignment, network design, branch-and-bound, cutting planes, and approximation algorithms.',
    tools: ['scipy', 'numpy', 'networkx'],
    verification: 'numeric',
    examples: ['Explain the Christofides algorithm', 'Solve an assignment problem'],
  },
  oncology_statistics: {
    id: 'oncology_statistics',
    name: 'Oncology Statistics',
    category: 'medicine',
    description: 'Survival analysis, multiple testing, RWD causal inference, surrogate endpoints.',
    keywords: ['survival', 'kaplan-meier', 'cox', 'hazard', 'rmst', 'fdr', 'multiple testing', 'real-world data', 'confounding'],
    prompt: 'You are a specialist in Oncology Statistics. Focus on survival analysis (Kaplan-Meier, Cox, RMST, weighted log-rank), multiple testing and FDR in omics, causal inference from real-world data (target-trial emulation, g-methods, E-values), surrogate endpoint validation, and power for rare subtypes.',
    tools: ['scipy', 'statsmodels', 'numpy', 'lifelines'],
    verification: 'statistical',
    examples: ['Compute RMST for two arms', 'Apply Benjamini-Hochberg FDR correction'],
  },
  tumor_genomics: {
    id: 'tumor_genomics',
    name: 'Tumor Genomics',
    category: 'biology',
    description: 'Variant calling, ctDNA/MRD, tumor purity, clonal deconvolution, signatures, TMB.',
    keywords: ['variant', 'ctdna', 'mrd', 'tumor purity', 'clonal', 'mutational signature', 'tmb', 'low vaf', 'tumor suppressor', 'oncogene', 'mutation', 'genomics'],
    prompt: 'You are a specialist in Tumor Genomics. Focus on low-VAF variant detection and ctDNA/MRD limits, tumor purity and clonal deconvolution, clonal phylogeny and copy-number inference, mutational signatures and TMB calibration, and driver gene discovery with covariate-aware null models.',
    tools: ['biopython', 'numpy', 'scipy'],
    verification: 'numeric',
    examples: ['Estimate limit of detection for ctDNA', 'Deconvolve tumor purity from bulk expression'],
  },
  clinical_trials_math: {
    id: 'clinical_trials_math',
    name: 'Clinical Trials Mathematics',
    category: 'medicine',
    description: 'Phase I dose-finding, adaptive designs, surrogate validation, interim analyses.',
    keywords: ['phase i', 'dose finding', 'crm', 'boin', 'adaptive design', 'interim analysis', 'surrogate', 'clinical trial', 'trial design', 'study design'],
    prompt: 'You are a specialist in Clinical Trials Mathematics. Focus on Phase I dose-finding (3+3, CRM, BOIN), operating characteristics and simulation, adaptive and group-sequential designs, surrogate endpoint validation via trial-level meta-analysis, and sample size/power for rare subtypes.',
    tools: ['scipy', 'numpy'],
    verification: 'statistical',
    examples: ['Simulate CRM operating characteristics', 'Compute required sample size for a rare subtype'],
  },
  radiotherapy_optimization: {
    id: 'radiotherapy_optimization',
    name: 'Radiotherapy Optimization',
    category: 'medicine',
    description: 'Inverse planning, dose optimization, robust/stochastic formulations.',
    keywords: ['radiotherapy', 'inverse planning', 'dose optimization', 'imrt', 'vmat', 'robust', 'stochastic'],
    prompt: 'You are a specialist in Radiotherapy Plan Optimization. Focus on inverse planning as large-scale constrained optimization, dose-volume constraints, robust and stochastic formulations for uncertainty, and solver efficiency. Balance tumor control with normal-tissue sparing.',
    tools: ['scipy', 'numpy', 'cvxpy'],
    verification: 'numeric',
    examples: ['Formulate an IMRT optimization', 'Explain robust optimization for setup uncertainty'],
  },
  drug_synergy: {
    id: 'drug_synergy',
    name: 'Drug Synergy & Combination',
    category: 'medicine',
    description: 'Bliss, Loewe, HSA synergy scoring, response surfaces, experimental design.',
    keywords: ['synergy', 'bliss', 'loewe', 'hsa', 'combination', 'response surface', 'experimental design', 'drug', 'therapy', 'targeted', 'combination therapy'],
    prompt: 'You are a specialist in Drug Synergy Scoring. Focus on Bliss independence, Loewe additivity, HSA, response-surface frameworks, combinatorial combination spaces, and Bayesian experimental design for combinations. Reconcile disagreeing synergy metrics.',
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Compute Bliss and Loewe synergy', 'Design a combination dose matrix'],
  },
  resistance_evolution: {
    id: 'resistance_evolution',
    name: 'Resistance Evolution & Adaptive Therapy',
    category: 'biology',
    description: 'Evolutionary game models, optimal control, dosing schedules.',
    keywords: ['resistance', 'evolution', 'adaptive therapy', 'optimal control', 'evolutionary game', 'dosing'],
    prompt: 'You are a specialist in Resistance Evolution and Adaptive Therapy. Focus on evolutionary game models of resistance, optimal control of dosing schedules, tumor eco-evolutionary dynamics, and validated reproducible simulators. Connect model predictions to clinical protocols.',
    tools: ['scipy', 'numpy'],
    verification: 'numeric',
    examples: ['Model resistance emergence under continuous therapy', 'Design an adaptive therapy schedule'],
  },
  single_cell_analysis: {
    id: 'single_cell_analysis',
    name: 'Single-Cell Analysis',
    category: 'biology',
    description: 'Dropout, clustering stability, trajectories, compositional effects.',
    keywords: ['single cell', 'dropout', 'clustering', 'trajectory', 'compositional', 'count model', 'stability'],
    prompt: 'You are a specialist in Single-Cell Analysis. Focus on dropout and count models, clustering stability scoring, trajectory inference, compositional data analysis, and batch correction. Avoid arbitrary trajectory claims.',
    tools: ['scanpy', 'scipy', 'numpy'],
    verification: 'statistical',
    examples: ['Assess clustering stability', 'Apply compositional tests to cell type proportions'],
  },
  spatial_omics: {
    id: 'spatial_omics',
    name: 'Spatial Omics',
    category: 'biology',
    description: 'Spatial autocorrelation, neighborhood statistics, spatial tests.',
    keywords: ['spatial', 'autocorrelation', 'neighborhood', 'spatial test', 'moran', 'geary'],
    prompt: 'You are a specialist in Spatial Omics. Focus on spatial autocorrelation (Moran, Geary), spatially aware significance tests, neighborhood statistics, and correcting inflated significance from spatial structure.',
    tools: ['scipy', 'numpy', 'squidpy'],
    verification: 'statistical',
    examples: ['Compute Moran I for a gene', 'Run a spatially aware differential test'],
  },
  model_calibration_uncertainty: {
    id: 'model_calibration_uncertainty',
    name: 'Model Calibration & Uncertainty',
    category: 'computer_science',
    description: 'Calibration, conformal prediction, leakage detection, drift monitoring.',
    keywords: ['calibration', 'conformal prediction', 'uncertainty', 'leakage', 'drift', 'distribution shift'],
    prompt: 'You are a specialist in Model Calibration, Uncertainty, and Distribution Shift. Focus on probability calibration, conformal prediction intervals, data leakage detection, drift monitoring, and robust evaluation across sites.',
    tools: ['scipy', 'numpy', 'sklearn'],
    verification: 'statistical',
    examples: ['Apply conformal prediction to a classifier', 'Detect train/test leakage'],
  },
  reproducibility_audit: {
    id: 'reproducibility_audit',
    name: 'Reproducibility & Audit',
    category: 'computer_science',
    description: 'Determinism, seed handling, hash-based provenance, audit trails.',
    keywords: ['reproducibility', 'determinism', 'seed', 'provenance', 'audit', 'hash', 'version drift'],
    prompt: 'You are a specialist in Reproducibility and Audit. Focus on deterministic execution, seed handling, pinned environments, hash-based provenance, and audit trails. Expose nondeterminism and tool-version drift.',
    tools: ['numpy'],
    verification: 'numeric',
    examples: ['Hash a pipeline run for provenance', 'Detect nondeterminism across runs'],
  },
};
export const DOMAIN_IDS = Object.keys(DOMAINS);

export function getDomain(id: string): DomainSpec | undefined {
  return DOMAINS[id];
}

export function domainsByCategory(cat: DomainCategory): DomainSpec[] {
  return Object.values(DOMAINS).filter(d => d.category === cat);
}

/**
 * Suggest domains for a free-text query using keyword overlap (cheap, local).
 * Returns sorted by score desc.
 */
export function suggestDomains(query: string, limit = 5): Array<{ id: string; score: number }> {
  const q = query.toLowerCase();
  const scored = Object.values(DOMAINS).map(d => {
    let score = 0;
    for (const kw of d.keywords) {
      if (q.includes(kw.toLowerCase())) score += kw.split(/\s+/).length + 1;
    }
    if (q.includes(d.name.toLowerCase())) score += 5;
    return { id: d.id, score };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
