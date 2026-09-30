# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy API app
COPY apps/api/ ./apps/api/
COPY upstox_mapping.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages and API
RUN pnpm --filter @stocklens/types build || true
RUN pnpm --filter @stocklens/validators build || true
RUN pnpm --filter @stocklens/api build

# ─── Stage 2: Production Runner ───────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json
COPY upstox_mapping.json ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled artifacts from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/server.js"]
