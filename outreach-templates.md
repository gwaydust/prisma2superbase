# Cold Outreach Templates: prisma-to-supabase

## Template Variables
| Variable | Example |
|----------|---------|
| `{{first_name}}` | John |
| `{{repo_name}}` | awesome-app |
| `{{tech_stack}}` | Next.js + Prisma + Supabase |
| `{{pain_point}}` | RLS policies take hours to write manually |
| `{{your_name}}` | Chi Wai |
| `{{calendly_link}}` | https://calendly.com/chiwai/15min |

---

## Email Templates

### Template A: Technical (Best for Senior Devs/CTOs)
**Subject:** Prisma → Supabase migrations: auto-generate RLS + Realtime?

Hi {{first_name}},

Saw **{{repo_name}}** — looks like you're running **{{tech_stack}}**.

Quick question: when you deploy schema changes to Supabase, are you:
1. Writing RLS policies by hand?
2. Setting up Realtime publications manually?
3. Keeping Prisma Migrate + Supabase CLI in sync?

I built **prisma-to-supabase** — a CLI that reads your `schema.prisma` and generates:
- ✅ Supabase-compatible migrations (timestamped, ready for `supabase db push`)
- ✅ RLS policies inferred from your `@relation` fields
- ✅ Realtime publication setup
- ✅ TypeScript types (Supabase-compatible)
- ✅ Runs 100% locally — no Docker, no cloud

**Example output:**
```sql
-- Auto-generated from your @relation fields
ALTER TABLE "post" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own posts" ON "post"
  FOR SELECT USING (auth.uid() = author_id);
```

Takes 30 seconds vs hours of manual SQL.

**Open source (MIT)** — core schema migration is free. Paid version ($29 lifetime) unlocks RLS, Realtime, Auth helpers, TS types.

Worth a 15-min look? [{{calendly_link}}]

Best,
{{your_name}}

---

### Template B: Business Value (Best for Founders/Product Leads)
**Subject:** Cut Supabase migration time from hours → 30 seconds

Hi {{first_name}},

Building on Supabase with Prisma? You know the pain: every schema change means manual RLS, Realtime setup, and keeping two migration systems in sync.

**prisma-to-supabase** solves this:
- Reads your `schema.prisma` once
- Generates production-ready Supabase migrations + RLS + Realtime + TS types
- Zero config, runs locally, no Docker

**ROI:** Save ~5 hrs/month on migration maintenance per developer.

Used by teams at [early adopters]. $29 lifetime (no seats, no subscription).

15-min demo? [{{calendly_link}}]

{{your_name}}

---

### Template C: Short (Best for Twitter DMs/LinkedIn)
**Subject:** Prisma + Supabase?

Hi {{first_name}} — saw you're using Prisma + Supabase in {{repo_name}}.

Built a CLI that auto-generates RLS policies, Realtime setup, and TS types from your `schema.prisma`. Saves hours per migration.

Free core, $29 lifetime for RLS/Realtime/TS types. Open source.

Worth a quick look? [{{calendly_link}}]

{{your_name}}

---

## Twitter DM Templates

### DM A: Technical
Hey! Saw {{repo_name}} — Prisma + Supabase stack 🔥

Quick q: how do you handle RLS policies and Realtime publications when schema changes? Manual SQL?

I built a CLI that reads `schema.prisma` and auto-generates all that + TS types. Open source, runs locally.

Might save you hours per migration. Want the GitHub link?

---

### DM B: Casual
Saw you're on Prisma + Supabase — respect 💪

Quick question: do you manually write RLS policies for each new table? I automated that (reads your Prisma relations → generates policies).

Free tool if you're curious: github.com/gwaydust/prisma2superbase

---

### DM C: Value-First
Building on Supabase with Prisma? The RLS + Realtime setup is a time sink.

I made a tool that reads `schema.prisma` → generates migrations + RLS + Realtime + TS types in seconds.

Free to try. github.com/gwaydust/prisma2superbase

Happy to walk through if useful!

---

## Follow-Up Templates

### Follow-Up 1 (3 days, no response)
**Subject:** Re: Prisma → Supabase migrations

Hi {{first_name}},

Following up — figured the RLS/Realtime pain might not be top of mind right now.

If you ever hit "I need to write RLS policies for 10 new tables this week," the tool's here: github.com/gwaydust/prisma2superbase

No pressure. Happy building!

{{your_name}}

---

### Follow-Up 2 (7 days, opened/clicked)
**Subject:** Re: Prisma → Supabase migrations

Hi {{first_name}},

Saw you checked out the repo — hope it was useful!

If you run into any edge cases (composite keys, custom types, multi-schema), happy to help. The parser handles most Prisma 5/6 features.

Also: we're adding `@supabase/auth-helpers` integration next week.

{{your_name}}

---

### Follow-Up 3 (14 days, final)
**Subject:** Closing the loop

Hi {{first_name}},

Last note — I'll stop emailing after this.

If Supabase migrations ever become a bottleneck, the tool's open source and the paid version is $29 lifetime (no recurring).

All the best with {{repo_name}}!

{{your_name}}

---

## Tracking Spreadsheet Columns (Google Sheets/Airtable)

| Date | Prospect | Channel | Template | Status | Response | Next Action |
|------|----------|---------|----------|--------|----------|-------------|
| 2024-01-15 | john/awesome-app | Email | Template A | Sent | - | Follow up Jan 18 |
| 2024-01-15 | jane/saas-starter | Twitter DM | DM B | Replied Positive | "Interested!" | Schedule call Jan 17 |

**Status Options:** `Sent`, `Opened`, `Clicked`, `Replied Positive`, `Replied Negative`, `Unsubscribed`, `Call Booked`, `Closed Won`

---

## Daily Outreach Routine (15 min/day)

| Time | Action |
|------|--------|
| Morning | Send 5 new cold emails/DMs (use templates) |
| Midday | Check responses → log in Airtable → move prospects in Kanban |
| Evening | Follow up on 3-day/7-day/14-day sequences |

**Weekly Target:** 20 new contacts, 3+ calls booked