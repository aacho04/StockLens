# ADR-001: Monorepo over Separate Repositories

**Date:** 2026-09-23
**Status:** Accepted
**Decider:** Initial project setup

---

## What

We use a **pnpm monorepo managed by Turborepo** rather than separate repositories for the frontend (`apps/web`) and backend (`apps/api`).

## Why

1. **Shared TypeScript types** — `@stocklens/types` is consumed by both apps with zero copy-paste. A type change is a single commit.
2. **Shared Zod validators** — `@stocklens/validators` defines request/response schemas once, used for both API validation and frontend form validation.
3. **Single docker-compose root** — one `docker-compose up` starts all infrastructure for the entire project.
4. **Atomic commits** — a feature that touches both frontend and backend lands as a single PR, simplifying code review and history.
5. **Turborepo task caching** — `turbo build` only rebuilds packages whose source changed, making CI fast.
6. **Consistent tooling** — one ESLint config, one Prettier config, one TypeScript base config across the entire codebase.

## Could we skip it?

Yes — a two-repo approach with a published npm package for types would work. But for a learning project at this scale, the coordination overhead of publishing packages outweighs the simplicity benefit of separate repos.

## Alternatives considered

- **Nx** — more powerful (code generation, dependency graph visualization), but heavier setup and learning curve. Turborepo is sufficient.
- **Separate repos + shared npm package** — viable at scale, but adds `npm publish` step to every type change.
- **Copy-paste types between repos** — rejected immediately; leads to drift and bugs.
