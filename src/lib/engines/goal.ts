// Goal funding math (pfos/05-engines.md §5).

import { monteCarlo } from "./projection";

export interface GoalInput {
  targetAmountToday: number;
  yearsToTarget: number;
  goalInflation?: number; // default 0.06
  currentFunding: number; // earmarked assets today
  monthlySip: number; // SIPs mapped to this goal
  expectedReturn?: number; // default 0.11, should reflect glide path
  vol?: number;
}

export interface GoalResult {
  fvTarget: number;
  fvProjectedP50: number;
  fundedPct: number; // current funding vs PV of target (today's-money progress)
  monthlyRequired: number; // additional SIP needed to close the gap
  successProb: number;
}

export function planGoal(inp: GoalInput): GoalResult {
  const i = inp.goalInflation ?? 0.06;
  const r = inp.expectedReturn ?? 0.11;
  const years = Math.max(0.25, inp.yearsToTarget);
  const months = Math.round(years * 12);
  const rm = Math.pow(1 + r, 1 / 12) - 1;

  const fvTarget = inp.targetAmountToday * Math.pow(1 + i, years);
  const fvExisting = inp.currentFunding * Math.pow(1 + r, years);
  const fvSip = inp.monthlySip * ((Math.pow(1 + rm, months) - 1) / rm);
  const gap = Math.max(0, fvTarget - fvExisting - fvSip);
  const monthlyRequired = gap > 0 ? (gap * rm) / (Math.pow(1 + rm, months) - 1) : 0;

  const mc = monteCarlo(
    {
      startCorpus: inp.currentFunding,
      monthlyContribution: inp.monthlySip,
      contributionYears: years,
      totalYears: years,
      annualReturn: r,
      annualVol: inp.vol ?? 0.12,
    },
    fvTarget,
    1500,
  );

  return {
    fvTarget,
    fvProjectedP50: mc.terminalP50,
    fundedPct: Math.min(100, (inp.currentFunding / (fvTarget / Math.pow(1 + r, years))) * 100),
    monthlyRequired,
    successProb: mc.successProb,
  };
}
