import { db } from "../db";
import type { Scope } from "./scope";

export interface MonthCashflow {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  invested: number;
  savings: number;
  savingsRate: number;
  byCategory: { category: string; amount: number }[];
}

export interface CashflowSummary {
  months: MonthCashflow[]; // ascending, last = current (partial)
  lastFull: MonthCashflow;
  recurring: { merchant: string; avgAmount: number; category: string; count: number }[];
  anomalies: { category: string; amount: number; baseline: number; month: string }[];
  essentialMonthly: number;
}

const EXPENSE_EXCLUDED = new Set(["Income", "Transfer", "Investments"]);
const ESSENTIAL = new Set(["Housing", "Food", "Transportation", "Education", "Insurance", "Debt Repayment"]);

export async function getCashflow(scope: Scope, monthsBack = 7): Promise<CashflowSummary> {
  const since = new Date();
  since.setMonth(since.getMonth() - monthsBack - 1);
  const txns = await db.transaction.findMany({
    where: { account: { personId: { in: scope.personIds } }, txnDate: { gte: since } },
    orderBy: { txnDate: "asc" },
  });

  const byMonth = new Map<string, MonthCashflow>();
  for (const t of txns) {
    const m = t.txnDate.toISOString().slice(0, 7);
    if (!byMonth.has(m))
      byMonth.set(m, { month: m, income: 0, expenses: 0, invested: 0, savings: 0, savingsRate: 0, byCategory: [] });
    const row = byMonth.get(m)!;
    const cat = t.category ?? "Other";
    if (cat === "Income" && t.amount > 0) row.income += t.amount;
    else if (cat === "Investments" && t.amount < 0 && t.type === "sip") row.invested += -t.amount;
    else if (!EXPENSE_EXCLUDED.has(cat) && t.amount < 0) {
      row.expenses += -t.amount;
      const c = row.byCategory.find((x) => x.category === cat);
      if (c) c.amount += -t.amount;
      else row.byCategory.push({ category: cat, amount: -t.amount });
    }
  }
  const months = [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      income: Math.round(m.income),
      expenses: Math.round(m.expenses),
      savings: Math.round(m.income - m.expenses),
      savingsRate: m.income ? (m.income - m.expenses) / m.income : 0,
      byCategory: m.byCategory.sort((a, b) => b.amount - a.amount).map((c) => ({ ...c, amount: Math.round(c.amount) })),
    }));

  const lastFull = months.length >= 2 ? months[months.length - 2] : months[months.length - 1];

  // recurring: same merchant in ≥4 distinct months
  const merch = new Map<string, { total: number; months: Set<string>; category: string; count: number }>();
  for (const t of txns) {
    if (!t.merchant || t.amount >= 0 || EXPENSE_EXCLUDED.has(t.category ?? "")) continue;
    const e = merch.get(t.merchant) ?? { total: 0, months: new Set(), category: t.category ?? "Other", count: 0 };
    e.total += -t.amount;
    e.months.add(t.txnDate.toISOString().slice(0, 7));
    e.count++;
    merch.set(t.merchant, e);
  }
  const recurring = [...merch.entries()]
    .filter(([, v]) => v.months.size >= 4)
    .map(([merchant, v]) => ({
      merchant,
      avgAmount: Math.round(v.total / v.months.size),
      category: v.category,
      count: v.count,
    }))
    .sort((a, b) => b.avgAmount - a.avgAmount);

  // anomalies: category in a recent month > 2× its 6-month average (and > ₹5k)
  const anomalies: CashflowSummary["anomalies"] = [];
  const catAvg = new Map<string, number>();
  for (const m of months.slice(0, -1))
    for (const c of m.byCategory) catAvg.set(c.category, (catAvg.get(c.category) ?? 0) + c.amount);
  for (const [k, v] of catAvg) catAvg.set(k, v / Math.max(1, months.length - 1));
  for (const m of months.slice(-4, -1)) {
    for (const c of m.byCategory) {
      const base = catAvg.get(c.category) ?? 0;
      if (base > 0 && c.amount > 2 * base && c.amount > 5000)
        anomalies.push({ category: c.category, amount: c.amount, baseline: Math.round(base), month: m.month });
    }
  }

  const essentialMonthly = Math.round(
    lastFull.byCategory.filter((c) => ESSENTIAL.has(c.category)).reduce((s, c) => s + c.amount, 0),
  );

  return { months, lastFull, recurring, anomalies, essentialMonthly };
}
