# PFOS — Market Research & Competitive Analysis

> Deliverable for Step 1. Compiled from model knowledge through Jan 2026 plus structured desk research.
> ⚠️ Live web verification was unavailable in this session; volatile items (prices, funding, AA volumes,
> Fi Money status, CFPB 1033) are flagged and should be re-verified before external use.

---

## 1. Competitive Analysis Matrix

### Global

| Capability | Empower | Monarch | Kubera | Credit Karma | Wealthfront | Betterment | Fidelity Full View | Copilot | YNAB | Origin |
|---|---|---|---|---|---|---|---|---|---|---|
| Price | Free (+0.49–0.89% AUM advisory) | ~$100/yr | ~$249/yr | Free | 0.25% AUM | $4/mo or 0.25% | Free | ~$95/yr | ~$109/yr | ~$99/yr |
| Aggregation | ✅ | ✅ multi-provider | ✅ global+crypto | ✅ | planning only | advice only | ✅ (eMoney) | ✅ | ✅ | ✅ |
| Net worth | ★★★ | ★★★ | ★★★★ broadest assets | ★ | ★★ | ★★ | ★★ | ★★ | ★ | ★★ |
| Budget/cash flow | ★ | ★★★★ | ✗ | ✗ | ✗ | ✗ | ★ | ★★★ | ★★★★ method | ★★ |
| Investment analytics | ★★★★ (fees, alloc) | ★ | ★★ IRR | ✗ | own-portfolio | own-portfolio | via Fidelity | ★★ | ✗ | ★ |
| Retirement/planning | ★★★★ Monte Carlo | ✗ | ★ projection | ✗ | ★★★ Path | ★★ goals | ★★ | ✗ | ✗ | ★★ |
| Credit score | ✗ | ✗ | ✗ | ★★★★ core | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Liability depth | ★ | ★ | ★ | ★★★ | ✗ | ✗ | ★ | ★ | ★ | ★ |
| Insurance view | ✗ | ✗ | ★ manual | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ★ |
| AI advice | minimal | categorization | minimal | Intuit Assist | limited | minimal | ✗ | ML categorization | minimal | ★★ "Sidekick" |
| Family/multi-user | ★ | ★★★ couples | ★★ beneficiary | ✗ | ✗ | ✗ | ✗ | ★ | ★★ | ★ |
| Business model | AUM funnel | subscription | subscription | lead-gen ads | AUM | AUM+sub | retention | subscription | subscription | sub+B2B |

### India

| Capability | INDmoney | Kuvera (CRED) | ET Money (360 ONE) | Fi Money | Jupiter | Zerodha Console | smallcase | Fold/new AA-native |
|---|---|---|---|---|---|---|---|---|
| Price | Free (monetizes broking/distribution) | Free | Free + Genius sub | Free | Free | Free (Zerodha users) | Free + fees | Sub/Free |
| Net worth aggregation | ★★★ broadest (MF+stocks+US+EPF+NPS) | ★★ MF-centric | ★★ | ★★ | ★ | ★ own-broker only | ★ own holdings | ★★★ AA-native |
| Bank/cash via AA | ★★ | ✗ | ✗ | ★★ (own bank) | ★★ (own bank) | ✗ | ✗ | ★★★ |
| Expense analytics | ★★ | ✗ | ✗ | ★★ | ★★ | ✗ | ✗ | ★★★ |
| Credit score | ★★★ | ✗ | ★★ | ★★ | ★★ | ✗ | ✗ | ★ |
| Liabilities/EMI view | ★★ | ✗ | ★ | ★ | ★ | ✗ | ✗ | ★★ |
| Insurance | ★ track | ✗ | ★★★ distribution | ★ | ✗ | ✗ | ✗ | ✗ |
| Retirement/goal planning | ★ | ★★ goals | ★★ | ✗ | ✗ | ✗ | ✗ | ✗ |
| What-if simulation | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| AI copilot | ★ generic | ✗ | ★ | ★ "Ask Fi" | ✗ | ✗ | ✗ | ★ |
| Family view | ★★ | ★★ | ★ | ✗ | ✗ | ★★ | ✗ | ✗ |
| Tax tooling | ★ | ★★ harvesting | ★ | ✗ | ✗ | ★★★ (Console+Quicko) | ✗ | ✗ |
| Conflict of interest | High (sells what it tracks) | Medium | High (distribution) | Medium | Medium | Low | Medium | Low |

**Corporate context (verify before quoting):** Mint shut March 2024 → created the global paid-PFM boom; Monarch raised ~$75M Series B (2025, ~$850M val); Kuvera acquired by CRED (2024); ET Money acquired by 360 ONE WAM (~₹366Cr, 2024); Fi Money status uncertain (retrenchment/sale reports); Perfios is the dominant B2B aggregation/TSP layer and owns Anumati AA.

---

## 2. Gap Analysis — what nobody does well (India)

1. **No true 360° net worth.** INDmoney is closest but misses real estate, gold/jewellery, ESOPs, PMS/AIF, and treats liabilities shallowly. Nobody reconciles AA + MF Central + bureau + depository into one trustworthy number with freshness/provenance shown.
2. **Liabilities are an afterthought everywhere.** Bureau data is used as a credit-score widget, not as a debt-management engine (amortization, payoff optimization, refinance scanning). Indian household debt is rising fast — this is an open lane.
3. **Tracking ≠ planning.** Indian apps track portfolios; none connect today's balance sheet to retirement probability, goal funding, or FIRE math with Monte Carlo rigor (Empower-grade planning doesn't exist in India).
4. **No what-if anywhere.** "Can I afford this car / retire at 50 / survive a 35% crash?" is unanswered by every Indian platform. Scenario simulation is the single biggest whitespace.
5. **Conflict of interest is the norm.** Every free Indian app monetizes by selling products it "advises" on. A trust-first, subscription-aligned model is a real differentiator for the affluent segment (the Kubera/Monarch lesson).
6. **Insurance adequacy is invisible.** Policies are sold, never analyzed (cover gaps, ULIP drag).
7. **ESOPs/startup equity ignored** despite being the dominant wealth line for the exact ICP (tech professionals).
8. **Family/household finance is single-player.** Couples planning, parent portfolios, advisor seats — all weak.
9. **AI is marketing, not infrastructure.** Existing "AI" features are chatbots without engine grounding; none do evidence-linked, impact-ranked recommendations with measurable act-rates.
10. **Data trust UX.** Sync failures are silent everywhere; no platform shows data quality/freshness honestly — the #1 stated reason users abandon trackers.

## 3. User pain points (recurring across reviews/communities)
- "I have 7 apps and still maintain an Excel sheet" — fragmentation is the job-to-be-done.
- Sync breakage without explanation (EPF, AA FIP downtime) destroys trust permanently.
- Spam/cross-sell from free apps (INDmoney notifications are the canonical complaint).
- Net worth without "so what" — numbers but no direction or next action.
- Double-counting (MF via broker + via CAS) and internal transfers counted as income/expense.
- Privacy anxiety: "where does my data go when the app is free?"

## 4. Opportunities for AI-driven advice
- Evidence-grounded copilot over one's own ledger (Q&A, briefs) — high value, low regulatory risk if architected as Class E/A insights (see 06-ai-copilot §1).
- Recommendations ranked by ₹ impact with realized-impact tracking ("this app made/saved me ₹X") — no one closes this loop today; it is the retention engine.
- Document intelligence (CAS/Form 16/policy PDFs) as cold-start aggregation.
- Peer benchmarks (k-anonymous) — "savings rate vs people like you."

## 5. Strategic read
- **Where to win**: affluent digital India (mass-affluent → HNI-lite), trust-first subscription, depth of *planning + liabilities + alternatives* rather than breadth of *distribution*.
- **Moat sequence**: aggregation completeness → engine credibility (numbers match bank statements) → insight act-rate → switching costs from history + goals + family graph.
- **Risk watch**: AA FIP reliability (mitigate with multi-path ingestion), platform dependence on MF Central terms, incumbents (INDmoney/CRED) copying surface features — they are structurally unable to copy the no-conflict model.
