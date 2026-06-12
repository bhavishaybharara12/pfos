# PFOS — Roadmap, Monetization & Go-To-Market

> Deliverables 12 (Development Roadmap), 14 (V2/V3 Roadmaps), 15 (Monetization), 16 (GTM).

---

## 1. Development Roadmap

### Phase 0 — Foundations (Weeks 1–4)
Infra (AWS ap-south-1, Terraform, CI/CD), NestJS monolith skeleton + RLS schema (03), Temporal, AA TSP sandbox integration, design system tokens + component library, instrument master + NAV/price pipelines, legal: DPDP program, TSP/FIU agreement, RIA application started.

### Phase 1 — MVP build (Weeks 5–16) → Private beta
- W5–8: AA prod consent journey; MF Central import; CAS parser; manual assets; ledger + valuation engine; net worth dashboard.
- W9–12: bureau pull; liabilities + amortization; cashflow categorization + recurring detection; onboarding flow; freshness UX.
- W13–16: retirement + FIRE + 3 goals (Monte Carlo); 25 insight rules + health score + daily brief; what-if v1; couple view; privacy/export; security hardening + pentest; beta with 300 hand-recruited users (target ICP).
**Gate to launch:** TTV < 7min on ≥70% of beta cohort; reconciliation residuals < 0.5%; fetch success ≥ 85%.

### Phase 2 — Public V1 (Weeks 17–28)
Launch + iterate: broker connects (Kite → Upstox/Angel), allocation X-ray, purchase advisor, insurance registry + adequacy, EPF import, copilot chat (read-only), 2nd bureau, paid tier on, referral loop. Scale to 50k users.

### Phase 3 — V2 (Months 8–14)
Mobile apps (RN); tax layer (CG ledger, harvesting, regime compare); PMS/AIF/startup-equity depth; NPS; family office mode (multi-entity, advisor seats, RBAC, consolidated reporting); peer benchmarks; cash-flow forecast + safe-to-invest; realized-impact tracking; RIA licence live → Class R advice (fund-level recommendations, rebalancing plans); regional language v1.

### Phase 4 — V3 (Months 15–24)
Action rails: execute rebalance/SIP changes via partner EOP/broker APIs, idle-cash sweep to liquid funds (one-tap), bill-pay nudges→payments partner; NRI/global (Plaid/SaltEdge connector); white-label/B2B (advisors, RIAs, employers as financial-wellness benefit); estate features (nominee audit, beneficiary handoff à la Kubera); open API + export ecosystem; voice/vernacular copilot.

---

## 2. Monetization

**Model: freemium subscription + aligned B2B. Hard pledge: no distribution commissions, no data selling, no lead-gen ads — the conflict-free stance *is* the brand.**

| Tier | Price (intro) | Includes |
|---|---|---|
| Free | ₹0 | Net worth (3 connections), credit score, monthly cashflow, health score, 3 insights/mo, 1 goal |
| Plus | ₹249/mo or ₹1,999/yr | Unlimited connections, full insights + daily brief, retirement+FIRE+unlimited goals, what-if studio, purchase advisor, couple view, X-ray, copilot chat |
| Premium | ₹699/mo or ₹5,999/yr | Tax layer, PMS/AIF/ESOP depth, peer benchmarks, priority refresh, annual planning session (RIA, V2), advisor seat |
| Family Office | ₹25k+/yr | Multi-entity, RBAC, consolidated reporting, dedicated support, document vault |

Secondary lines (V2+): B2B financial-wellness (per-employee/yr to employers), advisor/RIA white-label seats, anonymized aggregate research products **only if** opt-in and k-anonymous (default off).
Unit economics sketch: blended data cost (AA fetches ~₹2–10/consent-fetch cycle, bureau ~₹15–40/pull, MFC, infra, LLM) ≈ ₹250–400/active user/yr at scale → Plus tier gross margin ~75–80%. Free tier capped at ~₹8–10/user/mo data cost by fetch-frequency throttling.
Targets: 8% activated→paid by M6, 12% by M12; ARPU ₹2,300; payback < 12 months on CAC ≤ ₹1,500.

---

## 3. Go-To-Market

**Beachhead:** English-first affluent digital investors, 28–45, metros, ₹25L+ household income — tech employees with ESOPs are the sharpest wedge (unserved ESOP tracking + idle-cash + FIRE intent). TAM context: ~40M demat-active / ~50M MF unique investors; SAM ≈ 8–10M affluent multi-asset households; beachhead ≈ 1M.

**Phases**
1. **Private beta (M0–3):** 300 users from FIRE/personal-finance communities (r/FIREIndia, fintech Twitter/X, workplace Slacks), founder-led onboarding calls; obsess over TTV + trust; build 50 "net worth glow-up" testimonials.
2. **Launch (M4):** Product Hunt + India fintech press + creator partnerships (personal-finance YouTube/newsletters — sponsor *audits*, not ads: "we rebuilt X's finances live"); "Excel killer" campaign with importable template migration tool (steal the spreadsheet cohort directly).
3. **Growth loops (M4+):**
   - *Couple/family invites* (the product is better with 2 — structural K-factor).
   - *Shareable artifacts*: anonymized net-worth milestones, FIRE date cards, scenario links.
   - *SEO/content engine*: calculators (retirement, FIRE, EMI-vs-invest, car affordability) as standalone indexable tools feeding signup; "state of Indian household finance" data reports for PR.
   - *Referral*: give-a-month/get-a-month.
4. **B2B wedge (M10+):** employer financial-wellness pilots (the ESOP angle sells itself to HR at tech cos), advisor white-label.

**Messaging hierarchy:** (1) "Your entire financial life, one number, five minutes." (2) "We don't sell you anything — that's the point." (3) "Know your FIRE date." 
**Trust kit at launch:** security whitepaper, no-commission pledge page, data-deletion-in-one-tap demo, founder-signed privacy letter.

**Competitive response plan:** INDmoney/CRED copy features → double down on planning depth + conflict-free positioning; AA reliability crisis → publicize multi-path architecture + honest status page (trust compounding).

---

## 4. Org & Budget (first 12 months, indicative)
8 FTE core team (08 §5) ≈ ₹4.5–6Cr; data/infra/LLM ≈ ₹60–90L; compliance/legal (FIU-TSP, RIA, DPDP, pentest) ≈ ₹40–60L; marketing ≈ ₹1–1.5Cr. Total ≈ ₹7–9Cr to public V1 + 50k users — a seed-stage-feasible plan with Series A triggered on retention + paid-conversion proof.
