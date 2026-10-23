# Deploying Math X API to Cloudflare Workers

## Prerequisites
- Node 18+, npm
- A Cloudflare account
- `npm install -g wrangler`

## 1. Install worker deps
```bash
cd apps/worker
npm install
```

## 2. Authenticate
```bash
wrangler login
```

## 3. Set secrets
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put API_KEYS          # comma-separated, min 32 chars
wrangler secret put NCBI_API_KEY      # optional
```

## 4. Configure origins
Edit `wrangler.toml` `[vars] ALLOWED_ORIGINS` to your frontend origin(s).

## 5. Dev locally
```bash
npm run dev   # http://localhost:8787
```

## 6. Deploy
```bash
npm run deploy
```
You'll get a URL like `https://mathx-api.<you>.workers.dev`.

## 7. Point the frontend
Set `VITE_API_URL=https://mathx-api.<you>.workers.dev` in `apps/web/.env` (or Cloudflare Pages env vars).

## Notes
- Heavy compute (Pyodide) stays in the browser; the Worker only orchestrates + RAG + literature.
- Rate limiting should be configured in the Cloudflare dashboard (WAF / Rate Limiting rules) rather than in-process.
- For CORS, update `ALLOWED_ORIGINS` secret/var.
- Vectorize (optional) can back a shared/public corpus; default RAG is client-side.