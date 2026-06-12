// FIRE module (pfos/05-engines.md §4). India-calibrated SWR default 3.5%.

export interface FireInput {
  annualExpenses: number;
  currentCorpus: number; // investable (excludes primary residence)
  monthlyInvestment: number;
  expectedReturn?: number; // default 0.11
  inflation?: number; // default 0.06
  swr?: number; // default 0.035
  currentAge: number;
  traditionalRetirementAge?: number; // for Coast FIRE, default 60
}

export interface FireResult {
  fireNumber: number; // in today's money
  leanFireNumber: number;
  fatFireNumber: number;
  coastFireNumber: number;
  coastReached: boolean;
  yearsToFire: number | null; // null = not within 60y at current rate
  fireAge: number | null;
  fundedPct: number;
}

export function planFire(inp: FireInput): FireResult {
  const r = inp.expectedReturn ?? 0.11;
  const i = inp.inflation ?? 0.06;
  const swr = inp.swr ?? 0.035;
  const fireNumber = inp.annualExpenses / swr;
  const leanFireNumber = (inp.annualExpenses * 0.7) / swr;
  const fatFireNumber = (inp.annualExpenses * 1.5) / 0.03;

  const tradAge = inp.traditionalRetirementAge ?? 60;
  const T = Math.max(0, tradAge - inp.currentAge);
  // corpus today that grows (real) to the FIRE number by traditional retirement age
  const coastFireNumber = fireNumber * Math.pow((1 + i) / (1 + r), T);

  // solve months: corpus and target both move; compare in nominal terms
  const rm = Math.pow(1 + r, 1 / 12) - 1;
  const im = Math.pow(1 + i, 1 / 12) - 1;
  let corpus = inp.currentCorpus;
  let target = fireNumber;
  let months: number | null = null;
  for (let m = 1; m <= 720; m++) {
    corpus = corpus * (1 + rm) + inp.monthlyInvestment;
    target *= 1 + im;
    if (corpus >= target) {
      months = m;
      break;
    }
  }

  return {
    fireNumber,
    leanFireNumber,
    fatFireNumber,
    coastFireNumber,
    coastReached: inp.currentCorpus >= coastFireNumber,
    yearsToFire: months === null ? null : Math.round((months / 12) * 10) / 10,
    fireAge: months === null ? null : Math.round(inp.currentAge + months / 12),
    fundedPct: Math.min(100, (inp.currentCorpus / fireNumber) * 100),
  };
}
