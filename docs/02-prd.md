# PFOS — Product Requirements Document

> Deliverables 1 (PRD), 2 (User Journeys), 3 (User Personas), 13 (MVP Scope), 14 (V2/V3 scope summary — detail in 09-roadmap-gtm.md).

---

## 1. Vision & Positioning

**One sentence:** The operating system for your financial life — every asset, every liability, every goal, one trustworthy number, and the next best action.

**The question we answer daily:** *"What is my complete financial life worth today, where am I headed, and what should I do next?"*

**Positioning:** India's first conflict-free 360° wealth platform. We don't sell funds, loans, or insurance — we work only for the user (subscription-aligned). Think Empower's planning depth + Kubera's asset breadth + Monarch's UX + Credit Karma's liability spine, built AA-native for India.

**Non-goals (V1):** execution/broking, product distribution, payments, lending, US-style budgeting envelopes, crypto exchange. We integrate and analyze; we do not (yet) transact.

---

## 2. Personas

| | P1 "Tech-affluent Arjun" (primary) | P2 "Family CFO Meera" | P3 "FIRE-chaser Vikram" | P4 "NRI-ish/HNI Rohan" (V2) |
|---|---|---|---|---|
| Profile | 32, senior SWE, Bengaluru, ₹60L CTC + ESOPs | 41, marketing director, 2 kids, Mumbai, household ₹75L | 28, product manager, ₹35L, aggressive saver | 45, founder/CXO, ₹15Cr+ NW, PMS/AIF/startup angel |
| Today | Zerodha+Groww+MF apps+Excel; EPF forgotten; ESOPs untracked | Husband's & her portfolios separate; LIC policies unknown value; home loan | Spreadsheet FIRE models; r/FIREIndia | Wealth manager PDF statements; no consolidated view |
| Core JTBD | "One real number, and am I doing this right?" | "Are *we* on track for kids' education + retirement?" | "When exactly can I stop working?" | "Consolidate everything incl. alternates; family office lite" |
| Killer feature | Net worth + ESOP tracking + idle-cash insights | Family view + goals + insurance gaps | FIRE engine + what-if + savings-rate curve | Multi-entity, PMS/AIF parse, advisor seat |
| Willingness to pay | ₹2–4k/yr | ₹3–5k/yr (family plan) | ₹2k/yr | ₹25k+/yr |

## 3. User Journeys (condensed)

**J1 First-run (Arjun):** ad/referral → "see your real net worth in 5 min" → phone OTP → picks "My net worth" → MF Central PAN+OTP import (60s, sees ₹1.1Cr MF) → AA consent (bank+demat+FD) → bureau pull (score 771 + the personal loan he forgot) → adds house & car (2 min guided) → **net worth ₹2.47Cr revealed** with allocation + 3 insights ("₹4.2L idle cash", "term cover gap", "loan at 14.2% — close it first") → health score 71 → D1 push: daily brief. *Success metric: TTV < 7 min, ≥2 sources linked D0.*

**J2 Retirement check (Meera):** Goals → Retirement → pulls existing data, asks 6 questions (retirement age, expenses, continuation %) → "62% funded, on track for 2042 at 81% probability" → lever cards → adds spouse via family invite → combined view recomputes → sets up child-education goal with SIP mapping → monthly email digest keeps her returning. *Metric: retirement plan completion ≥40% of WAU in month 1.*

**J3 Major purchase (Vikram):** Simulate → Purchase Advisor → car ₹22L → verdict "Stretch: pushes FIRE by 14 months; comfortable range ₹14–18L; if you must: 20% down + 4yr loan beats cash-down given your 16% XIRR" → saves scenario, shares link with partner. *Metric: ≥25% of MAU run ≥1 simulation/month.*

**J4 Acting on insight:** push "Card bill ₹48,200 due in 5 days + you're revolving at 42% APR (₹2,140/mo)" → opens insight → evidence shown → CTA "pay from idle HDFC balance" (deep-link to bank app V1; embedded action V3) → marks acted → 30 days later: "You saved ₹2,140/mo" realized-impact card. *Metric: insight act-rate ≥12%.*

## 4. Functional Requirements (MoSCoW)

### MVP (Must) — 16 weeks
- **Aggregation:** AA (deposits, FD/RD, MF, equities) via TSP; MF Central import; one bureau (Experian or CIBIL) score+report; CAS PDF parse; manual assets (RE, gold, vehicle, EPF, ESOP, custom); daily NAV/price feeds.
- **Net worth:** daily series, asset/liability breakdown, allocation (basic, X-ray V1.1), per-holding XIRR, freshness badges.
- **Liabilities:** loan & card registry from bureau+AA, EMI calendar, amortization, utilization alerts.
- **Cash flow:** categorized income/expense (rules+model), savings rate, recurring detection, internal-transfer pairing, monthly summary.
- **Planning:** retirement (deterministic + Monte Carlo), FIRE module, 3 goal types (education/house/emergency), monthly-required math.
- **Insights:** 25 launch rules + prioritizer + daily brief (templated, LLM-narrated); health score v1.
- **What-if:** extra-investment, retirement-age, one-time-purchase scenarios.
- **Platform:** responsive web; family = couple view (2 seats); privacy mode; export; DPDP consent UX; audit/consent logs.

### Should (V1.x, weeks 17–28)
Broker connects (Kite first), allocation X-ray, purchase advisor full verdict bands, insurance registry + adequacy (manual+parse), EPF passbook import, copilot chat (read-only tools), second bureau, score history, Hindi UI scaffold.

### Could (V2)
Mobile apps; NPS via CRA/AA; PMS/AIF statement parsing; tax layer (CG ledger, harvesting, 80C headroom, regime compare); family office (multi-entity, advisor seat, RBAC); peer benchmarks; cash-flow forecasting; realized-impact tracking; what-if market-crash presets; goal-based rebalancing plans (RIA-gated where needed).

### Won't (until V3+)
Execution rails (orders via partner broker/MFU), embedded liquid-fund sweep, lending marketplace, NRI/global accounts (Plaid), white-label B2B, voice.

## 5. Non-functional Requirements
TTV < 7 min; dashboard p95 < 1.5s (cached reads); fetch pipeline p95 < 4 min/connection; 99.9% app availability; engines unit-verified vs golden spreadsheets (zero tolerance on money math); WCAG 2.2 AA; data residency India; security/compliance per 08 §3.

## 6. Success Metrics
| Metric | Target @ 6mo post-launch |
|---|---|
| Activation (≥2 sources linked D0) | ≥ 55% of signups |
| TTV median | < 7 min |
| W4 retention | ≥ 35% |
| WAU/MAU | ≥ 45% |
| Insight act-rate | ≥ 12% |
| Paid conversion (of activated) | ≥ 8% |
| NPS | ≥ 50 |
| Connection health (daily fetch success) | ≥ 90% weighted |

## 7. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| AA FIP downtime/data quality | Multi-path ingestion (MFC, CAS parse, statements); honest freshness UX; FIP health routing |
| FIU eligibility (must be regulated entity) | Launch via TSP/partner FIU; pursue RIA registration in parallel (also unlocks Class R advice) |
| MF Central partnership terms | CAS-parse fallback keeps cold-start independent |
| Regulatory drift (SEBI on AI advice) | Insight taxonomy + compliance gate built-in from day 1 (06 §1) |
| Trust cold-start ("another free app?") | No-distribution pledge front-and-center; subscription model; privacy mode; security page |
| Incumbent response | Speed on planning/simulation depth; conflict-free positioning they can't copy |
| LLM hallucination | Numbers-from-tools-only validator; rules originate all recommendations |
