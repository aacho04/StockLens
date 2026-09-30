# ADR-002: Drizzle ORM over Prisma

**Date:** 2026-09-23
**Status:** Accepted

---

## What

We use **Drizzle ORM** (with `drizzle-kit` for migrations) rather than Prisma for database access.

## Why

1. **SQL-first philosophy** — Drizzle's query builder closely mirrors SQL syntax. For financial data with complex joins and numeric precision requirements, being close to the SQL layer reduces surprises.
2. **All money as NUMERIC** — Drizzle's `numeric()` column type maps cleanly to Postgres `NUMERIC(precision, scale)`. We can guarantee no float arithmetic ever touches a price or amount.
3. **TypeScript schema** — The schema lives in `.ts` files rather than a `.prisma` DSL. It version-controls alongside application code and benefits from full TypeScript tooling.
4. **No Rust engine (ever)** — Drizzle has zero native binary dependencies. No Argon2 compile step conflicts, no cold-start penalty in serverless (Phase 6+).
5. **Lightweight** — ~8 KB bundle vs. Prisma's ~1.6 MB. Matters when we add edge/serverless routes later.
6. **Explicit queries** — Drizzle never hides what SQL is generated. Critical for financial apps where you need to know exactly what hits the database.

## Could we skip ORM entirely?

Yes — raw `pg` with parameterized queries is safe and performant. We use Drizzle because it provides compile-time type safety on query results, which catches schema drift at build time.

## Alternatives considered

- **Prisma** — excellent DX, better for CRUD-heavy admin tools. Considered hybrid (Drizzle for hot paths, Prisma for admin). Rejected in Phase 1 for simplicity; may revisit if admin complexity grows significantly.
- **TypeORM** — decorator-based, heavier, older design. Not chosen.
- **Kysely** — type-safe SQL query builder, no migrations. Good alternative but Drizzle's full-stack story (schema + migrations + client) is more cohesive.
