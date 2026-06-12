// Financial Health Score 0-100 (pfos/06-ai-copilot.md §4).

export interface HealthInput {
  savingsRate: number | null; // 0..1
  emergencyMonths: number | null; // months of essential cover
  foir: number | null; // EMI/income 0..1
  hasHighAprDebt: boolean;
  lifeCoverRatio: number | null; // cover / (10 × annual income); null if no dependents data
  healthCoverOk: boolean | null;
  concentrationPenalty: number; // 0-100 penalty points from allocation engine
  retirementReadiness: number | null; // 0-100 RRS
  nwGrowth12m: number | null; // e.g. 0.18 (income-scaled check done upstream)
  creditScore: number | null; // 300-900
}

export interface HealthComponent {
  key: string;
  label: string;
  weight: number;
  score: number | null; // null = data missing, weight redistributed
}

export interface HealthResult {
  total: number;
  band: "At Risk" | "Needs Work" | "Stable" | "Excellent";
  components: HealthComponent[];
  biggestDrag: HealthComponent | null;
  completeness: number;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function healthScore(inp: HealthInput): HealthResult {
  const insurance =
    inp.lifeCoverRatio === null && inp.healthCoverOk === null
      ? null
      : clamp(
          Math.min(
            inp.lifeCoverRatio === null ? 100 : inp.lifeCoverRatio * 100,
            inp.healthCoverOk === null ? 100 : inp.healthCoverOk ? 100 : 30,
          ),
        );

  let debtScore: number | null = null;
  if (inp.foir !== null) {
    debtScore = inp.foir <= 0.2 ? 100 : inp.foir >= 0.5 ? 0 : clamp(((0.5 - inp.foir) / 0.3) * 100);
    if (inp.hasHighAprDebt) debtScore = debtScore / 2;
  }

  const components: HealthComponent[] = [
    {
      key: "savingsRate",
      label: "Savings rate",
      weight: 15,
      score: inp.savingsRate === null ? null : clamp((inp.savingsRate / 0.3) * 100),
    },
    {
      key: "emergencyFund",
      label: "Emergency fund",
      weight: 15,
      score: inp.emergencyMonths === null ? null : clamp((inp.emergencyMonths / 6) * 100),
    },
    { key: "debt", label: "Debt health", weight: 15, score: debtScore },
    { key: "insurance", label: "Insurance adequacy", weight: 12, score: insurance },
    {
      key: "diversification",
      label: "Diversification",
      weight: 10,
      score: clamp(100 - inp.concentrationPenalty),
    },
    {
      key: "retirement",
      label: "Retirement readiness",
      weight: 15,
      score: inp.retirementReadiness === null ? null : clamp(inp.retirementReadiness),
    },
    {
      key: "nwTrajectory",
      label: "Net worth trajectory",
      weight: 10,
      score: inp.nwGrowth12m === null ? null : clamp((inp.nwGrowth12m / 0.15) * 100),
    },
    {
      key: "credit",
      label: "Credit score",
      weight: 8,
      score: inp.creditScore === null ? null : clamp(((inp.creditScore - 300) / 600) * 100),
    },
  ];

  const available = components.filter((c) => c.score !== null);
  const wSum = available.reduce((s, c) => s + c.weight, 0);
  const raw = available.reduce((s, c) => s + c.weight * (c.score as number), 0) / (wSum || 1);

  const completeness = wSum / components.reduce((s, c) => s + c.weight, 0);
  const total = Math.round(completeness < 0.6 ? Math.min(raw, 75) : raw);

  const band =
    total < 40 ? "At Risk" : total < 60 ? "Needs Work" : total < 80 ? "Stable" : "Excellent";

  const biggestDrag =
    available.length === 0
      ? null
      : available.reduce((worst, c) =>
          c.weight * (100 - (c.score as number)) > worst.weight * (100 - (worst.score as number))
            ? c
            : worst,
        );

  return { total, band, components, biggestDrag, completeness };
}
