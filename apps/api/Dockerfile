# ── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/math-core/package.json ./packages/math-core/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY package.json pnpm-workspace.yaml turbo.json ./

RUN pnpm --filter @mathx/api build

# ── Stage 3: runtime ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S mathx && adduser -u 1001 -S mathx -G mathx

# Only copy what the runtime needs
COPY --from=builder --chown=mathx:mathx /app/apps/api/dist ./dist
COPY --from=builder --chown=mathx:mathx /app/node_modules ./node_modules
COPY --from=builder --chown=mathx:mathx /app/packages ./packages

USER mathx

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
