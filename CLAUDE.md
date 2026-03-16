# CLAUDE.md — Old Florida Fish House AI Server Assistant

> This file is the single source of truth for any AI assistant (Claude Code, Claude.ai, etc.) working on this project. Read it before making any changes.

---

## Project Overview

An AI-powered restaurant assistant for **Old Florida Fish House** (OFHS) serving three audiences through a single Next.js application:

- **Guests** — unauthenticated, access via QR code at `/` (landing) and `/chat` (assistant). Can browse menus, ask about allergens, get pairing recommendations, hear the restaurant story.
- **Staff** — authenticated (email/password), access at `/portal` (landing) → `/staff` (assistant). See everything guests see PLUS prep notes, upsell guidance, common questions.
- **Admin** — authenticated (email/password, admin role), access at `/portal` (landing) → `/admin` (dashboard + CRUD). Full management of all menu data, restaurant profile, key people, categories, items, pairings, staff notes.

The AI assistant is powered by Claude API, backed by Supabase (Postgres), deployed on Vercel.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | `src/` directory, `@/*` path alias |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` in globals.css, CSS-first config via `@theme inline` |
| Database | PostgreSQL via Supabase | 14 tables, RLS enabled, free tier |
| Auth | Supabase Auth | Email/password, session via cookies, middleware-enforced |
| AI | Claude API (Anthropic SDK) | `@anthropic-ai/sdk`, server-side only |
| Hosting | Vercel | Deploys from GitHub on push |

---

## Sprint Status

**7-day sprint. Current: Day 3 complete. Next: Day 4.**

| Day | Focus | Status |
|-----|-------|--------|
| 1 | Foundation — scaffold, DB schema, seed 560 items | ✅ Complete |
| 2 | Auth & Layout — login, middleware, role guards, layouts | ✅ Complete |
| 3 | Admin Panel — API routes, dashboard stats, CRUD for all entities | ✅ Complete |
| 4 | AI Agent Core — /api/chat, intent classification, Claude integration | 🔲 Next |
| 5 | Chat UI & Agent Refinement — streaming, guest + staff chat pages | 🔲 |
| 6 | Polish & Edge Cases — mobile, QR, error handling, prompt tuning | 🔲 |
| 7 | Deploy, Document, Demo — production deploy, README, demo script | 🔲 |

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                         # Guest landing — cycling phrases, "Got Questions?" + "Explore Our Menu"
│   ├── layout.tsx                       # Root layout — AuthProvider + Navbar (global logo)
│   ├── globals.css                      # Tailwind v4 + @theme inline (fonts, OFHS colors)
│   ├── chat/
│   │   ├── layout.tsx                   # Guest header (no auth)
│   │   └── page.tsx                     # Guest chat (Day 5)
│   ├── portal/
│   │   ├── layout.tsx                   # Portal layout (dark bg, no nav)
│   │   └── page.tsx                     # Staff/Admin landing — auth-gated, role-aware buttons
│   ├── staff/
│   │   ├── layout.tsx                   # Auth-guarded, AppNav
│   │   └── page.tsx                     # Staff chat placeholder (Day 5)
│   ├── admin/
│   │   ├── layout.tsx                   # Admin-role-guarded, AppNav
│   │   ├── page.tsx                     # Dashboard with real stats + quick links
│   │   ├── menus/
│   │   │   ├── page.tsx                 # Menu list — create/edit/delete menus
│   │   │   └── [menuId]/page.tsx        # Menu detail — edit menu, manage categories, view items
│   │   ├── items/
│   │   │   ├── page.tsx                 # Item list — search, filter by menu/category/allergen/dietary/active
│   │   │   └── [itemId]/page.tsx        # Item detail — full edit form (7 sections)
│   │   └── restaurant/
│   │       └── page.tsx                 # Restaurant profile + key people editor
│   ├── auth/
│   │   ├── login/page.tsx               # Login form (email + password)
│   │   ├── callback/route.ts            # Supabase auth code exchange
│   │   └── signout/route.ts             # Server-side signout (clears httpOnly cookies)
│   └── api/
│       ├── chat/route.ts                # AI chat endpoint (Day 4)
│       ├── menu/route.ts                # Public menu data query
│       └── admin/
│           ├── stats/route.ts           # GET — dashboard counts
│           ├── restaurant/route.ts      # GET, PUT — restaurant profile
│           ├── key-people/
│           │   ├── route.ts             # GET, POST
│           │   └── [id]/route.ts        # PUT, DELETE
│           ├── menus/
│           │   ├── route.ts             # GET, POST
│           │   └── [id]/route.ts        # GET, PUT, DELETE
│           ├── categories/
│           │   ├── route.ts             # POST
│           │   └── [id]/route.ts        # PUT, DELETE
│           ├── items/
│           │   ├── route.ts             # GET (with filters), POST
│           │   └── [id]/
│           │       ├── route.ts         # GET, PUT, DELETE
│           │       ├── allergens/route.ts     # PUT (replace all)
│           │       ├── dietary-tags/route.ts  # PUT (replace all)
│           │       ├── pairings/route.ts      # PUT (replace all)
│           │       └── staff-notes/route.ts   # PUT (replace all)
│           ├── allergens/route.ts       # GET — reference data
│           ├── dietary-tags/route.ts    # GET — reference data
│           └── service-settings/route.ts # GET — reference data
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx            # AuthContext — module-level Supabase singleton, session/role/signIn/signOut
│   └── navigation/
│       ├── navbar.tsx                   # Global logo nav (rendered in root layout)
│       └── app-nav.tsx                  # Staff/admin top nav with role-aware links
├── lib/
│   ├── supabase-client.ts               # Browser client (anon key)
│   ├── supabase-server.ts               # Server client (cookie-based, for RSC/routes)
│   ├── supabase-admin.ts                # Service role client (bypasses RLS, server only)
│   ├── admin-auth.ts                    # requireAdmin() helper — verifies session + admin role, returns admin client
│   ├── anthropic.ts                     # Claude API client factory (server only)
│   └── fonts.ts                         # Nunito Sans (body), Poppins (heading), Caveat (accent)
├── middleware.ts                         # Route protection + role enforcement + session refresh
└── types/
    └── database.ts                      # Full DB types + Supabase Database interface
```

### Supabase directory
```
supabase/
├── migration.sql                        # Full schema — 14 tables, RLS, indexes, triggers
├── seed.ts                              # Seeds 560 menu items from JSON
├── seed-users.ts                        # Creates admin + staff test accounts
└── OFHS_menu_data_normalized.json       # Source menu data
```

---

## Database Schema (14 tables)

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

**IMPORTANT table name note:** The table is `restaurant` (singular), NOT `restaurants`. All Supabase queries must use `.from("restaurant")`.

**Key types** (defined in `src/types/database.ts`):
- Enums: `UserRole`, `AllergenStatus`, `DietaryTagStatus`, `PairingType`, `StaffNoteType`
- Joined types: `MenuItemWithDetails`, `MenuCategoryWithItems`, `MenuWithCategories`
- Full `Database` interface for typed Supabase client

**RLS rules**:
- Menu data, restaurant, allergens, dietary tags, pairings → **public read** (guests can query)
- `item_staff_notes` → **staff + admin read only**
- All tables → **admin-only write** (insert/update/delete)
- `users` → read own record; admin reads all

---

## Design System

### Color Palette

The app uses two visual modes:

**Guest-facing pages** (`/`, `/chat`): Light/white base with OFHS brand colors.
**Staff/Admin pages** (`/portal`, `/staff`, `/admin`, `/auth/login`): Dark navy base.

| Token | Hex / Value | Usage |
|-------|------------|-------|
| Dark background | `#0a1628` | Portal, staff, admin, auth page backgrounds |
| Dark card surface | `white/5` (rgba) | Cards, inputs, elevated surfaces on dark pages |
| Dark border | `white/10` | Subtle borders, dividers on dark pages |
| Nav background | `#0d1f35` | AppNav top bar |
| Accent gold | `#c4956a` | Primary buttons, branding text, active states |
| Accent gold hover | `#d4a57a` | Button hover state |
| Text (dark theme primary) | `white` | Headings on dark backgrounds |
| Text (dark theme secondary) | `white/50` | Nav items, labels |
| Text (dark theme muted) | `white/30` – `white/40` | Hints, metadata |
| OFHS Teal | `#3bbfad` / `ofhs-teal` | Brand color (guest-facing) |
| OFHS Teal Dark | `#2a9a8a` / `ofhs-teal-dark` | Hover states (guest-facing) |
| OFHS Teal Light | `#e6f7f5` / `ofhs-teal-light` | Light backgrounds (guest-facing) |
| OFHS Sand | `#f5f0e8` / `ofhs-sand` | Warm background (guest-facing) |
| OFHS Charcoal | `#2d2d2d` / `ofhs-charcoal` | Text on light backgrounds |
| Decorative blue | `#1a3a5c` | Background blur accents |
| Decorative green | `#0d4a3a` | Background blur accents |
| Error | `red-500/10` bg, `red-300` text | Error messages on dark bg |

### Typography

Three font families defined in `src/lib/fonts.ts`, registered as CSS variables and available as Tailwind utilities:

| Font | Variable | Tailwind Class | Usage |
|------|----------|---------------|-------|
| Nunito Sans | `--font-body` | `font-body` | Body text, default |
| Poppins | `--font-heading` | `font-heading` | Headings, nav branding, labels |
| Caveat | `--font-accent` | `font-accent` | Decorative accent text (cycling phrases) |

Applied in root layout via `fontVariables` on `<html>` and `font-body` on `<body>`.

### Component Patterns (dark theme admin/staff pages)

- **Cards**: `rounded-xl border border-white/10 bg-white/5 p-6` with hover: `hover:border-[#c4956a]/30 hover:bg-white/[0.07]`
- **Inputs**: `rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30`
- **Primary button**: `rounded-lg bg-[#c4956a] px-4 py-3 font-medium text-[#0a1628] hover:bg-[#d4a57a]`
- **Ghost button**: `rounded-md border border-white/10 px-3 py-1.5 text-white/40 hover:border-white/20 hover:text-white/70`
- **Nav link (active)**: `bg-white/10 text-white rounded-md px-3 py-1.5`
- **Nav link (inactive)**: `text-white/50 hover:text-white/80`

---

## Auth Flow

1. **Middleware** (`src/middleware.ts`) runs on every non-static, non-API route
2. Refreshes Supabase session cookies via `getUser()`
3. `/staff/*` and `/admin/*` require authenticated user → redirects to `/auth/login` if not
4. `/admin/*` additionally requires `role = 'admin'` in the `users` table
5. Staff trying to access `/admin` get redirected to `/staff`
6. Authenticated users hitting `/auth/login` get redirected to `/portal`
7. **AuthProvider** (`src/components/providers/auth-provider.tsx`):
   - Module-level Supabase singleton (stable reference, no re-render loops)
   - Uses `onAuthStateChange` as single source of truth (INITIAL_SESSION fires on mount)
   - Sets user/session immediately, fetches role async
   - 5-second safety timeout unblocks UI if auth never fires
   - `signOut()` clears client state + POSTs to `/auth/signout` to clear httpOnly cookies
8. **Admin API auth** (`src/lib/admin-auth.ts`):
   - `requireAdmin()` verifies session via server client, checks role via admin client
   - Returns 401 if no session, 403 if not admin role
   - Returns admin client (service role, bypasses RLS) for the route to use

### Test Credentials
- **Admin**: `admin@ofhs.demo` / `Admin123!`
- **Staff**: `staff@ofhs.demo` / `Staff123!`
- Seed with: `npm run seed-users`

---

## Admin API Pattern

All admin routes follow this pattern:
```typescript
import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
  const result = await requireAdmin();
  if (result.error) return result.error;
  const admin = result.admin;
  // ... use admin client for queries
}
```

The `admin` client is a Supabase service role client that bypasses RLS. It is ONLY used in API routes, never in client components.

**Junction table updates** (allergens, dietary tags, pairings, staff notes) use a replace-all pattern: DELETE all existing records for the item, then INSERT the new set. This is simpler than diffing and avoids stale orphan records.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=your-claude-api-key

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Conventions & Rules

### Code Style
- TypeScript strict mode enabled
- Use `@/*` path alias for all imports
- React components: functional with hooks, no class components
- Client components: `"use client"` at top
- Server components: default (no directive)
- Supabase clients: `supabase-client.ts` (browser), `supabase-server.ts` (RSC/routes), `supabase-admin.ts` (API routes needing RLS bypass)

### File Naming
- Components: PascalCase exports, kebab-case files (e.g., `auth-provider.tsx` → `AuthProvider`)
- Pages/routes: Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`)
- API routes: RESTful structure under `src/app/api/admin/`

### Data Flow
- **Read (public)**: Anon Supabase client → RLS allows public reads
- **Read (staff notes)**: Requires authenticated session with staff/admin role
- **Write (admin)**: API routes use `requireAdmin()` → service role client
- **AI queries**: Server-side only → API route queries Supabase, passes to Claude, returns response

### What NOT to Do
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the browser
- Never import from `@/lib/supabase-admin`, `@/lib/admin-auth`, or `@/lib/anthropic` in client components
- Never use `.from("restaurants")` — the table is `restaurant` (singular)
- Never hardcode menu data — everything comes from Supabase
- Never skip the `requireAdmin()` check in admin API routes

---

## Upcoming Work (Day 4: AI Agent Core)

Next session should build:
1. `/api/chat` route — the core AI endpoint
2. Intent classification — structured DB queries vs. conversational Claude responses
3. Supabase query functions for: allergen filter, dietary filter, category filter, menu filter, keyword search
4. System prompt assembler — pulls restaurant context, menu structure from DB
5. Claude API integration via Anthropic SDK with conversation history
6. Hybrid flow: DB query → format results → Claude generates natural language response
7. Base system prompt: persona, behavioral rules, guest vs. staff mode awareness
8. Test: menu browsing, allergen filtering, basic recommendations

The chat endpoint should detect user mode (guest vs. staff) from the request and adjust what data Claude sees (staff mode includes staff_notes, guest mode does not).