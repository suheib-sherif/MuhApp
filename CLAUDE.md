# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arabic-language (RTL) accounting web application ("النظام المحاسبي الذكي") built with React 19 + Express + SQLite. Originally scaffolded from Google AI Studio. Currency is Libyan Dinar (LYD/د.ل).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Express + Vite HMR on port 3000)
npm run build        # Production build (Vite → ./dist)
npm run preview      # Preview production build
npm run clean        # Remove dist/
npm run lint         # Type-check only (tsc --noEmit) — no test framework exists
```

Requires `.env.local` with `GEMINI_API_KEY` (see `.env.example`). The SQLite database (`accounting.db`) is auto-created with seed data on first run. Default admin: `admin@smart-acc.com` / `admin123`.

## Architecture

**Single-process server**: `server.ts` runs Express with Vite dev middleware embedded. In production, Express serves the built `dist/` folder. All REST API endpoints (`/api/*`) are defined in `server.ts`.

**Database**: SQLite via `better-sqlite3` (synchronous). Schema is created inline with `CREATE TABLE IF NOT EXISTS` in `server.ts`. Tables: `users`, `transactions`, `expense_categories`, `audit_trail`, `notifications`.

**Frontend monolith**: Nearly all UI logic lives in `src/App.tsx` (~2500 lines). Navigation is tab-based via `activeTab` state string — no React Router. Only one extracted component exists (`src/components/Login.tsx`). State is managed entirely with `useState`/`useEffect` — no external state library.

**Auth**: Login POSTs to `/api/login`, user object stored in `localStorage`. No JWT in practice despite the env var.

**Path alias**: `@/` maps to project root (configured in both `vite.config.ts` and `tsconfig.json`).

## Key Conventions

- **Styling**: Tailwind CSS v4 utilities only. Use `cn()` from `src/types.ts` (clsx + tailwind-merge) for conditional classes. Color scheme: indigo (primary), emerald (revenue), rose (expense), amber (petty cash). Heavily rounded corners (`rounded-xl` to `rounded-3xl`).
- **Dark mode**: Toggled via `dark` class on `document.documentElement`, using Tailwind `dark:` variants.
- **Animations**: Framer Motion via `motion/react`. Standard pattern: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`. Wrap conditional renders with `AnimatePresence`.
- **RTL**: Global `direction: rtl` in `index.css`. All UI text is Arabic. Cairo font from Google Fonts.
- **API calls**: Direct `fetch()` to `/api/*` endpoints — no API client library.
- **Currency formatting**: `new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' })` with symbol replaced to `د.ل`.
- **Transaction codes**: `PC-XXXX` (petty cash), `EX-XXXX` (expense), `RV-XXXX` (revenue).
- **Types**: Shared interfaces in `src/types.ts`.
