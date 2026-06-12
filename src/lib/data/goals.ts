import { db } from "../db";
import { planGoal, planRetirement, planFire, type GoalResult, type RetirementResult, type FireResult } from "../engines";
import type { Scope } from "./scope";

export interface GoalView {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  targetDate: Date;
  yearsToTarget: number;
  currentFunding: number;
  monthlySip: number;
  plan: GoalResult;
}

async function mappedFunding(goalId: string): Promise<number> {
  const maps = await db.goalAccountMap.findMany({
    where: { goalId },
    include: { account: { include: { valuations: { orderBy: { asOfDate: "desc" }, take: 1 } } } },
  });
  return maps.reduce(
    (s, m) => s + ((m.account.valuations[0]?.value ?? 0) * m.allocationPct) / 100,
    0,
  );
}

export async function getGoals(scope: Scope): Promise<GoalView[]> {
  const goals = await db.goal.findMany({
    where: { familyId: scope.familyId, type: { not: "retirement" } },
    orderBy: { priority: "asc" },
  });
  const out: GoalView[] = [];
  for (const g of goals) {
    const funding = await mappedFunding(g.id);
    const years = Math.max(0.25, (g.targetDate.getTime() - Date.now()) / (365.25 * 86400000));
    const isShortTerm = years <= 3;
    out.push({
      id: g.id,
      name: g.name,
      type: g.type,
      targetAmount: g.targetAmount,
      targetDate: g.targetDate,
      yearsToTarget: Math.round(years * 10) / 10,
      currentFunding: Math.round(funding),
      monthlySip: g.monthlySip,
      plan: planGoal({
        targetAmountToday: g.targetAmount,
        yearsToTarget: years,
        goalInflation: g.inflationRate,
        currentFunding: funding,
        monthlySip: g.monthlySip,
        expectedReturn: isShortTerm ? 0.065 : 0.11, // glide path: short-dated goals priced at debt returns
        vol: isShortTerm ? 0.02 : 0.12,
      }),
    });
  }
  return out;
}

export interface RetirementView {
  plan: RetirementResult;
  fire: FireResult;
  currentCorpus: number;
  monthlySip: number;
  inputs: { currentAge: number; retirementAge: number; monthlyExpenses: number };
}

export async function getRetirement(
  scope: Scope,
  overrides?: { retirementAge?: number; monthlyExpenses?: number; monthlyInvestment?: number },
): Promise<RetirementView> {
  const goal = await db.goal.findFirst({ where: { familyId: scope.familyId, type: "retirement" } });
  const owner = scope.persons.find((p) => p.role === "owner") ?? scope.persons[0];
  const age = Math.floor((Date.now() - owner.dateOfBirth.getTime()) / (365.25 * 86400000));

  const corpus = goal ? await mappedFunding(goal.id) : 0;

  // expenses default: last full month from cashflow would create a cycle; use a stored estimate
  const monthlyExpenses = overrides?.monthlyExpenses ?? 130000;
  const retirementAge = overrides?.retirementAge ?? 55;
  const monthlyInvestment = overrides?.monthlyInvestment ?? goal?.monthlySip ?? 65000;

  const plan = planRetirement({
    currentAge: age,
    retirementAge,
    monthlyExpensesNow: monthlyExpenses,
    preReturn: 0.11,
    currentCorpus: corpus,
    monthlyInvestment,
  });

  const fire = planFire({
    annualExpenses: monthlyExpenses * 12,
    currentCorpus: corpus,
    monthlyInvestment,
    currentAge: age,
  });

  return {
    plan,
    fire,
    currentCorpus: Math.round(corpus),
    monthlySip: monthlyInvestment,
    inputs: { currentAge: age, retirementAge, monthlyExpenses },
  };
}
