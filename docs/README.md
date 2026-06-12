# PFOS — 360° Personal Finance Operating System

> **One sentence:** The operating system for your financial life — every asset, every liability,
> every goal, one trustworthy number, and the next best action.
>
> Design package: market research → PRD → data & aggregation architecture → engines → AI copilot
> → UX → technical architecture → roadmap/monetization/GTM. Detailed enough to start building.

## The product in 60 seconds

PFOS answers, daily: **"What is my complete financial life worth, where am I headed, and what should I do next?"** It consolidates AA (banks/FDs/MFs/equities/insurance), MF Central, credit bureaus, depositories, brokers, EPF/NPS, and manual assets (real estate, gold, ESOPs, startup equity) into a single reconciled net worth — then runs retirement/FIRE/goal Monte Carlo projections, what-if simulations, a purchase advisor, an evidence-grounded AI copilot, and a 0–100 financial health score on top of it. Conflict-free by design: subscription-funded, no distribution commissions, no data selling.

**Three structural bets:**
1. **Liabilities + planning are the whitespace** — Indian incumbents track assets to sell products; nobody does Empower-grade planning or real debt intelligence.
2. **Trust is the product** — provenance/freshness on every number, AA-native consent, no-conflict pledge.
3. **Rules decide, LLM explains** — recommendations are deterministic, evidence-linked, ₹-impact-ranked, and auditable; the LLM narrates and converses but never invents a number.

## Document map

| Doc | Covers | Deliverables |
|---|---|---|
| [01-market-research.md](01-market-research.md) | Competitive matrices (global + India), gap analysis, pain points, AI opportunities | Step 1 |
| [02-prd.md](02-prd.md) | Vision, personas, journeys, MoSCoW requirements, MVP scope, metrics, risks | 1, 2, 3, 13 |
| [03-data-model.md](03-data-model.md) | Modeling principles, ER diagram, full PostgreSQL DDL, asset-class mappings, read models, retention | 4 |
| [04-aggregation-architecture.md](04-aggregation-architecture.md) | 15-source matrix (API/auth/refresh/DQ), AA deep-dive, ingestion pipeline, orchestration | 6 |
| [05-engines.md](05-engines.md) | Net worth/XIRR engine, Monte Carlo core, retirement/FIRE/goals math, what-if, purchase advisor, debt engines, tax layer | 8 |
| [06-ai-copilot.md](06-ai-copilot.md) | Rules-engine catalog, prioritizer, LLM copilot + guardrails, SEBI-safe insight taxonomy, health score formula | 7 |
| [07-ux-design.md](07-ux-design.md) | IA, dashboard wireframes (home/assets/liabilities/cashflow/goals/simulate/copilot), onboarding, "Ledger" design system | 9, 10 |
| [08-technical-architecture.md](08-technical-architecture.md) | System diagram, full API surface, security & compliance (AA/DPDP/SEBI), analytics, delivery | 5, 11 |
| [09-roadmap-gtm.md](09-roadmap-gtm.md) | Phase 0→V3 roadmap, pricing tiers + unit economics, GTM phases + growth loops, budget | 12, 14, 15, 16 |

## Key decisions already made (change deliberately)
- Modular NestJS monolith + worker plane; PostgreSQL+TimescaleDB; Temporal for fetch workflows; shared TS engine package runs server-side and in-browser (instant what-if).
- Everything-is-an-account data model; immutable ledger; bitemporal valuations; provenance on every row.
- Launch as FIU-via-TSP; RIA registration pursued in parallel (gates Class R advice in V2).
- MVP = web, couple view, 25 insight rules, 3 goals, Monte Carlo retirement + FIRE, what-if v1 — 16 weeks, gate on TTV < 7 min.

## Verification note
Market facts (prices, funding, AA volumes, Fi Money status, CFPB 1033) reflect knowledge to Jan 2026 and were **not live-verified** in this session; re-check the flagged items in 01 before external use. All math, schemas, and architecture are self-contained design work.
