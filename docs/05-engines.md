# PFOS — Calculation & Projection Engines

> Deliverable 8 (Financial Projection Models) + Steps 4, 5, 9.
> All engines are pure, deterministic-given-seed TypeScript libraries (`@pfos/engines`) shared by
> backend (nightly jobs) and frontend (instant what-if sliders run client-side on the same code).

---

## 1. Net Worth Engine (Step 4)

### 1.1 Definition
```
NetWorth(family, d) = Σ_accounts value(a, d) × ownership_pct(a)
value(a,d): assets > 0, liabilities < 0, converted to base ccy at fx(d)
```
Reads only `account_valuation` (see 03-data-model §3.4). Carry-forward rule: if no valuation on `d`, use latest prior valuation ≤ 7 days old for market assets (else mark stale), unlimited carry for slow assets (real estate, FD between accrual points recomputed analytically).

### 1.2 Outputs
- **Levels**: total assets, total liabilities, net worth — daily series (TimescaleDB `time_bucket`).
- **Decomposition**: by asset class / sub-class / person / account; debt by type and rate band.
- **Attribution** (monthly): ΔNW = market movement + net new savings + debt paydown + valuation restatements — each computed by replaying transactions vs price moves. This is the single most differentiating chart vs competitors ("did I get richer because markets went up, or because I saved?").
- **Allocation X-ray**: MF positions exploded into underlying equity/debt/cash via fund-portfolio data (monthly AMC disclosures) so "60% equity" is true exposure, not "60% in equity-labeled funds."

### 1.3 Returns
- **XIRR** per position/account/goal/portfolio: Newton-Raphson on
  `Σ CFᵢ·(1+r)^(−tᵢ/365) + V_now = 0`, bisection fallback on non-convergence, guard rails r ∈ (−0.99, 10). Cash flows from the transaction ledger; current value from valuations.
- **TWR** (for comparing against benchmarks, strips flow timing): chain-linked daily Modified Dietz.
- Benchmarks: Nifty 50 TRI, S&P 500 (INR), category averages for MFs.

---

## 2. Projection Core (shared by retirement / FIRE / goals / what-if)

### 2.1 Deterministic projector
Monthly step simulation:
```
W(t+1) = W(t)·(1+r_m) + C(t) − D(t)
r_m = (1+r_annual)^(1/12) − 1, r_annual from asset-allocation-weighted CMA table
C(t) = contributions (SIPs grow at step-up s%/yr; salary-linked flows grow at income growth g)
D(t) = withdrawals (post-retirement expenses, goal outflows at their target dates)
```
Capital-market assumptions (CMA) table, editable per family, defaults (nominal INR):
| Asset class | E[r] | σ |
|---|---|---|
| India equity | 12.0% | 18% |
| Intl equity | 10.0% (INR) | 16% |
| Debt | 7.0% | 4% |
| Gold | 8.0% | 15% |
| Real estate | 8.0% | 10% |
| Cash | 5.5% | 1% |
Inflation defaults: general 6%, education 10%, healthcare 8%, wedding 7%.

### 2.2 Monte Carlo engine
- 5,000 paths, monthly steps, returns ~ multivariate lognormal with CMA means/vols and a fixed correlation matrix (equity–debt ≈ 0.1, equity–gold ≈ −0.1, IN–intl equity ≈ 0.7).
- Seeded RNG (PCG64) → reproducible runs; results cached in `goal_projection_snapshot`.
- Outputs: success probability P(W(T) ≥ target), percentile fan (p10/p25/p50/p75/p90), max drawdown distribution, sequence-of-returns stress (worst-decade-first ordering test for retirees).
- Performance: vectorized (typed arrays); 5k paths × 40yr × monthly ≈ 24M steps — <300ms in Node worker, <1s in browser via WASM build for interactive sliders.

---

## 3. Retirement Planning (Step 5)

Inputs: current age, retirement age, life expectancy (default 90), current monthly expenses, % of expenses continuing in retirement (default 80%), inflation, current retirement-earmarked corpus, monthly investment, step-up %, pre/post-retirement allocations (glide path: equity − 1%/yr from age 45 → 30% floor).

```
E_ret  = E_now × (1+i)^(R−A) × continuation%          # monthly expense at retirement
Corpus = E_ret × 12 × [1 − ((1+i)/(1+r_post))^(N)] / (r_post − i) × (r_post)⁻¹-form
         (annuity-due PV of inflation-growing withdrawals over N = life − R years)
```
Deterministic gives the headline ("you need ₹8.4 Cr"); Monte Carlo gives **probability of success** and the **Retirement Readiness Score**:

```
RRS = 100 × min(1, ProjectedCorpus_p50 / CorpusNeeded) × f(success_prob)
f: 0.7 + 0.3 × success_prob   (caps score unless plan is robust, not just on-track-on-average)
```

Levers surfaced with every result (each shown with its ΔRRS): retire later ±n years, save more +₹x/mo, reduce retirement expenses −y%, change allocation.

---

## 4. FIRE Module

```
FIRE number   = AnnualExpenses / SWR        (India default SWR 3.0–3.5%; user-tunable;
                                             rationale: higher inflation + longer horizons than US 4% rule)
Lean FIRE     = 0.7 × current expenses → corpus at 3.5% SWR
Fat FIRE      = 1.5 × current expenses → corpus at 3.0% SWR
Coast FIRE    = corpus today such that growth alone reaches FIRE number at trad. retirement age
Years to FIRE = solve t:  W₀(1+r)^t + C·[((1+r)^t −1)/r]·(1+r) ≥ FIRE# × (1+i)^t
```
Output: FIRE dashboard — number, % funded, years remaining at current savings rate, savings-rate-vs-years curve (the classic Mr. Money Mustache curve, personalized).

---

## 5. Goal Planning Engine

Per goal (education / marriage / house / vehicle / vacation / emergency fund / custom):
```
FV_target        = target_amount × (1 + goal_inflation)^(years)
FV_existing      = Σ earmarked account values projected at their allocation returns
Gap              = FV_target − FV_existing − FV(existing SIPs mapped to goal)
MonthlyRequired  = Gap × r_m / [((1+r_m)^m − 1) × (1+r_m)]     # step-up variant solved numerically
SuccessProb      = Monte Carlo on the earmarked sub-portfolio
```
Rules:
- **Glide path per goal**: ≤3 years to target → recommended allocation shifts to debt/arbitrage; engine flags "goal at risk from equity exposure" insights.
- **Emergency fund** is a special goal: target = 6× essential monthly expenses (computed from categorized spend, excluding discretionary), funded only by cash/liquid instruments.
- **Conflicts**: aggregate MonthlyRequired across goals vs actual monthly surplus → feasibility check; if infeasible, priority-ordered suggestion (delay P3 goals first).

---

## 6. What-if Simulation Engine (Step 9)

Scenario = base state + overlay deltas, run through the same projector. Supported deltas:
```json
{ "extraMonthlyInvestment": 20000,
  "retirementAge": 50,
  "oneTimePurchase": {"amount": 2000000, "date": "2027-04", "funding": "portfolio|loan", "loan": {"rate": 0.095, "tenureMonths": 60}},
  "incomeChange": {"pct": -0.3, "from": "2027-01"},
  "newGoal": {...}, "sellAsset": {"accountId": "..."},
  "marketCrash": {"equityDrop": -0.35, "at": "2027-01", "recoveryYears": 3} }
```
Output: side-by-side base vs scenario — net worth fan chart, retirement age/probability shift, affected goal probabilities. Every insight CTA ("increase SIP by ₹10k") deep-links into a pre-filled scenario so advice is always *shown*, not asserted.

---

## 7. Major Purchase Advisor (Step 9)

For car/house/vacation of price P:
1. **Affordability rules** (configurable):
   - Car: total cost ≤ 50% of annual take-home (or 20/4/10 rule: 20% down, ≤4yr loan, all-transport ≤10% of income)
   - House: EMI ≤ 35% of take-home with all other EMIs; down payment must not breach emergency fund
   - FOIR check: total obligations / income ≤ 45%
2. **Funding optimizer**: compare cash vs loan vs hybrid — NPV of loan interest vs expected portfolio return on un-deployed cash, post-tax; show break-even rate.
3. **Impact statement**: Δ retirement age (months), Δ retirement success prob, Δ net worth at +10yr, goals pushed past target date — all from the what-if engine.
4. **Verdict bands**: Comfortable (≤ guideline), Stretch (≤1.25×), Risky (>1.25×) with the recommended budget range solved inversely ("a comfortable car budget for you is ₹14–18L").

---

## 8. Debt Engines

- **Amortization generator**: standard reducing-balance; regenerated on rate change (floating) or prepayment; powers `amortization_row`.
- **Payoff optimizer**: avalanche (rate-ordered) vs snowball (balance-ordered) vs "invest instead" — compares post-tax loan rate vs expected after-tax portfolio return + risk note; outputs ₹ interest saved and months cut per ₹1,000/mo extra.
- **Refinance scanner**: if loan rate − prevailing best rate ≥ 75bps and remaining tenure ≥ 24 months → savings = ΔEMI·n − switching costs; fires `DEBT_REFINANCE` insight.
- **Credit card risk**: utilization > 30% warning / > 80% critical; revolving-interest detector from txn pattern (interest charges present → "you're paying 42% APR" insight).

---

## 9. Tax Awareness Layer (V2, design now)
- Capital gains ledger from transaction history (equity LTCG/STCG with grandfathering, debt slab rules post-Apr-2023, indexation where applicable).
- Tax-loss harvesting candidates; LTCG ₹1.25L exemption utilization tracker (per FY).
- 80C/80CCD(1B)/80D headroom from detected EPF/PPF/ELSS/NPS/insurance flows (old regime), regime comparison.
- Disclaimer rails: computations are "estimates, not tax advice" until tax-expert review pipeline exists.

---

## 10. Validation & Test Strategy
- Golden tests: every engine vs hand-computed spreadsheets (XIRR vs Excel, EMI vs bank schedules, corpus formulas vs HP12C results).
- Property tests: XIRR(cashflows) stable under cash-flow splitting; projector monotonic in contributions.
- Monte Carlo: fixed-seed snapshot tests; distribution sanity (p50 ≈ deterministic with same means).
- Reconciliation job: nightly NW(today) vs NW(yesterday) + flows + market moves; unexplained residual > 0.5% → alert (catches ingestion bugs before users do).
