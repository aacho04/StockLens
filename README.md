# StockLens

> **Market Intelligence + Paper Trading Platform**
> A portfolio/startup-quality full-stack app inspired by Groww/Zerodha, built to learn full-stack + AI system design properly.

---

> ⚠️ **This is NOT a real-money brokerage.** All trades are simulated with virtual currency. Market data may be delayed. AI-generated analysis is informational only — never financial advice.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v4 (CSS-first, `@theme`) |
| Charts | TradingView Lightweight Charts v5 |
| Data Fetching | TanStack Query v5 |
| State | Zustand v5 |
| Router | React Router v7 |
| Backend | Node.js + Express + TypeScript |
| ORM | Drizzle ORM + drizzle-kit |
| Database | PostgreSQL 16 |
| Auth | Argon2id + JWT (HS256) + httpOnly refresh cookies |
| Monorepo | pnpm workspaces + Turborepo |
| Containers | Docker Compose |

---

## Project Structure

```
StockLens/
├── apps/
│   ├── api/          # Express backend (port 4000)
│   └── web/          # React frontend (port 5173)
├── packages/
│   ├── types/        # Shared TypeScript domain types
│   ├── validators/   # Shared Zod schemas
│   └── tsconfig/     # Shared TypeScript configs
├── docs/
│   ├── architecture.md
│   └── decisions/    # ADR-style decision log
├── docker-compose.yml
├── .env.example
└── turbo.json
```

---

## Quick Start

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 10 (`npm install -g pnpm`)
- Docker Desktop (for Postgres)

### 1. Clone & Install

```bash
git clone <repo-url>
cd StockLens
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Fill in `.env` — **minimum required for local dev:**

```env
DATABASE_URL=postgresql://stocklens:stocklens@localhost:5432/stocklens
JWT_SECRET=<generate: openssl rand -base64 64>
REFRESH_TOKEN_SECRET=<generate: openssl rand -base64 64>
MARKET_DATA_PROVIDER=mock
NODE_ENV=development
```

### 3. Start Database

```bash
docker-compose up -d postgres
```

Wait for it to be healthy (check: `docker ps`).

### 4. Run Migrations & Seed

```bash
# Generate SQL migrations from Drizzle schema
pnpm --filter=@stocklens/api db:generate

# Apply migrations to database
pnpm db:migrate

# Seed 30 NSE stocks
pnpm db:seed
```

### 5. Bootstrap First Admin (optional)

Set `FIRST_ADMIN_BOOTSTRAP_TOKEN=your-secret-token` in `.env`, then:

```bash
curl -X POST http://localhost:4000/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrapToken": "your-secret-token",
    "email": "admin@stocklens.app",
    "displayName": "Admin",
    "password": "Admin@1234"
  }'
```

### 6. Start Dev Servers

```bash
pnpm dev
```

Opens:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

---

## Build Phases

| Phase | Status | Description |
|---|---|---|
| 0 | ✅ Done | Monorepo scaffold, Docker, shared packages, CI |
| 1 | ✅ Done | Auth, RBAC, dashboard, stock search, stock detail, mock data |
| 2 | 🔜 Planned | WebSocket live prices, watchlists, Finnhub integration |
| 3 | 🔜 Planned | Paper trading (orders, portfolio, P&L) |
| 4 | 🔜 Planned | News ingestion, market events |
| 5 | 🔜 Planned | AI analyst, evidence system |
| 6 | 🔜 Planned | Redis, BullMQ, caching, scaling |
| 7 | 🔜 Planned | Security hardening, observability |
| 8 | 🔜 Planned | Polish, a11y, OpenAPI docs |

---

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Seed mock market data |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |

---

## RBAC Roles

| Role | Capabilities |
|---|---|
| **Investor** | Trade, watchlists, portfolio, AI analysis |
| **Analyst** | Aggregate market data, sector reports |
| **Admin** | Manage users, audit logs, system health |
| **Super Admin** | Manage admins and system config |

---

## Environment Variables

See [`.env.example`](.env.example) for the full list with documentation.

---

## Architecture Decisions

See [`docs/decisions/`](docs/decisions/) for ADRs:
- [ADR-001](docs/decisions/ADR-001-monorepo.md) — Monorepo
- [ADR-002](docs/decisions/ADR-002-drizzle-over-prisma.md) — Drizzle ORM
- [ADR-003](docs/decisions/ADR-003-finnhub-market-data.md) — Market Data
- [ADR-004](docs/decisions/ADR-004-tailwind-v4.md) — Tailwind CSS v4

---

## Disclaimer

This application simulates trading using virtual currency only. It does not execute real financial transactions, does not provide licensed financial advice, and AI-generated content is informational, evidence-graded, and never guaranteed to be accurate or complete.
