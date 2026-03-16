# CLAUDE.md — Old Florida Fish House AI Server Assistant

> This file is the single source of truth for any AI assistant (Claude Code, Claude.ai, etc.) working on this project. Read it before making any changes.

---

## Project Overview

An AI-powered restaurant assistant for **Old Florida Fish House** (OFHS) serving three audiences through a single Next.js application:

- **Guests** — unauthenticated, access via QR code at `/` (landing) and `/chat` (assistant). Can browse menus, ask about allergens, get pairing recommendations, hear the restaurant story.
- **Staff** — authenticated (email/password), access at `/portal` (landing) → `/staff` (assistant). See everything guests see PLUS prep notes, upsell guidance, common questions.
- **Admin** — authenticated (email/password, admin role), access at `/portal` (landing) → `/admin` (dashboard + CRUD). Full management of all menu data, restaurant profile, key people, categories, items, pairings, staff notes.

**Live URL:** https://ai-server-assistant-alreadyexists.vercel.app

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | `src/` directory, `@/*` path alias |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"`, CSS-first config via `@theme inline` |
| Database | PostgreSQL via Supabase | 14 tables, RLS enabled, free tier |
| Auth | Supabase Auth | Email/password, session via cookies, proxy-enforced |
| AI | Claude API (Anthropic SDK) | Claude Sonnet 4, streaming via SSE |
| Hosting | Vercel | Framework preset: Next.js, deploys from GitHub |

---

## Sprint Status — COMPLETE

| Day | Focus | Status |
|-----|-------|--------|
| 1 | Foundation — scaffold, DB schema, seed 560 items | ✅ |
| 2 | Auth & Layout — login, proxy, role guards, layouts | ✅ |
| 3 | Admin Panel — API routes, dashboard stats, CRUD for all entities | ✅ |
| 4 | AI Agent Core — /api/chat, intent classification, Claude integration | ✅ |
| 5 | Chat UI & Agent Refinement — streaming, guest + staff chat pages | ✅ |
| 6 | Polish & Edge Cases — mobile, QR, error handling, rate limiting, edge cases | ✅ |
| 7 | Deploy, Document, Ship — Vercel production, security review, README | ✅ |

---

## Key Architecture Decisions

### Next.js 16: proxy.ts not middleware.ts
Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`. The file is at `src/proxy.ts` with a default export `proxy()` function. Same capabilities, different name. Runs on Node.js runtime.

### Hybrid AI Architecture
The chat endpoint doesn't dump all 560 items into Claude's context. Instead:
1. Intent classifier detects what the user is asking about (allergen, dietary, menu, pairing, etc.)
2. Targeted Supabase queries fetch only the relevant data
3. Results are injected into the user message as structured context
4. Claude generates a natural language response grounded in real data

### Junction Table Replace-All Pattern
When updating allergens, dietary tags, pairings, or staff notes for an item, the API deletes all existing records and inserts the new set. Simpler than diffing.

### Admin API Auth Pattern
All admin routes call `requireAdmin()` first — verifies session via server client, checks admin role via service role client, returns the admin client for the route to use.

---

## Database Schema (14 tables)

**IMPORTANT:** The table is `restaurant` (singular), NOT `restaurants`.

```
restaurant (1) ──── (many) menus
menu (1) ──── (many) menu_categories
menu_category (1) ──── (many) menu_items
menu_item (many) ──── (many) allergens        [junction: item_allergens]
menu_item (many) ──── (many) dietary_tags      [junction: item_dietary_tags]
menu_item (1) ──── (many) item_pairings
menu_item (1) ──── (many) item_staff_notes
service_setting (many) ──── (many) menus       [junction: menu_service_settings]
key_people — linked to restaurant
users — extends Supabase auth.users with role enum
```

---

## Design System

Two visual modes:
- **Guest-facing** (`/`, `/chat`): Light base, OFHS teal/sand brand colors
- **Staff/Admin** (`/portal`, `/staff`, `/admin`, `/auth`): Dark navy `#0a1628` base, gold `#c4956a` accents

Fonts: Nunito Sans (body), Poppins (headings), Caveat (decorative accent)

---

## Auth & Test Credentials

- **Admin**: `admin@ofhs.demo` / `Admin123!`
- **Staff**: `staff@ofhs.demo` / `Staff123!`
- Seed with: `npm run seed-users`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-claude-api-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## What NOT to Do

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to client code
- Never use `.from("restaurants")` — the table is `restaurant` (singular)
- Never use `middleware.ts` — Next.js 16 uses `proxy.ts`
- Never skip `requireAdmin()` in admin API routes
- Never hardcode menu data — everything comes from Supabase

---

## Ongoing Work: Data Collection

The application infrastructure is complete. The primary remaining work is populating the database with complete, verified data:

- Detailed ingredient lists for all 560 items
- Verified allergen information (contains/free_of/verify for each item)
- Wine, cocktail, sake, beer, and non-alcoholic pairing recommendations
- Staff notes: prep details, upsell guidance, common guest questions
- Restaurant story, key people bios, policies
- Description text (short and long) for all items

All data entry happens through the admin panel at `/admin`. As data is added, the AI agent automatically incorporates it into responses — no code changes needed.