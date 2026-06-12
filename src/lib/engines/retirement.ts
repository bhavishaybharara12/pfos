// Retirement planning (pfos/05-engines.md §3).

import { monteCarlo, projectDeterministic, type MonteCarloResult } from "./projection";

export interface RetirementInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy?: number; // default 90
  monthlyExpensesNow: number;
  expenseContinuationPct?: number; // default 0.8
  inflation?: number; // default 0.06
  preReturn: number; // expected annual return pre-retirement
  postReturn?: number; // default 0.08 (more conservative)
  preVol?: number;
  currentCorpus: number;
  monthlyInvestment: number;
  stepUpAnnual?: number;
}

export interface RetirementResult {
  corpusNeeded: number;
  projectedCorpusP50: number;
  projectedDeterministic: number;
  successProb: number;
  readinessScore: number; // 0-100
  fundedPct: number;
  monthlyExpenseAtRetirement: number;
  mc: MonteCarloResult;
}

export function corpusNeeded(
  monthlyExpenseAtRetirement: number,
  postReturn: number,
  inflation: number,
  retirementYears: number,
): number {
  // PV of an inflation-growing annuity-due over retirementYears
  const annual = monthlyExpenseAtRetirement * 12;
  const rr = (1 + postReturn) / (1 + inflation) - 1; // real return
  if (Math.abs(rr) < 1e-9) return annual * retirementYears;
  return ((annual * (1 - Math.pow(1 + rr, -retirementYears))) / rr) * (1 + rr);
}

export function planRetirement(inp: RetirementInput): RetirementResult {
  const life = inp.lifeExpectancy ?? 90;
  const inflation = inp.inflation ?? 0.06;
  const cont = inp.expenseContinuationPct ?? 0.8;
  const postReturn = inp.postReturn ?? 0.08;
  const yearsToRetire = Math.max(0, inp.retirementAge - inp.currentAge);
  const retirementYears = Math.max(1, life - inp.retirementAge);

  const expAtRet = inp.monthlyExpensesNow * Math.pow(1 + inflation, yearsToRetire) * cont;
  const needed = corpusNeeded(expAtRet, postReturn, inflation, retirementYears);

  const det = projectDeterministic({
    startCorpus: inp.currentCorpus,
    monthlyContribution: inp.monthlyInvestment,
    contributionStepUpAnnual: inp.stepUpAnnual ?? 0.05,
    contributionYears: yearsToRetire,
    totalYears: yearsToRetire,
    annualReturn: inp.preReturn,
  });

  const mc = monteCarlo(
    {
      startCorpus: inp.currentCorpus,
      monthlyContribution: inp.monthlyInvestment,
      contributionStepUpAnnual: inp.stepUpAnnual ?? 0.05,
      contributionYears: yearsToRetire,
      totalYears: yearsToRetire,
      annualReturn: inp.preReturn,
      annualVol: inp.preVol ?? 0.13,
    },
    needed,
  );

  const fundedPct = Math.min(1, mc.terminalP50 / needed);
  const readiness = Math.round(100 * fundedPct * (0.7 + 0.3 * mc.successProb));

  return {
    corpusNeeded: needed,
    projectedCorpusP50: mc.terminalP50,
    projectedDeterministic: det[det.length - 1],
    successProb: mc.successProb,
    readinessScore: readiness,
    fundedPct: fundedPct * 100,
    monthlyExpenseAtRetirement: expAtRet,
    mc,
  };
}
