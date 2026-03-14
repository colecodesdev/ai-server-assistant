# CLAUDE.md — Old Florida Fish House AI Server Assistant

> This file is the single source of truth for any AI assistant (Claude Code, Claude.ai, etc.) working on this project. Read it before making any changes.

---

## Project Overview

An AI-powered restaurant assistant for **Old Florida Fish House** (OFHS) serving three audiences through one Next.js application:

- **Guests** — unauthenticated, access via QR code at `/chat`. Can browse menus, ask about allergens, get pairing recommendations, hear the restaurant story.
- **Staff** — authenticated (email/password), access at `/staff`. See everything guests see PLUS prep notes, upsell guidance, common questions.
- **Admin** — authenticated (email/password, admin role), access at `/admin`. Full CRUD for all menu data, restaurant profile, key people, categories, items, pairings, staff notes.

The AI assistant is powered by Claude API, backed by Supabase (Postgres), deployed on Vercel.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router, TypeScript) | `src/` directory, `@/*` path alias |
| Styling | Tailwind CSS v4 | `@import "tailwindcss"` in globals.css, no tailwind.config — uses CSS-first config |
| Database | PostgreSQL via Supabase | 14 tables, RLS enabled, free tier |
| Auth | Supabase Auth | Email/password, session via cookies, middleware-enforced |
| AI | Claude API (Anthropic SDK) | `@anthropic-ai/sdk`, server-side only |
| Hosting | Vercel | Deploys from GitHub on push |

---

## Sprint Status

**7-day sprint. Current: Day 2 complete.**

| Day | Focus | Status |
|-----|-------|--------|
| 1 | Foundation — scaffold, DB schema, seed 560 items | ✅ Complete |
| 2 | Auth & Layout — login, middleware, role guards, layouts | ✅ Complete |
| 3 | Admin Panel — CRUD for menus, items, categories, restaurant profile | 🔲 Next |
| 4 | AI Agent Core — /api/chat, intent classification, Claude integration | 🔲 |
| 5 | Chat UI & Agent Refinement — streaming, guest + staff chat pages | 🔲 |
| 6 | Polish & Edge Cases — mobile, QR, error handling, prompt tuning | 🔲 |
| 7 | Deploy, Document, Demo — production deploy, README, demo script | 🔲 |

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                         # Landing — role-aware redirect
│   ├── layout.tsx                       # Root layout — wraps AuthProvider
│   ├── globals.css                      # Tailwind v4 + CSS variables
│   ├── chat/
│   │   ├── layout.tsx                   # Guest header (no auth)
│   │   └── page.tsx                     # Guest chat (Day 5)
│   ├── staff/
│   │   ├── layout.tsx                   # Auth-guarded, AppNav
│   │   └── page.tsx                     # Staff chat (Day 5)
│   ├── admin/
│   │   ├── layout.tsx                   # Admin-role-guarded, AppNav
│   │   ├── page.tsx                     # Dashboard with quick links
│   │   ├── menus/
│   │   │   ├── page.tsx                 # Menu list (Day 3)
│   │   │   └── [menuId]/page.tsx        # Menu detail/edit (Day 3)
│   │   ├── items/
│   │   │   ├── page.tsx                 # Item list with search/filter (Day 3)
│   │   │   └── [itemId]/page.tsx        # Item detail/edit form (Day 3)
│   │   └── restaurant/
│   │       └── page.tsx                 # Restaurant profile editor (Day 3)
│   ├── auth/
│   │   ├── login/page.tsx               # Login form (email + password)
│   │   └── callback/route.ts            # Supabase auth code exchange
│   └── api/
│       ├── chat/route.ts                # AI chat endpoint (Day 4)
│       ├── menu/route.ts                # Menu data queries
│       └── admin/                       # Admin CRUD endpoints (Day 3)
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx            # AuthContext — session, role, signIn/signOut
│   └── navigation/
│       └── app-nav.tsx                  # Top nav for staff/admin zones
├── lib/
│   ├── supabase-client.ts               # Browser client (uses anon key)
│   ├── supabase-server.ts               # Server client (cookie-based, for RSC/routes)
│   ├── supabase-admin.ts                # Service role client (bypasses RLS, server only)
│   └── anthropic.ts                     # Claude API client factory (server only)
├── middleware.ts                         # Route protection + role enforcement
└── types/
    └── database.ts                      # Full DB types + Supabase Database type
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

| Token | Hex | Usage |
|-------|-----|-------|
| Background (primary) | `#0a1628` | Page backgrounds, dark base |
| Background (card) | `white/5` (rgba) | Cards, inputs, elevated surfaces |
| Border | `white/10` | Subtle borders, dividers |
| Accent (gold) | `#c4956a` | Buttons, branding, links, active states |
| Accent (gold hover) | `#d4a57a` | Button hover state |
| Text (primary) | `white` | Headings, primary content |
| Text (secondary) | `white/50` | Nav items, labels |
| Text (muted) | `white/30` – `white/40` | Hints, metadata, placeholders |
| Text (faint) | `white/20` | Subtle annotations |
| Decorative blue | `#1a3a5c` | Background blur accents |
| Decorative green | `#0d4a3a` | Background blur accents |
| Nav background | `#0d1f35` | Top navigation bar |
| Error | `red-500/10` bg, `red-300` text | Error messages |

### Theme

Dark coastal — inspired by an Old Florida waterfront aesthetic. Deep navy base, warm gold accents, translucent glass-like cards. No light mode. All pages use the dark theme.

### Typography

Using Geist Sans and Geist Mono (via `next/font/google`), set as CSS variables `--font-geist-sans` and `--font-geist-mono`. The root layout applies both via className.

- Branding text: `text-sm font-medium uppercase tracking-[0.2em] text-[#c4956a]`
- Page headings: `text-2xl font-light text-white`
- Body text: default Tailwind sizes, `text-white/40` to `text-white/70`
- Tiny labels: `text-[10px] uppercase tracking-wider`

### Component Patterns

- **Cards**: `rounded-xl border border-white/10 bg-white/5 p-6` with hover: `hover:border-[#c4956a]/30 hover:bg-white/[0.07]`
- **Inputs**: `rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#c4956a]/60 focus:ring-1 focus:ring-[#c4956a]/30`
- **Primary button**: `rounded-lg bg-[#c4956a] px-4 py-3 font-medium text-[#0a1628] hover:bg-[#d4a57a]`
- **Ghost button**: `rounded-md border border-white/10 px-3 py-1.5 text-white/40 hover:border-white/20 hover:text-white/70`
- **Nav link (active)**: `bg-white/10 text-white rounded-md px-3 py-1.5`
- **Nav link (inactive)**: `text-white/50 hover:text-white/80`
- **Decorative backgrounds**: Absolute-positioned divs with large border-radius, low-opacity colors, and `blur-3xl`

---

## Auth Flow

1. **Middleware** (`src/middleware.ts`) runs on every non-static route
2. Refreshes Supabase session cookies
3. `/staff/*` and `/admin/*` require authenticated user → redirects to `/auth/login` if not
4. `/admin/*` additionally requires `role = 'admin'` in the `users` table
5. Staff trying to access `/admin` get redirected to `/staff`
6. Authenticated users hitting `/auth/login` get redirected to their zone
7. **AuthProvider** (`src/components/providers/auth-provider.tsx`) provides client-side context: `user`, `session`, `role`, `isLoading`, `signIn()`, `signOut()`

### Test Credentials
- **Admin**: `admin@ofhs.demo` / `Admin123!`
- **Staff**: `staff@ofhs.demo` / `Staff123!`
- Seed with: `npm run seed-users`

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
- Use `@/*` path alias for all imports (e.g., `@/lib/supabase-client`, `@/components/providers/auth-provider`)
- React components: functional components with hooks, no class components
- Client components: mark with `"use client"` at top of file
- Server components: default (no directive needed)
- Supabase client usage: `supabase-client.ts` in browser, `supabase-server.ts` in RSC/route handlers, `supabase-admin.ts` only in scripts/API routes that need to bypass RLS

### File Naming
- Components: PascalCase for component names, kebab-case for file names (e.g., `auth-provider.tsx` exports `AuthProvider`)
- Pages/routes: follow Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`)
- Types: defined in `src/types/database.ts`, import individual types as needed

### Data Flow
- **Read (public)**: Use anon Supabase client → RLS allows public reads on menu data
- **Read (staff notes)**: Requires authenticated session with staff/admin role
- **Write (admin)**: Use authenticated client with admin role, or use admin client in API routes
- **AI queries**: Server-side only → API route calls Supabase for data, passes to Claude API, returns response

### What NOT to Do
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the browser
- Never import from `@/lib/supabase-admin` or `@/lib/anthropic` in client components
- Never use light mode / white backgrounds — this is a dark-theme-only app
- Never use Inter, Roboto, Arial, or other generic fonts — we use Geist
- Never hardcode menu data — everything comes from Supabase
- Never skip RLS — all browser-facing queries go through the anon client with RLS enforced

---

## Upcoming Work (Day 3: Admin Panel)

Next session should build:
1. Admin dashboard with real stats (item count, menu count, etc.)
2. Menu list page with create/edit/delete
3. Category management within menus
4. Menu item list with search and filter
5. Menu item edit form (all fields: ingredients, allergens, dietary tags, pairings, staff notes)
6. Restaurant profile editor (story, key people, policies)
7. API routes for admin CRUD operations

All admin UI should follow the established design system (dark theme, gold accents, glass-card components).
