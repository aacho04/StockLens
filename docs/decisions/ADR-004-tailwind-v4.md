# ADR-004: Tailwind CSS v4 over Vanilla CSS

**Date:** 2026-09-23
**Status:** Accepted

---

## What

We use **Tailwind CSS v4** (with the `@tailwindcss/vite` plugin) rather than vanilla CSS for the frontend.

## Why

1. **Component-rich financial UI** — a platform with dashboards, tables, cards, badges, charts, forms, and sidebars benefits enormously from utility-first composition. Vanilla CSS would require a large bespoke component library to maintain.
2. **CSS-first config (v4)** — no `tailwind.config.js`, no `postcss.config.js`. Design tokens live in `@theme {}` blocks directly in CSS. Simpler to version-control, simpler to understand.
3. **Rust-powered engine** — v4's new engine provides up to 100x faster incremental builds. For a hot-reload dev loop, this matters.
4. **Native CSS variables** — `@theme` emits CSS custom properties, so tokens are inspectable in browser devtools like any CSS variable.
5. **Zero config sharing** — the `@tailwindcss/vite` plugin integrates directly; no PostCSS pipeline to configure separately.
6. **shadcn/ui compatibility** — if we adopt shadcn components later, they require Tailwind. Building on v4 now avoids migration.

## Custom design system

Our `index.css` defines a complete `@theme {}` block with all StockLens-specific tokens:
- Color palette (navy base, indigo brand, emerald gain, rose loss)
- Typography (Inter + JetBrains Mono)
- Border radii, shadows, glow effects
- Custom animations (price flash, skeleton shimmer, live dot pulse)

These live alongside Tailwind utilities, not in conflict with them.

## Could we skip it?

Yes — a hand-crafted CSS system would work. But for a team project of this scale, the productivity loss of writing every utility class from scratch would significantly slow feature development.

## Alternatives considered

- **Vanilla CSS modules** — good isolation, but repetitive for layout utilities and difficult to maintain consistency.
- **Tailwind v3** — legacy config system, slower engine. No reason to use it when v4 is stable.
- **Styled-components / Emotion** — CSS-in-JS adds runtime overhead and complicates SSR. Not suitable.
- **UnoCSS** — atomic CSS, great performance. Strong alternative, but Tailwind's ecosystem (docs, components, community) is larger.
