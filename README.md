# Prisma → Supabase Migration CLI

**One-liner:** Generate production-ready Supabase migrations from Prisma schemas in seconds.

## Vision
A zero-config CLI that reads `schema.prisma` and outputs:
- Supabase-compatible SQL migrations
- Row Level Security (RLS) policies
- Realtime publication setup
- Auth integration helpers
- Type-safe client generation (Supabase JS/TS client)

## Target User
- **Primary:** Full-stack developers using Prisma + PostgreSQL who want Supabase's auth/realtime/edge features
- **Secondary:** Teams migrating from self-hosted Postgres to Supabase
- **Tertiary:** Prisma users evaluating Supabase as backend

## Week 1 Milestones (Nov 3–9)
- [ ] Finalize ICP & one-liner
- [ ] Build landing page + Gumroad buy button ($29)
- [ ] Write cold outreach script; identify 50 prospects
- [ ] Send 20 cold DMs/emails; target 3+ discovery calls
- [ ] Set up China dev environment (VPN, GitHub, Vercel, Supabase CLI)

## Project Structure
```
prisma-to-supabase/
├── cli/                 # Core CLI tool (Node/TypeScript)
├── landing-page/        # Static site (GitHub Pages)
├── specs/               # Technical specifications
├── docs/                # User guides, API docs
└── README.md
```

## Validation Criteria (Week 1)
| Metric | Target | Pass/Fail Threshold |
|--------|--------|---------------------|
| Cold outreach sent | 20 | ≥20 |
| Discovery calls booked | 3+ | ≥3 |
| Landing page live | Yes | Deployed URL |
| Dev environment verified | Yes | `npx prisma-to-supabase` runs |

## Revenue Model
- **One-time license:** $29 (individual), $99 (team)
- **Future:** Subscription for hosted version + premium templates

## Competitive Advantage
- Prisma-native (reads schema directly, no manual mapping)
- Supabase-specific output (RLS, Realtime, Auth)
- China-friendly (no cloud dependency, runs locally)
- Open-core: CLI free, premium templates/templates paid