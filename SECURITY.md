# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.5.x   | Yes       |
| < 0.5   | No        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report vulnerabilities by emailing the maintainer directly. You will receive a response within 48 hours. If the issue is confirmed, a patch will be released as soon as possible.

## Security Model

Math X is designed with a privacy-first, edge-native architecture:

- **No user data leaves the browser** — all Python execution (Pyodide/WASM), symbolic math (SymPy), and data analysis (DuckDB-WASM) run entirely client-side.
- **API keys** are required for all backend endpoints. Keys must be at least 32 characters and are hashed with SHA-256 at server boot. Raw secrets are never held in memory after startup.
- **Timing-safe comparison** is used on every auth check to prevent timing attacks.
- **DOMPurify** sanitizes all rendered HTML output. `<a>` tags are forbidden in rendered math results to prevent XSS via href injection.
- **Structured logging** via pino redacts `authorization` headers and API key env vars from all log output.
- **Rate limiting** is applied to all compute-intensive endpoints: `/chat`, `/verify`, `/ocr`, `/literature`.

## Known Limitations

- The `GenomeBrowser` component requires internet access to load IGV.js reference genome tracks. All other features are fully offline-capable.
- Ollama and Qwen model endpoints are configurable via environment variables and default to `localhost`. Exposing these externally requires additional network-level access controls.

## Security Checklist for Self-Hosting

- [ ] Set `API_KEYS` env var to at least one 32+ character secret before starting in production.
- [ ] Set `NODE_ENV=production` — the server will refuse to start without valid keys in production mode.
- [ ] Run behind a reverse proxy (nginx config included in the Docker Compose setup) with TLS termination.
- [ ] Do not expose the Ollama or Qwen ports (11434) to the public internet.
