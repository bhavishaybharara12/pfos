# PFOS — AI Financial Copilot & Health Score

> Deliverable 7 (AI Recommendation Engine Design) + Steps 6, 7, and the AI Wealth Coach from Step 9.

---

## 1. Architecture: Rules decide, LLM explains, Advisor approves

```
                          ┌─────────────────────────────────────────┐
 valuation.updated ─────► │ INSIGHT RULES ENGINE (deterministic)    │──► insight rows (typed,
 cashflow.updated         │ ~60 codified rules, each with evidence  │     evidence-linked,
 bureau.updated           │ + ₹ impact estimator                    │     impact-ranked)
                          └─────────────────────────────────────────┘
                                           │
                          ┌────────────────▼────────────────────────┐
                          │ PRIORITIZER  impact × urgency × confid. │──► top-N feed, daily coach
                          │ × fatigue dampener (max 3 active nudges)│
                          └────────────────┬────────────────────────┘
                                           │
                          ┌────────────────▼────────────────────────┐
                          │ LLM LAYER (Claude)                      │──► natural-language briefs,
                          │ • narrates insights from structured     │     chat answers, scenario
                          │   evidence (no number invention)        │     explanations
                          │ • chat copilot w/ tool-calling into     │
                          │   engines (read-only)                   │
                          └────────────────┬────────────────────────┘
                                           │
                          ┌────────────────▼────────────────────────┐
                          │ COMPLIANCE GUARDRAIL                    │──► what user sees
                          │ insight taxonomy → allowed phrasing;    │
                          │ "advice" class requires RIA sign-off    │
                          └─────────────────────────────────────────┘
```

**Why this split:** financial recommendations must be *reproducible, explainable, and auditable* (SEBI RIA + user trust). The LLM never computes a number or originates a recommendation; it narrates and converses over structured outputs from the rules + engines. Every insight stores its `evidence` JSON — the exact inputs that fired it — so "why am I seeing this?" always has an answer.

**Regulatory posture (India):** generic, rules-based, educational nudges ≠ regulated investment advice; *specific security recommendations for consideration* require SEBI RIA registration. Architecture enforces this with an insight taxonomy:
- Class E (educational/observational): "Your equity allocation is 84% vs your 65% target" — always allowed.
- Class A (actionable generic): "Consider moving idle cash to a liquid fund" — allowed with disclaimers, template pre-approved by compliance.
- Class R (regulated advice): "Switch from Fund X to Fund Y" — only under the RIA entity, with suitability records. Gated off until RIA licence obtained (V2).

---

## 2. Insight Rule Catalog (launch set, abridged)

Each rule: `code, trigger, evidence, impact_estimator, severity, CTA → what-if deep-link`.

### Portfolio (Step 6 — Portfolio Insights)
| Code | Trigger | Impact estimate |
|---|---|---|
| PF_SINGLE_STOCK_CONC | one stock > 10% of investable assets (>25% if ESOP employer: special rule) | Δvol, drawdown-at-risk ₹ |
| PF_SECTOR_CONC | sector > 30% of equity (X-ray basis) | same |
| PF_FUND_OVERLAP | ≥2 funds with >60% holdings overlap | fee drag of duplicate ₹/yr |
| PF_EXPENSE_DRAG | regular plans / ER > category median + 50bps | Σ(ER_fund − ER_alt) × value /yr |
| PF_UNDERPERF | fund < benchmark by >2%/yr over 3yr rolling | forgone ₹/yr |
| PF_ALLOC_DRIFT | |actual − target| > 10pp on any asset class | rebalance amount ₹ |
| PF_EXCESS_CASH | cash > 1.5× emergency-fund target + 3 months of planned investments | (E[r_portfolio] − r_savings) × excess ₹/yr |
| PF_NO_INTL | intl equity = 0 and equity > ₹10L | diversification note (Class E) |

### Debt (Step 6 — Debt Insights)
| DEBT_HIGH_INTEREST | any loan APR > 12% while investable surplus exists | interest − E[r] spread ₹/yr |
| DEBT_REVOLVING_CC | card interest charges detected in txns | APR ≈ 42% × revolved balance |
| DEBT_REFINANCE | rate ≥ best-market + 75bps, tenure ≥ 24mo | ΔEMI × n − costs |
| DEBT_UTILIZATION | card utilization > 30% | credit-score impact note |
| DEBT_PREPAY_VS_INVEST | post-tax loan rate vs post-tax E[r] comparison | NPV difference |

### Savings & Protection
| SAV_EMERGENCY_LOW | liquid cover < 6 months essential spend | gap ₹ |
| SAV_RATE_LOW | savings rate < 20% (salaried) trailing 3mo | vs peer/target gap |
| SAV_SIP_BREAK | SIP missed/cancelled detected | corpus impact at horizon |
| SAV_IDLE_SALARY | > ₹X in savings acct > 45 days | liquid-fund delta ₹/yr |
| INS_LIFE_GAP | term cover < 10× annual income (earning members w/ dependents) | gap ₹ (Class E) |
| INS_HEALTH_GAP | no/low health cover vs city-tier benchmark | gap ₹ (Class E) |
| INS_ULIP_DRAG | ULIP/endowment with IRR < 6% | vs term+MF alternative (Class A, careful phrasing) |

### Goals, Tax, Hygiene
GOAL_AT_RISK (success prob < 70%), GOAL_GLIDE (equity-heavy goal < 3yr out), TAX_LTCG_HARVEST (unused ₹1.25L exemption + harvestable gains), TAX_80C_HEADROOM, FEE_HIDDEN (DP/AMC charges spike), CASHFLOW_ANOMALY (spend category +2σ vs 6-mo baseline), SUBSCRIPTION_CREEP (recurring merchants Δ), CARD_DUE / PREMIUM_DUE / SIP_UPCOMING (obligations radar).

### Prioritizer
```
priority = impact_₹_normalized(0-40) + urgency(0-25: dues/expiry/risk-of-loss)
         + confidence(0-15: data quality of inputs) + recency_boost(0-10)
         + user_affinity(0-10: learned from act/dismiss history)
fatigue: max 3 active push nudges; dismissed rule sleeps 90d unless severity=critical;
         same-rule re-fire requires 15% input change.
```
Effectiveness loop: every insight has `status` transitions (open→acted/dismissed); acted-rate per rule is the engine's own KPI; rules below 5% act-rate get reworked or demoted.

---

## 3. LLM Copilot (chat + daily coach)

**Capabilities**
1. **Q&A over own finances**: "How much did I spend on travel this year?" "What's my XIRR on mutual funds vs Nifty?" — tool-calling into read-only engine APIs (`getCashflow`, `getXIRR`, `getNetWorth`, `runWhatIf`, `getInsights`). LLM composes; numbers come from tools verbatim.
2. **Scenario conversations**: "Can I afford a ₹80L house?" → copilot calls Purchase Advisor + what-if engine, returns verdict + fan chart card.
3. **Daily/weekly coach brief** (Step 9 AI Wealth Coach): generated from (top insights + obligations radar + portfolio moves + goal deltas); push notification → 60-second readable brief. Tone: calm, numerate, zero hype.
4. **Document understanding**: parse uploaded salary slip / Form 16 / policy PDF → structured extraction (with user confirmation before writing to ledger).

**Hard rails**
- System prompt + output validator: no specific security buy/sell recommendations (until RIA), no numbers not present in tool outputs (validator regex-matches every ₹/% in response against tool-result set; mismatch → regenerate), mandatory disclaimer class on Class A content, "I don't know" preferred over inference on missing data.
- All chats logged (audit_log); PII-scrubbed evaluation set; red-team suite of 200+ adversarial prompts ("which stock will double?", "should I stop my SIP?") run on every prompt/model change.
- Cost control: coach briefs batched nightly (cacheable template + per-user variables); chat is the only on-demand LLM surface.

---

## 4. Financial Health Score (Step 7)

0–100, computed nightly per person (and family roll-up), stored in `health_score_snapshot` with full component breakdown.

| Component | Weight | Metric → subscore (0–100) |
|---|---|---|
| Savings rate | 15 | (income−expense)/income: 0% → 0, ≥30% → 100, linear |
| Emergency fund | 15 | months of essential cover: 0→0, ≥6 → 100 |
| Debt health | 15 | FOIR (EMI/income): ≤20% → 100, ≥50% → 0; high-APR debt halves it; no-debt = 100 |
| Insurance adequacy | 12 | min(life cover ratio vs 10×income, health cover vs benchmark) ×100; no dependents → health only |
| Diversification | 10 | 100 − concentration penalties (single stock, sector, asset-class HHI vs target) |
| Retirement readiness | 15 | RRS from engine (05-engines §3) |
| Net worth trajectory | 10 | 12-mo NW growth vs (income-scaled) expected path; age-adjusted |
| Credit score | 8 | (bureau − 300)/(900−300) × 100; missing → redistributed |

```
Health = Σ wᵢ·subscoreᵢ / Σ wᵢ(available)        # missing data redistributes weight,
                                                  # but completeness < 60% caps score at 75
Bands: 0–39 At Risk · 40–59 Needs Work · 60–79 Stable · 80–100 Excellent
```
Display rules: always show the **one component costing the most points** with its fix (deep-link to insight/what-if) — the score is a motivation device, every point must be traceable to an action. Monthly score-change story: "+3 this month: emergency fund +1.2 months (+4), card utilization up (−1)."

Validation: score distribution monitored across cohort; component correlations reviewed quarterly so the score can't be gamed by one lever; user-research check that band labels don't shame (language: "needs work", never "poor").

---

## 5. ML Roadmap (beyond rules)
- **V1 ships with**: txn categorization model, recurring-flow detection (income/SIP/EMI/subscriptions — periodicity + amount clustering), internal-transfer pairing, merchant enrichment. These are the only ML the MVP needs.
- **V2**: cash-flow forecasting (30/90-day balance projection → "safe-to-invest" amount), peer benchmarks (k-anonymous cohorts by age/income/city), churn/engagement propensity for coach pacing.
- **V3**: personalization of nudge timing/channel (bandit), portfolio-construction optimizer under RIA umbrella, voice interface.
