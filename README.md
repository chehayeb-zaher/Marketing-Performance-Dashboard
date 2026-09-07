# Marketing Performance Dashboard

An external, server-side GoHighLevel acquisition-performance dashboard for a non-technical
agency owner. Answers, at a glance: which lead sources produced the most valid leads, how
those leads move through the Sales Pipeline, stage-to-stage conversion by source, and
closed revenue by source — all segmented by source, never blended into a single number.

**Live:** https://ghl-acquisition-dashboard-bay.vercel.app

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · SWR · Zod · date-fns ·
lucide-react · Vitest

## Architecture

```
GoHighLevel API
  → src/lib/ghl/*          server-only client: env validation, rate-limited/retrying
                            fetch, pagination (pipelines, opportunities, contacts)
  → src/lib/domain/*        cleaning, source normalization, aggregation - pure functions,
                            fully unit tested, no GHL/network dependency
  → src/app/api/dashboard   orchestrates fetch → clean → aggregate, returns only
                            aggregated, PII-free JSON (short in-memory cache)
  → src/app/page.tsx        client dashboard (SWR polling), src/components/*
```

The GHL private token, location ID, and every raw contact/opportunity record stay on the
server. The browser only ever receives aggregated counts, sums, and percentages.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in GHL_PRIVATE_TOKEN and GHL_LOCATION_ID
npm run dev
```

Other scripts:

```bash
npm run diagnose    # dev-only: prints GHL response shapes/counts, no tokens or PII
npm run test        # Vitest unit tests
npm run typecheck
npm run lint
npm run build        # production build
```

### Environment variables

| Variable | Purpose |
|---|---|
| `GHL_PRIVATE_TOKEN` | GoHighLevel Private Integration token (server-only) |
| `GHL_LOCATION_ID` | Sub-account this dashboard reports on |
| `GHL_API_BASE_URL` | `https://services.leadconnectorhq.com` |
| `GHL_API_VERSION` | API version header value |
| `REPORT_TIMEZONE` | IANA timezone used to convert the reporting date range to UTC |

## Data & cleaning methodology

This is the record of what the dashboard excludes and why — the brief requires exclusion
decisions be justified clearly; this file plus the inline comments in
[`src/lib/domain/`](src/lib/domain/) are that justification. (An earlier version of this
dashboard surfaced this as a live, collapsible "Data Quality" panel; it was pulled from the
UI to match the brief's four-section flow exactly, but the underlying computation and
tests are unchanged.)

**Primary grain:** one valid opportunity = one lead. A person may have more than one
legitimate opportunity; each is counted separately.

**Exclusion (tag-based only, never by name):** an opportunity is excluded if its linked
contact carries any of `demo-data`, `sandbox`, `internal`, `backdate-test`, or
`dq - duplicate`, matched case-insensitively. `dash-project` never excludes on its own; if
it's present alongside a real exclusion tag, the exclusion still applies. See
[`constants.ts`](src/lib/domain/constants.ts) and [`cleaning.ts`](src/lib/domain/cleaning.ts).

**Source attribution precedence:** opportunity's own `source` → contact's `source` →
`"Unattributed"`. Unattributed is kept as its own category, never dropped or merged.
Sources are trimmed and grouped case-insensitively, but displayed using whichever raw
casing is most common in the data (so well-formatted names like "LinkedIn Outreach" aren't
mangled) — see [`sourceNormalization.ts`](src/lib/domain/sourceNormalization.ts). Manual
aliases (for genuine spelling/casing variants of the *same* source) live in
[`src/config/sourceAliases.ts`](src/config/sourceAliases.ts) and are documented there;
distinct sources are never merged into "Other."

**Revenue:** only `status === "won"` opportunities count toward closed revenue. A missing
or non-numeric `monetaryValue` is treated as $0 and counted in data quality rather than
silently ignored - see [`money.ts`](src/lib/domain/money.ts).

**Stale leads:** an `open` opportunity is flagged stale if its stage hasn't changed in 14+
days (a threshold not specified in the brief, chosen as a typical follow-up cadence).
Prefers the real `lastStageChangeAt` timestamp; falls back to `updatedAt` as a labeled
proxy only when the former is unavailable. Stale opportunities are flagged, not removed -
they still count toward volume, pipeline position, and conversion.

**Conversion inference:** GHL's opportunities API doesn't expose stage-by-stage history, so
conversion is inferred from an opportunity's *current* pipeline position: a lead at stage
index N is counted as having reached stages 0..N. This is a documented approximation, not
tracked history - see [`aggregate.ts`](src/lib/domain/aggregate.ts).

**Date range:** an opportunity is included if its created date falls within the selected
period, converted via `REPORT_TIMEZONE`, with the end boundary treated as exclusive (e.g.
selecting through Sep 30 includes all of Sep 30, up to but not past Oct 1 midnight) - see
[`reportDateRange.ts`](src/lib/reportDateRange.ts).

## Tests

`npm run test` runs the full Vitest suite (62 tests) covering cleaning, source
normalization, money parsing, date boundaries, and aggregation - including the specific
invariants the brief calls out: total leads reconcile across source/stage breakdowns, each
opportunity has exactly one current stage, revenue equals the sum of valid won values,
conversion values are 0-100 or N/A, cumulative funnel values never increase, exclusion is
case-insensitive, and Unattributed is retained rather than dropped.

## Deployment

Hosted on Vercel, connected to this GitHub repo for auto-deploy on push to `master`.
Environment variables are set directly in the Vercel project (Production + Preview), never
committed. `maxDuration` is raised on the `/api/dashboard` route and a sliding-window rate
limiter (85 req/10s, under GHL's published 100/10s) keeps contact-lookup fallback requests
from tripping GHL's rate limit on pipelines with many leads.
