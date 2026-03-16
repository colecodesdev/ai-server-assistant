# Old Florida Fish House — AI Server Assistant

An AI-powered restaurant menu assistant built for [Old Florida Fish House](https://oldfloridafishhouse.com), a waterfront seafood restaurant in Santa Rosa Beach, Florida. Guests scan a QR code to chat with an AI that knows the full menu, allergen information, wine pairings, and the restaurant's story. Staff get the same assistant with access to internal prep notes, upsell guidance, and kitchen details.

## Live Demo

> Link will be added after deployment.

## Features

- **Guest Chat** — Natural language menu exploration via QR code, no login required
- **Allergen & Dietary Filtering** — Real-time database queries for allergen safety and dietary needs (gluten-free, vegan, etc.)
- **Wine & Cocktail Pairings** — AI-powered pairing recommendations backed by curated pairing data
- **Staff Mode** — Authenticated access with prep notes, upsell tips, and internal details
- **Admin Panel** — Full CRUD management for menus, items, categories, allergens, pairings, and staff notes
- **Streaming Responses** — Real-time token streaming via SSE for responsive chat experience
- **Role-Based Access Control** — Three-tier auth: guest (open), staff (login), admin (login + role)
- **Mobile-First Design** — Optimized for phone access via QR code at restaurant tables

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password, RLS) |
| AI | Claude API (Anthropic) — Sonnet 4 |
| Deployment | Vercel |

## Architecture

The assistant uses a **hybrid AI architecture** that combines structured database queries for precision with Claude for natural language generation. Rather than sending the entire menu to the LLM on every request, the system first classifies the user's intent, fetches only the relevant data from Supabase, then feeds that context to Claude alongside the conversation history. This keeps responses fast, accurate, and cost-efficient.

### AI Agent Flow

```
User message
  │
  ▼
Intent Classification (keyword matching + pattern recognition)
  │  Detects: allergen queries, dietary filters, menu browsing,
  │  item search, pairings, comparisons, price queries,
  │  service info, restaurant info, out-of-scope
  │
  ▼
Supabase Queries (only relevant data)
  │  Allergen filter, dietary filter, menu browse,
  │  item name match, keyword search, pairings lookup
  │  Staff notes included only for authenticated staff
  │
  ▼
System Prompt Assembly
  │  Restaurant context + menu structure + behavioral rules
  │  Mode-aware: guest vs. staff (staff sees prep notes)
  │
  ▼
Claude API (streaming or non-streaming)
  │
  ▼
Response rendered in chat UI
```

### Database Schema

14 tables with Row-Level Security:

```
restaurant ─────── menus
                     └── menu_categories
                           └── menu_items
                                 ├── item_allergens ──── allergens
                                 ├── item_dietary_tags ── dietary_tags
                                 ├── item_pairings
                                 └── item_staff_notes (staff/admin only)

service_settings ── menu_service_settings ── menus
key_people ──────── restaurant
users ──────────── auth.users (role: guest | staff | admin)
```

**RLS enforced at the database level:**
- Menu data, restaurant info, allergens, dietary tags, pairings — public read
- Staff notes — staff + admin read only
- All writes — admin only

### Security

- Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) never reach the browser
- All admin API routes require `requireAdmin()` auth check before any database operation
- The admin client (service role, bypasses RLS) is only instantiated after role verification
- Public and chat queries use the anon Supabase client, fully respecting RLS
- Rate limiting on the chat endpoint (IP-based, 20 requests/minute)
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- API error responses return generic messages — no stack traces or internal details

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account ([free tier](https://supabase.com))
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Vercel account (for deployment, optional for local dev)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-org/ai-server-assistant.git
   cd ai-server-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in your Supabase and Anthropic credentials. See `.env.local.example` for details.

4. Set up the database — copy `supabase/migration.sql` into the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) and execute it. This creates all 14 tables, RLS policies, indexes, and triggers.

5. Seed menu data (560 items from the real OFHS menu):
   ```bash
   npx tsx supabase/seed.ts
   ```

6. Seed test user accounts:
   ```bash
   npm run seed-users
   ```

7. Start the dev server:
   ```bash
   npm run dev
   ```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ofhs.demo` | `Admin123!` |
| Staff | `staff@ofhs.demo` | `Staff123!` |

Guests access `/chat` directly — no login required.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Guest landing page
│   ├── chat/page.tsx               # Guest chat interface
│   ├── portal/page.tsx             # Staff/admin login landing
│   ├── staff/page.tsx              # Staff chat (authenticated)
│   ├── admin/
│   │   ├── page.tsx                # Dashboard with stats
│   │   ├── menus/                  # Menu + category CRUD
│   │   ├── items/                  # Item CRUD (allergens, pairings, notes)
│   │   ├── restaurant/             # Restaurant profile + key people
│   │   └── qr/                     # Printable guest QR code
│   ├── auth/                       # Login, callback, signout
│   └── api/
│       ├── chat/route.ts           # AI chat endpoint (streaming + non-streaming)
│       ├── menu/route.ts           # Public menu data
│       └── admin/                  # 17 admin CRUD routes
├── components/
│   ├── providers/auth-provider.tsx  # Auth context + session management
│   ├── navigation/                  # Navbar, role-aware app nav
│   └── chat/                        # Chat UI components
├── lib/
│   ├── intent-classifier.ts         # Message → intent + DB queries
│   ├── system-prompt.ts             # Prompt assembly (mode-aware)
│   ├── menu-queries.ts              # 12 Supabase query functions
│   ├── rate-limiter.ts              # IP-based rate limiting
│   ├── anthropic.ts                 # Claude client factory
│   ├── supabase-server.ts           # Server client (anon, respects RLS)
│   ├── supabase-admin.ts            # Admin client (service role, server only)
│   └── admin-auth.ts                # requireAdmin() auth helper
├── middleware.ts                     # Route protection + role enforcement
└── types/database.ts                # Full DB types
```

## Roadmap

- [ ] Complete ingredient and allergen dataset verification
- [ ] Full wine/cocktail pairing data entry
- [ ] Staff notes for all menu items
- [ ] Restaurant story and key people bios
- [ ] POS integration for real-time 86'd items
- [ ] Guest preference memory (returning guest recognition)
- [ ] Multilingual support
- [ ] Voice interface
- [ ] Analytics dashboard

## License

Private — built for Old Florida Fish House.
