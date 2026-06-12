// Projection core: deterministic projector + seeded Monte Carlo (pfos/05-engines.md §2).
// MVP simplification: portfolio modeled as one blended asset (return/vol from allocation)
// rather than full multivariate correlation — documented divergence.

import { gaussian, mulberry32 } from "./rng";

export interface ProjectionInput {
  startCorpus: number;
  monthlyContribution: number;
  contributionStepUpAnnual?: number; // e.g. 0.05 = +5%/yr
  contributionYears: number; // contributions stop after this many years (e.g. at retirement)
  totalYears: number;
  annualReturn: number; // e.g. 0.12
  annualVol?: number; // e.g. 0.14 — used by Monte Carlo
  monthlyWithdrawal?: number; // starts after contributionYears, grows with inflation
  withdrawalInflation?: number;
  oneTimeFlows?: { month: number; amount: number }[]; // +inflow / -outflow
}

export interface FanPoint {
  month: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

const monthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

export function projectDeterministic(inp: ProjectionInput): number[] {
  const months = Math.round(inp.totalYears * 12);
  const contribMonths = Math.round(inp.contributionYears * 12);
  const rm = monthlyRate(inp.annualReturn);
  const flows = new Map(inp.oneTimeFlows?.map((f) => [f.month, f.amount]) ?? []);
  const out: number[] = [inp.startCorpus];
  let w = inp.startCorpus;
  for (let m = 1; m <= months; m++) {
    w *= 1 + rm;
    if (m <= contribMonths) {
      const yearsIn = Math.floor((m - 1) / 12);
      w += inp.monthlyContribution * Math.pow(1 + (inp.contributionStepUpAnnual ?? 0), yearsIn);
    } else if (inp.monthlyWithdrawal) {
      const yearsPost = Math.floor((m - contribMonths - 1) / 12);
      w -= inp.monthlyWithdrawal * Math.pow(1 + (inp.withdrawalInflation ?? 0.06), yearsPost);
    }
    w += flows.get(m) ?? 0;
    out.push(w);
  }
  return out;
}

export interface MonteCarloResult {
  fan: FanPoint[]; // sampled quarterly
  successProb: number; // fraction of paths with terminal wealth ≥ target (and never bankrupt if withdrawing)
  terminalP50: number;
}

export function monteCarlo(
  inp: ProjectionInput,
  target: number,
  paths = 2000,
  seed = 42,
): MonteCarloResult {
  const months = Math.round(inp.totalYears * 12);
  const contribMonths = Math.round(inp.contributionYears * 12);
  const vol = inp.annualVol ?? 0.14;
  const sigmaM = vol / Math.sqrt(12);
  const muM = Math.log(1 + inp.annualReturn) / 12 - (sigmaM * sigmaM) / 2;
  const flows = new Map(inp.oneTimeFlows?.map((f) => [f.month, f.amount]) ?? []);
  const norm = gaussian(mulberry32(seed));

  // store every 3rd month for the fan chart
  const sampleEvery = 3;
  const nSamples = Math.floor(months / sampleEvery) + 1;
  const samples: Float64Array[] = Array.from({ length: nSamples }, () => new Float64Array(paths));
  let successes = 0;
  const terminals = new Float64Array(paths);

  for (let p = 0; p < paths; p++) {
    let w = inp.startCorpus;
    let bankrupt = false;
    samples[0][p] = w;
    for (let m = 1; m <= months; m++) {
      const r = Math.exp(muM + sigmaM * norm()) - 1;
      w *= 1 + r;
      if (m <= contribMonths) {
        const yearsIn = Math.floor((m - 1) / 12);
        w += inp.monthlyContribution * Math.pow(1 + (inp.contributionStepUpAnnual ?? 0), yearsIn);
      } else if (inp.monthlyWithdrawal) {
        const yearsPost = Math.floor((m - contribMonths - 1) / 12);
        w -= inp.monthlyWithdrawal * Math.pow(1 + (inp.withdrawalInflation ?? 0.06), yearsPost);
        if (w <= 0) bankrupt = true;
      }
      w += flows.get(m) ?? 0;
      if (w < 0) w = bankrupt ? 0 : w;
      if (m % sampleEvery === 0) samples[m / sampleEvery][p] = w;
    }
    terminals[p] = w;
    if (!bankrupt && w >= target) successes++;
  }

  const pct = (arr: Float64Array, q: number) => {
    const sorted = Float64Array.from(arr).sort();
    return sorted[Math.min(arr.length - 1, Math.floor(q * arr.length))];
  };

  const fan: FanPoint[] = samples.map((s, i) => ({
    month: i * sampleEvery,
    p10: pct(s, 0.1),
    p25: pct(s, 0.25),
    p50: pct(s, 0.5),
    p75: pct(s, 0.75),
    p90: pct(s, 0.9),
  }));

  return { fan, successProb: successes / paths, terminalP50: pct(terminals, 0.5) };
}
