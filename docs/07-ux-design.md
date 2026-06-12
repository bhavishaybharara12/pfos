# PFOS — Dashboards, Wireframes & Design System

> Deliverables 9 (Dashboard Wireframes) + 10 (UI/UX Design System). Covers Step 8.
> Primary surface: responsive web app (Next.js) + mobile-first layouts; native apps follow same system.

---

## 1. Information Architecture

```
Home (Executive Summary)
├── Net Worth            (assets / liabilities / history / attribution)
│   ├── Assets           (allocation, holdings, XIRR, X-ray)
│   └── Liabilities      (loans, cards, amortization, payoff planner)
├── Cash Flow            (income, expenses, savings rate, recurring, budgets-lite)
├── Goals                (list, detail, retirement & FIRE live here)
├── Copilot              (chat + daily brief + insights feed)
├── Simulate             (what-if studio, purchase advisor)
├── Protection           (insurance, credit score & report)
└── Settings             (connections & consents, family, assumptions/CMA, privacy, export)
```
Top-level switcher: **Me / Couple / Family** scope pill — every screen re-renders for the selected scope (Step 9 Family Wealth View is a filter, not a separate app).

---

## 2. Executive Summary (Home)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PFOS   [Me ▾ | Couple | Family]                    🔔3   ⚙   BB           │
├────────────────────────────────────────────────────────────────────────────┤
│  NET WORTH                                  Freshness: ● 9 of 11 synced    │
│  ₹ 2,47,38,450        ▲ ₹1,82,300 (0.74%) this month                       │
│  [█████████ net worth area chart, 1M 3M 1Y 3Y All ─ toggleable] ──────────│
│   assets ₹3.1Cr ────── liabilities ₹0.63Cr ──────                          │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┤
│ HEALTH SCORE     │ MONTHLY CASHFLOW │ CREDIT SCORE     │ RETIREMENT       │
│   78 /100 ▲2     │ In   ₹3.2L       │  771 CIBIL       │  62% funded      │
│  ◔ Stable        │ Out  ₹1.9L       │  ▲ 4 this month  │  on track: 2042  │
│  biggest drag:   │ Saved 41%        │  util 22%        │  prob 81%        │
│  insurance gap → │ [mini bars]      │                  │  [progress ring] │
├──────────────────┴──────────────────┴──────────────────┴──────────────────┤
│ COPILOT BRIEF — Thu, 12 Jun                                                │
│ "Your idle HDFC balance crossed ₹4.2L — moving ₹3L to a liquid fund        │
│  earns ~₹14,000/yr more. Card bill ₹48,200 due in 5 days. Equity           │
│  allocation drifted to 71% (target 65%) after this quarter's rally."       │
│ [Act on idle cash]  [See all 7 insights →]                                 │
├────────────────────────────────────────────────────────────────────────────┤
│ GOALS                          │ UPCOMING (35 days)                        │
│ Riya's education  ████░ 68%    │ 15 Jun  SIP ₹50,000 (3 funds)             │
│ House downpayment ██░░░ 34%    │ 17 Jun  HDFC card due ₹48,200             │
│ Emergency fund    █████ 100% ✓ │ 01 Jul  Term premium ₹18,350              │
└────────────────────────────────┴───────────────────────────────────────────┘
```
Rules: one screen, zero scrolling on desktop for the core answer ("worth today / headed where / do what next" = hero number, retirement card, copilot brief). Every card taps through to its dashboard. Freshness chip always visible — trust is the product.

## 3. Assets Dashboard

```
┌ ASSETS ₹3,10,52,900 ──────────────── [+ Add asset] [↻ Refresh] ┐
│ ALLOCATION (true X-ray)        │ vs TARGET                     │
│  Equity 58% ████████░ drift +7%│ donut + drift arrows          │
│  Debt 22% · Gold 6% · RE 38%*  │ [Rebalance plan →]            │
│  *RE shown excl./incl. toggle  │                               │
├────────────────────────────────┴───────────────────────────────┤
│ class ▾ | account ▾ | person ▾          search 🔍              │
│ HOLDING              VALUE     DAY    INVESTED   XIRR  ALLOC % │
│ ▸ Mutual funds   ₹1.12Cr  +0.4%   ₹78.4L   16.2%   36%        │
│ ▸ Stocks         ₹48.2L   −0.8%   ₹31.0L   21.4%   16%        │
│ ▸ EPF+PPF+NPS    ₹38.7L     —     ₹29.8L    8.4%   12%        │
│ ▸ Real estate    ₹95.0L  est.●60%  ₹60.0L    8.0%   31%  ✎    │
│ ▸ FD/Cash        ₹16.6L     —        —      6.6%    5%        │
│   (expand → instrument rows w/ sector, gains, grandfathered CG)│
└────────────────────────────────────────────────────────────────┘
```
Liability dashboard mirrors it: debt stack by APR (visual "avalanche order"), per-loan card (outstanding, rate, EMI, tenure left, amortization curve, prepay simulator slider → interest saved live), card utilization gauges, [Payoff planner →].

## 4. Cash Flow Dashboard

```
│ JUN 2026   In ₹3.2L · Out ₹1.9L · Saved ₹1.3L (41%)  [6-mo trend bars]    │
│ Sankey: Salary ₹3.0L ─┬─► Investments ₹85k                                │
│        Rental ₹0.2L  ─┼─► Housing ₹52k ─ EMI ₹38k + maint ₹14k            │
│                       ├─► Food ₹28k · Transport ₹12k · ...                │
│ RECURRING DETECTED: 14 subscriptions ₹8,400/mo [review 3 unused →]        │
│ ANOMALY: Travel ₹42k vs ₹11k avg — "Goa trip?" [tag it]                   │
```
Categorization UX: swipe-to-recategorize, rules created from corrections ("always tag SWIGGY* as Food"). Budgets-lite (category caps + alerts) — deliberately not YNAB-grade envelopes in V1.

## 5. Goals & Retirement

Goal card: progress ring (funded %), success probability chip (Monte Carlo p), monthly-required vs actual SIP mapped, fan chart (p10–p90 band) with target line, levers row ("+₹5k/mo → 91%", "delay 1yr → 88%"). Retirement page = goal page + readiness score + glide-path view + income-replacement breakdown (EPF/NPS annuity/corpus drawdown layers). FIRE toggle switches the math (SWR model) and shows the savings-rate-vs-years curve.

## 6. Simulate (What-if Studio)

Left: scenario controls (sliders/fields: extra monthly investment, retirement age, purchase, market crash preset, income change). Right: base-vs-scenario overlaid fan charts + delta cards (retirement age Δ, success prob Δ, NW@2040 Δ, goals affected). [Save scenario] [Share with partner]. Purchase Advisor is a guided 3-step flavor of the same engine ending in verdict band: **Comfortable / Stretch / Risky** + recommended range.

## 7. Copilot Surface

Chat with structured answer cards (every number sourced: tap → "from your HDFC txns, 12 Jun"). Insights feed grouped by severity with ₹ impact tags; act/snooze/dismiss; acted insights show realized impact later ("you saved ₹13,200 so far"). Disclaimer footer per Class A card.

## 8. Onboarding (the make-or-break flow)

```
1 Phone/email + consent primer (30s, "your data, your control" — DPDP notice)
2 "What do you want to know first?" → [My net worth] [Am I ok for retirement?] [Where does money go?]
3 Quick wins FIRST: PAN+OTP → MF Central import (≈60s to first real number)
   then AA journey (banks/deposits/equities) — staged, skippable, resumable
4 Credit score pull (name+PAN+DOB+OTP)
5 Manual adds prompted by checklist ("Own a house? Car? EPF?") — 2 min
6 First dashboard + first 3 insights + health score reveal
Target: signup → real net worth < 7 minutes; every step skippable; progress persisted.
```

---

## 9. Design System ("Ledger")

**Principles**: numbers first (data-ink over decoration); calm not gamified (no confetti on market gains); trust signals everywhere (freshness, provenance, confidence); progressive disclosure (headline → breakdown → ledger); never shame (red reserved for action-needed, not for spending).

**Tokens**
```
Color (light):
  bg/surface:  #FAFAF8 / #FFFFFF      ink: #16191D / #5A6472 (secondary)
  brand:       #1E5AE8 (interactive)   focus ring: #1E5AE8 @ 2px
  semantic:    gain #0E8A4D · loss #C5362B · warn #B7791F · info #1E5AE8
               (gain/loss also encoded with ▲▼ glyphs — never color alone, WCAG 1.4.1)
  data palette (categorical, 8): blue #4C7DF0, teal #2BA8A0, amber #E8A33D,
               violet #8B6FD0, rose #D06F8B, green #5AA85A, slate #7A8699, brown #A07850
Type:        Inter (UI) + tabular-nums everywhere money appears; display 32/28,
             h1 24, h2 20, body 16/14, caption 12; money formatted Indian system (₹1,23,45,678)
Spacing:     4px base grid; radius 8 (cards 12); elevation: borders > shadows
Charts:      area (net worth), donut+bars (allocation), sankey (cashflow),
             fan chart (projections), bullet bars (goals) — all with reduced-motion variants
Components:  StatCard, TrendChip(▲▼), FreshnessBadge, ConfidenceDot(●60%),
             MoneyInput(lakh/cr aware), ConsentSheet, InsightCard, ScenarioSlider,
             FanChart, AllocationDonut, AmortizationCurve, ScoreRing
Modes:       light/dark; privacy mode (blur all amounts — one tap, for opening app in public)
A11y:        WCAG 2.2 AA; all charts have data-table fallback; hi-contrast theme
i18n:        en-IN first; hi-IN scaffolding; all strings externalized; numerals stay Western
```

**Mobile**: bottom tab bar (Home, Cash Flow, Copilot, Goals, More); hero number + brief above the fold; biometric lock + privacy blur default-on.

---

## 10. Figma plan
Library file (tokens + components) → page-per-dashboard with desktop/mobile frames → prototype of onboarding + home + what-if for usability tests (5 users/round, 3 rounds pre-MVP). Wireframes above are the spec; visual design applies Ledger tokens.
