# ─── Stage 1: Build Frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Copy root workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy shared packages
COPY packages/ ./packages/

# Copy Web frontend
COPY apps/web/ ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Web application bundle
RUN pnpm --filter @stocklens/types build || true
RUN pnpm --filter @stocklens/validators build || true
RUN pnpm --filter @stocklens/web build

# ─── Stage 2: Nginx Web Server ────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
