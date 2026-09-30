# StockLens — Architecture

## Phase 1 Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser (React + Vite)                        │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth    │  │  TanStack    │  │  Zustand (client state)  │  │
│  │  Guards  │  │  Query       │  │  authStore, uiStore      │  │
│  └──────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                        │ REST (axios + interceptors)              │
└────────────────────────┼────────────────────────────────────────┘
                         │
                  HTTP / JSON
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                 Express API (port 4000)                          │
│                                                                  │
│  Helmet │ CORS │ RateLimit │ Morgan                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────────────┐ │
│  │ /auth    │  │ /stocks  │  │ /admin                        │ │
│  │ register │  │ search   │  │ bootstrap (token-gated)       │ │
│  │ login    │  │ detail   │  │ users, roles, suspend         │ │
│  │ refresh  │  │ ohlcv    │  │ audit-logs, health            │ │
│  │ logout   │  │ quote    │  └───────────────────────────────┘ │
│  │ /me      │  │ market-  │                                     │
│  └──────────┘  │ summary  │  Middleware stack:                  │
│                └────┬─────┘  authMiddleware (JWT verify)        │
│                     │        requireRole (RBAC hierarchy)        │
│  JWT utility         │        validate (Zod body/query)          │
│  Argon2id            │        errorMiddleware (centralised)      │
│  httpOnly cookie     │                                           │
└─────────────────────┼───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│  Drizzle ORM │ │  Market Data │ │  Audit Logger             │
│  + pg Pool   │ │  Provider    │ │  (writes to audit_logs)  │
│              │ │  Interface   │ └──────────────────────────┘
│  users       │ │              │
│  refresh_tok │ │  ┌─────────┐ │
│  audit_logs  │ │  │  Mock   │ │  Phase 2+
│  stocks      │ │  │ Adapter │◄┼────────── Finnhub Adapter
│  ohlcv_daily │ │  └─────────┘ │           (WebSocket + REST)
│  watchlists  │ └──────────────┘
│  bootstrap_  │
│  state       │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│   PostgreSQL 16  │
│   (Docker)       │
│                  │
│  All prices as   │
│  NUMERIC(20,4)   │
│  Never floats    │
└──────────────────┘
```

## Shared Packages (Monorepo)

```
packages/
├── @stocklens/types       → Domain TypeScript types (User, Stock, Quote, Order…)
├── @stocklens/validators  → Zod schemas (used in API validation + FE forms)
└── @stocklens/tsconfig    → Shared tsconfig (base, node, react)
```

## Phase 2+ Evolution

```
Phase 2: WebSocket (ws) → Real-time price ticks
Phase 3: Paper Trading (orders, holdings, P&L) — decimal arithmetic enforced
Phase 4: News Engine → structured event extraction
Phase 5: AI Analyst → evidence-graded prompting (never raw LLM output)
Phase 6: Redis (cache + pub/sub) → BullMQ workers → horizontal WS scaling
Phase 7: Security hardening, OpenTelemetry, load testing
Phase 8: Polish, a11y, OpenAPI/Swagger docs
```

## Security Architecture

- Passwords: **Argon2id** (65536 memory, 3 iterations)
- Access tokens: **JWT HS256**, 15-minute TTL, Bearer header
- Refresh tokens: **SHA-256 hashed** in DB, rotated on every use, stored in **httpOnly `SameSite=Strict` cookie**
- RBAC: **Hierarchical role levels** (INVESTOR < ANALYST < ADMIN < SUPER_ADMIN)
- All routes protected by `authMiddleware` + `requireRole` guard
- All inputs validated by **Zod** (validates and coerces — sanitised value replaces raw input)
- SQL injection: **impossible** via Drizzle parameterised queries
- Rate limiting: 500 req/15min global, 20 req/15min auth routes
- Admin bootstrap: one-time endpoint, token-gated, irreversible flag in DB
- Audit log: every sensitive action writes to `audit_logs` table

## Data Integrity Rules

| Rule | Enforcement |
|---|---|
| All money as NUMERIC | Drizzle schema `numeric(20,4)` — never `float` or `double` |
| Price labelling | Every price surface shows `LIVE / DELAYED / STALE / UNAVAILABLE` |
| No fabricated AI claims | Evidence system with `CONFIRMED / LIKELY / POSSIBLE / UNKNOWN` (Phase 5) |
| No raw LLM output | External content sanitised before AI prompt (Phase 5) |
| Idempotent orders | Idempotency key (UUID) on all order placements (Phase 3) |
