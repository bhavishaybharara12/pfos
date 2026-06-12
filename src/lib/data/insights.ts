// Insight rules engine (pfos/06-ai-copilot.md): deterministic rules, ₹-impact ranked,
// evidence-linked. The "LLM narrates" layer is a template here (swap for Claude in prod).

import { db } from "../db";
import { healthScore, type HealthResult } from "../engines";
import { compactINR } from "../format";
import { getCashflow } from "./cashflow";
import { getLiabilities, getUpcomingObligations, type Obligation } from "./liabilities";
import { getNetWorth } from "./networth";
import { getGoals, getRetirement } from "./goals";
import type { Scope } from "./scope";

export interface Insight {
  ruleCode: string;
  severity: "critical" | "warning" | "opportunity" | "info";
  title: string;
  body: string;
  impactPerYear: number | null; // ₹ expected impact, drives ordering
  evidence: Record<string, string | number>;
  cta?: { label: string; href: string };
  status: "open" | "acted" | "dismissed";
}

const LIQUID_RATE = 0.065;
const SAVINGS_RATE = 0.03;
const EXPECTED_PORTFOLIO = 0.11;
const EQUITY_TARGET = 0.65;

export async function getInsights(scope: Scope): Promise<Insight[]> {
  const [cash, liab, nw, goals] = await Promise.all([
    getCashflow(scope),
    getLiabilities(scope),
    getNetWorth(scope),
    getGoals(scope),
  ]);

  const insights: Insight[] = [];
  const monthlyExpenses = cash.lastFull.expenses;

  // --- cash & savings ---
  const cashAccounts = await db.account.findMany({
    where: { personId: { in: scope.personIds }, class: "asset", assetClass: "cash" },
    include: { valuations: { orderBy: { asOfDate: "desc" }, take: 1 } },
  });
  const totalCash = cashAccounts.reduce((s, a) => s + (a.valuations[0]?.value ?? 0), 0);
  const idleThreshold = 2 * monthlyExpenses;
  if (totalCash > idleThreshold + 100000) {
    const excess = totalCash - idleThreshold;
    const impact = Math.round(excess * (LIQUID_RATE - SAVINGS_RATE));
    insights.push({
      ruleCode: "PF_EXCESS_CASH",
      severity: "opportunity",
      title: `${compactINR(excess)} sitting idle in savings accounts`,
      body: `You hold ${compactINR(totalCash)} in cash against ~${compactINR(idleThreshold)} needed for monthly buffer. Moving the excess to a liquid fund (~6.5%) instead of savings (~3%) earns about ${compactINR(impact)} more per year.`,
      impactPerYear: impact,
      evidence: { totalCash: Math.round(totalCash), buffer: idleThreshold, excess: Math.round(excess) },
      cta: { label: "Simulate moving it", href: "/simulate" },
      status: "open",
    });
  }

  // --- emergency fund ---
  const efGoal = goals.find((g) => g.type === "emergency_fund");
  if (efGoal && efGoal.currentFunding < efGoal.targetAmount) {
    const gap = efGoal.targetAmount - efGoal.currentFunding;
    const months = efGoal.currentFunding / Math.max(1, cash.essentialMonthly);
    insights.push({
      ruleCode: "SAV_EMERGENCY_LOW",
      severity: months < 3 ? "critical" : "warning",
      title: `Emergency fund covers ${months.toFixed(1)} months (target 6)`,
      body: `Earmarked liquid assets are ${compactINR(efGoal.currentFunding)} vs a ${compactINR(efGoal.targetAmount)} target (6× essential spend of ${compactINR(cash.essentialMonthly)}). Top up ${compactINR(gap)} before stretching other goals.`,
      impactPerYear: null,
      evidence: { funded: efGoal.currentFunding, target: efGoal.targetAmount, essentialMonthly: cash.essentialMonthly },
      cta: { label: "View goal", href: "/goals" },
      status: "open",
    });
  }

  // --- debt ---
  for (const l of liab.loans) {
    if (l.interestRate > 12) {
      const spread = l.interestRate / 100 - EXPECTED_PORTFOLIO;
      const impact = Math.round(l.outstanding * Math.max(0.02, spread));
      insights.push({
        ruleCode: "DEBT_HIGH_INTEREST",
        severity: "critical",
        title: `${l.name} at ${l.interestRate}% is your costliest money`,
        body: `${compactINR(l.outstanding)} outstanding at ${l.interestRate}% guarantees a cost above your expected portfolio return (~11%). Prepaying it first beats new investments on a risk-adjusted basis — ₹10k/month extra clears it ${l.prepay10k.monthsSaved} months early and saves ${compactINR(l.prepay10k.interestSaved)} interest.`,
        impactPerYear: impact,
        evidence: { outstanding: l.outstanding, rate: l.interestRate, emi: l.emi },
        cta: { label: "Prepayment simulator", href: "/liabilities" },
        status: "open",
      });
    }
  }
  for (const c of liab.cards) {
    if (c.utilization > 0.3) {
      insights.push({
        ruleCode: "DEBT_UTILIZATION",
        severity: c.utilization > 0.8 ? "critical" : "warning",
        title: `Card utilization at ${(c.utilization * 100).toFixed(0)}% — above the 30% credit-score line`,
        body: `${c.name} shows ${compactINR(c.outstanding)} against a ${compactINR(c.creditLimit)} limit. Utilization above 30% drags your CIBIL score; pay it down before the statement date or request a limit increase.`,
        impactPerYear: null,
        evidence: { outstanding: c.outstanding, limit: c.creditLimit, utilization: +(c.utilization * 100).toFixed(1) },
        cta: { label: "View card", href: "/liabilities" },
        status: "open",
      });
    }
  }

  // --- insurance ---
  const policies = await db.insurancePolicy.findMany({ where: { personId: { in: scope.personIds } } });
  const hasTerm = policies.some((p) => p.type === "term_life");
  const annualIncome = scope.persons
    .filter((p) => scope.personIds.includes(p.id))
    .reduce((s, p) => s + p.monthlyIncome * 12, 0);
  if (!hasTerm && annualIncome > 0) {
    const cover = annualIncome * 10;
    insights.push({
      ruleCode: "INS_LIFE_GAP",
      severity: "critical",
      title: "No term life cover detected",
      body: `With ${compactINR(annualIncome)} annual household income, dependents and a home loan, a term cover of ~${compactINR(cover)} (10× income) is the standard benchmark. A 32-year-old typically pays ₹15–25k/yr for ₹2Cr cover. (Educational guideline, not a policy recommendation.)`,
      impactPerYear: null,
      evidence: { annualIncome, suggestedCover: cover, termPoliciesFound: 0 },
      status: "open",
    });
  }

  // --- allocation drift ---
  const equityPct = (nw.allocation.find((a) => a.class === "Equity")?.pct ?? 0) / 100;
  const investable = nw.allocation
    .filter((a) => a.class !== "Real Estate" && a.class !== "Alternative")
    .reduce((s, a) => s + a.value, 0);
  const equityOfInvestable = (nw.allocation.find((a) => a.class === "Equity")?.value ?? 0) / Math.max(1, investable);
  if (Math.abs(equityOfInvestable - EQUITY_TARGET) > 0.05) {
    const drift = equityOfInvestable - EQUITY_TARGET;
    const amount = Math.abs(drift) * investable;
    insights.push({
      ruleCode: "PF_ALLOC_DRIFT",
      severity: "warning",
      title: `Equity at ${(equityOfInvestable * 100).toFixed(0)}% of investable assets (target ${EQUITY_TARGET * 100}%)`,
      body: drift > 0
        ? `Markets have drifted your equity allocation ${(drift * 100).toFixed(0)}pp above target. Rebalancing ~${compactINR(amount)} into debt locks in gains and restores your risk level.`
        : `Equity is ${(Math.abs(drift) * 100).toFixed(0)}pp below target; consider deploying ~${compactINR(amount)} from debt/cash.`,
      impactPerYear: null,
      evidence: { equityPctInvestable: +(equityOfInvestable * 100).toFixed(1), target: EQUITY_TARGET * 100, rebalanceAmount: Math.round(amount), equityPctTotal: +(equityPct * 100).toFixed(1) },
      cta: { label: "View allocation", href: "/assets" },
      status: "open",
    });
  }

  // --- expense drag ---
  const positions = await db.position.findMany({
    where: { account: { personId: { in: scope.personIds } } },
    include: { instrument: true },
  });
  for (const p of positions) {
    if (p.instrument.type === "mutual_fund" && (p.instrument.expenseRatio ?? 0) > 0.75) {
      const value = p.quantity * p.currentPrice;
      const drag = Math.round(value * ((p.instrument.expenseRatio! - 0.4) / 100));
      insights.push({
        ruleCode: "PF_EXPENSE_DRAG",
        severity: "opportunity",
        title: `${p.instrument.name} charges ${p.instrument.expenseRatio}% — above category median`,
        body: `On ${compactINR(value)} invested, the extra expense ratio vs a comparable low-cost option costs ~${compactINR(drag)}/year. (Educational comparison, not a switch recommendation.)`,
        impactPerYear: drag,
        evidence: { value: Math.round(value), expenseRatio: p.instrument.expenseRatio!, categoryMedian: 0.6 },
        status: "open",
      });
    }
  }

  // --- goals at risk ---
  for (const g of goals) {
    if (g.plan.successProb < 0.7 && g.type !== "emergency_fund") {
      insights.push({
        ruleCode: "GOAL_AT_RISK",
        severity: "warning",
        title: `"${g.name}" has only ${(g.plan.successProb * 100).toFixed(0)}% success probability`,
        body: `At the current ${compactINR(g.monthlySip)}/month, the projected corpus falls short of the inflation-adjusted target ${compactINR(g.plan.fvTarget)}. Adding ${compactINR(g.plan.monthlyRequired)}/month closes the gap.`,
        impactPerYear: null,
        evidence: { successProb: +(g.plan.successProb * 100).toFixed(0), fvTarget: Math.round(g.plan.fvTarget), monthlyRequired: Math.round(g.plan.monthlyRequired) },
        cta: { label: "View goal", href: "/goals" },
        status: "open",
      });
    }
  }

  // --- stale connections ---
  for (const s of nw.freshness.stale) {
    insights.push({
      ruleCode: "CONN_STALE",
      severity: "info",
      title: `${s.label} hasn't synced in ${s.daysAgo} days`,
      body: `Numbers that depend on this source may be stale. Reconnect to keep your net worth trustworthy.`,
      impactPerYear: null,
      evidence: { source: s.label, daysSinceFetch: s.daysAgo },
      cta: { label: "Fix connection", href: "/connections" },
      status: "open",
    });
  }

  // --- spending anomalies ---
  for (const a of cash.anomalies) {
    insights.push({
      ruleCode: "CASHFLOW_ANOMALY",
      severity: "info",
      title: `${a.category} spend of ${compactINR(a.amount)} in ${a.month} — ${(a.amount / a.baseline).toFixed(1)}× your average`,
      body: `Baseline for ${a.category} is ${compactINR(a.baseline)}/month. One-off (trip, annual fee) or a new pattern worth a look?`,
      impactPerYear: null,
      evidence: { category: a.category, amount: a.amount, baseline: a.baseline, month: a.month },
      cta: { label: "View cash flow", href: "/cashflow" },
      status: "open",
    });
  }

  // status lives client-side in the static demo (src/lib/insightStore.ts);
  // production persists it server-side (InsightAction table).

  // priority: severity rank then ₹ impact
  const sevRank = { critical: 0, warning: 1, opportunity: 2, info: 3 };
  return insights.sort(
    (a, b) => sevRank[a.severity] - sevRank[b.severity] || (b.impactPerYear ?? 0) - (a.impactPerYear ?? 0),
  );
}

// ---------- health score ----------

export async function getHealth(scope: Scope): Promise<HealthResult & { history: { date: string; total: number }[] }> {
  const [cash, liab, nw, retirement] = await Promise.all([
    getCashflow(scope),
    getLiabilities(scope),
    getNetWorth(scope),
    getRetirement(scope),
  ]);
  const policies = await db.insurancePolicy.findMany({ where: { personId: { in: scope.personIds } } });
  const reports = await db.creditReport.findMany({
    where: { personId: { in: scope.personIds } },
    orderBy: { pulledAt: "desc" },
    take: 1,
  });

  const annualIncome = scope.persons
    .filter((p) => scope.personIds.includes(p.id))
    .reduce((s, p) => s + p.monthlyIncome * 12, 0);
  const termCover = policies.filter((p) => p.type === "term_life").reduce((s, p) => s + p.sumAssured, 0);
  const healthCover = policies.some((p) => p.type === "health");

  // conservative: only cash + 25% of debt instruments counted as emergency-liquid
  const emergencyLiquid =
    (nw.allocation.find((a) => a.class === "Cash")?.value ?? 0) +
    0.25 * (nw.allocation.find((a) => a.class === "Debt")?.value ?? 0);

  const yearAgo = nw.series.find((s) => new Date(s.date).getTime() >= Date.now() - 370 * 86400000);
  const nwGrowth = yearAgo && yearAgo.netWorth > 0 ? nw.netWorth / yearAgo.netWorth - 1 : null;

  const investableEquity = nw.allocation.find((a) => a.class === "Equity")?.value ?? 0;
  const investable = nw.allocation
    .filter((a) => a.class !== "Real Estate" && a.class !== "Alternative")
    .reduce((s, a) => s + a.value, 0);
  const equityShare = investable ? investableEquity / investable : 0;
  const concentrationPenalty = Math.min(40, Math.abs(equityShare - EQUITY_TARGET) * 100);

  const result = healthScore({
    savingsRate: cash.lastFull.income
      ? (cash.lastFull.income - cash.lastFull.expenses) / cash.lastFull.income
      : null,
    emergencyMonths: cash.essentialMonthly ? emergencyLiquid / cash.essentialMonthly : null,
    foir: liab.foir,
    hasHighAprDebt: liab.loans.some((l) => l.interestRate > 12),
    lifeCoverRatio: annualIncome ? termCover / (annualIncome * 10) : null,
    healthCoverOk: healthCover,
    concentrationPenalty,
    retirementReadiness: retirement.plan.readinessScore,
    nwGrowth12m: nwGrowth,
    creditScore: reports[0]?.score ?? null,
  });

  const history = (
    await db.healthScoreSnapshot.findMany({
      where: { personId: { in: scope.personIds } },
      orderBy: { runDate: "asc" },
    })
  ).map((h) => ({ date: h.runDate.toISOString().slice(0, 10), total: h.total }));
  history.push({ date: new Date().toISOString().slice(0, 10), total: result.total });

  return { ...result, history };
}

// ---------- daily brief (templated narration; LLM-narrated in prod) ----------

export async function getBrief(scope: Scope): Promise<{ text: string; obligations: Obligation[] }> {
  const [insights, obligations, nw] = await Promise.all([
    getInsights(scope),
    getUpcomingObligations(scope),
    getNetWorth(scope),
  ]);
  const top = insights.filter((i) => i.status === "open").slice(0, 2);
  const parts: string[] = [];
  parts.push(
    `Net worth is ${compactINR(nw.netWorth)}, ${nw.changeMonth >= 0 ? "up" : "down"} ${compactINR(Math.abs(nw.changeMonth))} (${(Math.abs(nw.changeMonthPct) * 100).toFixed(1)}%) this month.`,
  );
  for (const i of top) parts.push(i.title + ".");
  const due = obligations.filter((o) => (o.date.getTime() - Date.now()) / 86400000 <= 7);
  if (due.length > 0)
    parts.push(
      `Next 7 days: ${due.map((d) => `${d.label} (${compactINR(d.amount)})`).join(", ")}.`,
    );
  return { text: parts.join(" "), obligations };
}
