# PFOS — Personal Finance Operating System (MVP implementation)

Working implementation of the design package in [`docs/`](docs/README.md) — market research,
PRD, data & aggregation architecture, engine math, AI copilot design, UX system, and roadmap —
as a 360° net-worth, planning, and insight platform for Indian household finances.

## Run it

```bash
npm install
cp .env.example .env   # DATABASE_URL for local SQLite
npx prisma db push     # creates prisma/dev.db (SQLite)
npm run seed           # seeds the "Arjun & Meera" demo family (deterministic)
npm run build && npm start   # or: npm run dev
# open http://localhost:3000
```

```bash
npm test               # 18 engine golden tests (XIRR vs Excel, EMI vs bank tables, corpus vs HP12C…)
```

## What's implemented

| Area | Where | Notes |
|---|---|---|
| Data model | `prisma/schema.prisma` | Simplified from [`docs/03-data-model.md`](docs/03-data-model.md) (everything-is-an-account, valuations, ledger, goals, insights) |
| Calculation engines | `src/lib/engines/` | XIRR (Newton+bisection), EMI/amortization/prepayment, deterministic projector, seeded Monte Carlo (lognormal, 2k paths), retirement corpus + readiness, FIRE (3.5% SWR + Coast), goal funding, health score (8 components), purchase advisor — all pure TS, unit-tested |
| Insight rules | `src/lib/data/insights.ts` | 9 rule families (high-interest debt, idle cash, term-cover gap, utilization, drift, expense drag, goal-at-risk, stale connections, spend anomalies), ₹-impact ranked, evidence-linked, act/dismiss persisted |
| Dashboards | `src/app/*` | Home (exec summary), Assets (XIRR per holding), Liabilities (avalanche order, amortization, prepay math), Cash Flow (categories, recurring, anomalies), Goals (Monte Carlo success prob), Retirement & FIRE (fan chart), Simulate (what-if sliders + purchase advisor), Copilot (brief + insights), Connections (freshness + data quality) |
| Design system | `src/app/globals.css`, `src/components/` | "Ledger" tokens, tabular numerals, privacy-blur mode, family/person scope switcher |

Demo family: ~₹2.46Cr net worth, ₹2.9Cr assets / ₹44L debt, 13 months of transactions,
24 months of valuations — reseed any time with `npm run seed`.

## Deliberate divergences from the production architecture ([docs/08](docs/08-technical-architecture.md))

- **SQLite instead of PostgreSQL+TimescaleDB** — zero-friction local run; schema ports directly.
- **Next.js full-stack instead of NestJS API + workers** — no ingestion plane needed while connectors are mocked; the data layer (`src/lib/data/`) is the future service boundary.
- **Connectors are seeded, not live** — AA/MF Central/bureau/EPFO integration requires FIU-TSP and partner agreements ([docs/04](docs/04-aggregation-architecture.md)); the `Connection` model, freshness UX, and data-quality scoring are real.
- **Copilot narration is templated, not LLM** — by design the rules decide and the narration layer is swappable ([docs/06](docs/06-ai-copilot.md)); wire Claude at `getBrief()`/chat with the same numbers-from-tools-only contract.
- **Monte Carlo is single blended asset** — production uses the multivariate correlated version ([docs/05 §2.2](docs/05-engines.md)).
