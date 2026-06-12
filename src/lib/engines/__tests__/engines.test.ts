import { describe, expect, it } from "vitest";
import { xirr } from "../xirr";
import { amortizationSchedule, emi, prepaymentImpact } from "../loan";
import { monteCarlo, projectDeterministic } from "../projection";
import { corpusNeeded, planRetirement } from "../retirement";
import { planFire } from "../fire";
import { planGoal } from "../goal";
import { healthScore } from "../health";
import { advisePurchase } from "../purchase";

describe("emi / amortization (golden vs bank tables)", () => {
  it("₹50L @8.5% for 240 months → ₹43,391 EMI", () => {
    expect(emi(5_000_000, 8.5, 240)).toBeCloseTo(43391.16, 0);
  });
  it("schedule fully amortizes and interest sums correctly", () => {
    const e = emi(1_000_000, 10, 120);
    const rows = amortizationSchedule(1_000_000, 10, e);
    expect(rows.length).toBe(120);
    expect(rows[rows.length - 1].balance).toBeLessThan(1);
    const principalSum = rows.reduce((s, r) => s + r.principal, 0);
    expect(principalSum).toBeCloseTo(1_000_000, 0);
  });
  it("prepayment saves interest and tenure", () => {
    const e = emi(4_650_000, 8.65, 178);
    const imp = prepaymentImpact(4_650_000, 8.65, e, 10_000);
    expect(imp.monthsSaved).toBeGreaterThan(20);
    expect(imp.interestSaved).toBeGreaterThan(500_000);
  });
});

describe("xirr", () => {
  it("single-period 21% return → 21% (Excel golden)", () => {
    const r = xirr([
      { date: new Date("2019-01-01"), amount: -100_000 },
      { date: new Date("2020-01-01"), amount: 121_000 },
    ]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.21, 3);
  });
  it("returns null for all-negative flows", () => {
    expect(
      xirr([
        { date: new Date("2023-01-01"), amount: -100 },
        { date: new Date("2024-01-01"), amount: -100 },
      ]),
    ).toBeNull();
  });
  it("handles SIP-like multi-flow streams", () => {
    const flows = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(2023, i, 5),
      amount: -10_000,
    }));
    flows.push({ date: new Date(2024, 5, 1), amount: 135_000 });
    const r = xirr(flows);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0.08);
    expect(r!).toBeLessThan(0.25);
  });
});

describe("projection core", () => {
  it("deterministic matches ordinary-annuity FV (₹10k/mo, 10y, 12%)", () => {
    const path = projectDeterministic({
      startCorpus: 0,
      monthlyContribution: 10_000,
      contributionYears: 10,
      totalYears: 10,
      annualReturn: 0.12,
    });
    expect(path[path.length - 1]).toBeCloseTo(2_219_000, -4); // within ₹10k
  });
  it("monte carlo with ~zero vol converges to deterministic", () => {
    const inp = {
      startCorpus: 1_000_000,
      monthlyContribution: 20_000,
      contributionYears: 15,
      totalYears: 15,
      annualReturn: 0.1,
      annualVol: 0.0001,
    };
    const det = projectDeterministic(inp);
    const mc = monteCarlo(inp, 0, 500);
    expect(mc.terminalP50 / det[det.length - 1]).toBeCloseTo(1, 2);
  });
  it("is reproducible for the same seed", () => {
    const inp = {
      startCorpus: 500_000,
      monthlyContribution: 10_000,
      contributionYears: 10,
      totalYears: 10,
      annualReturn: 0.12,
      annualVol: 0.15,
    };
    const a = monteCarlo(inp, 5_000_000, 500, 7);
    const b = monteCarlo(inp, 5_000_000, 500, 7);
    expect(a.terminalP50).toBe(b.terminalP50);
    expect(a.successProb).toBe(b.successProb);
  });
});

describe("retirement", () => {
  it("corpus for ₹1L/mo, 8% post, 6% inflation, 30y ≈ ₹2.78Cr (HP12C golden)", () => {
    expect(corpusNeeded(100_000, 0.08, 0.06, 30)).toBeCloseTo(27_820_000, -5);
  });
  it("produces coherent plan output", () => {
    const r = planRetirement({
      currentAge: 32,
      retirementAge: 55,
      monthlyExpensesNow: 150_000,
      preReturn: 0.11,
      currentCorpus: 8_000_000,
      monthlyInvestment: 100_000,
    });
    expect(r.corpusNeeded).toBeGreaterThan(50_000_000);
    expect(r.successProb).toBeGreaterThanOrEqual(0);
    expect(r.successProb).toBeLessThanOrEqual(1);
    expect(r.readinessScore).toBeGreaterThanOrEqual(0);
    expect(r.readinessScore).toBeLessThanOrEqual(100);
  });
});

describe("fire", () => {
  it("₹12L expenses at 3.5% SWR → ₹3.43Cr FIRE number", () => {
    const f = planFire({
      annualExpenses: 1_200_000,
      currentCorpus: 10_000_000,
      monthlyInvestment: 100_000,
      currentAge: 30,
    });
    expect(f.fireNumber).toBeCloseTo(34_285_714, -3);
    expect(f.yearsToFire).not.toBeNull();
    expect(f.leanFireNumber).toBeLessThan(f.fireNumber);
    expect(f.fatFireNumber).toBeGreaterThan(f.fireNumber);
  });
});

describe("goal", () => {
  it("fully-funded goal needs no extra SIP", () => {
    const g = planGoal({
      targetAmountToday: 1_000_000,
      yearsToTarget: 5,
      currentFunding: 2_000_000,
      monthlySip: 0,
    });
    expect(g.monthlyRequired).toBe(0);
    expect(g.successProb).toBeGreaterThan(0.9);
  });
  it("unfunded goal computes a positive monthly requirement", () => {
    const g = planGoal({
      targetAmountToday: 8_000_000,
      yearsToTarget: 10,
      goalInflation: 0.1,
      currentFunding: 1_000_000,
      monthlySip: 10_000,
    });
    expect(g.monthlyRequired).toBeGreaterThan(10_000);
    expect(g.fvTarget).toBeCloseTo(8_000_000 * Math.pow(1.1, 10), -3);
  });
});

describe("health score", () => {
  it("strong profile lands Excellent", () => {
    const h = healthScore({
      savingsRate: 0.4,
      emergencyMonths: 8,
      foir: 0.1,
      hasHighAprDebt: false,
      lifeCoverRatio: 1.2,
      healthCoverOk: true,
      concentrationPenalty: 5,
      retirementReadiness: 90,
      nwGrowth12m: 0.2,
      creditScore: 800,
    });
    expect(h.total).toBeGreaterThanOrEqual(80);
    expect(h.band).toBe("Excellent");
  });
  it("missing data redistributes weights and caps when sparse", () => {
    const h = healthScore({
      savingsRate: 0.4,
      emergencyMonths: null,
      foir: null,
      hasHighAprDebt: false,
      lifeCoverRatio: null,
      healthCoverOk: null,
      concentrationPenalty: 0,
      retirementReadiness: null,
      nwGrowth12m: null,
      creditScore: null,
    });
    expect(h.completeness).toBeLessThan(0.6);
    expect(h.total).toBeLessThanOrEqual(75);
  });
});

describe("purchase advisor", () => {
  it("₹22L car on ₹20L take-home is Risky", () => {
    const v = advisePurchase({
      kind: "car",
      price: 2_200_000,
      monthlyTakeHome: 170_000,
      annualTakeHome: 2_000_000,
      existingEmis: 53_000,
      liquidAssets: 800_000,
      emergencyFundTarget: 700_000,
      funding: "loan",
      loanRatePct: 9.5,
      loanTenureMonths: 60,
    });
    expect(v.verdict).toBe("Risky");
    expect(v.comfortableRange[1]).toBeCloseTo(1_000_000, -4);
  });
  it("₹8L car on the same finances is Comfortable", () => {
    const v = advisePurchase({
      kind: "car",
      price: 800_000,
      monthlyTakeHome: 170_000,
      annualTakeHome: 2_000_000,
      existingEmis: 53_000,
      liquidAssets: 2_000_000,
      emergencyFundTarget: 700_000,
      funding: "loan",
      loanRatePct: 9.5,
      loanTenureMonths: 48,
    });
    expect(v.verdict).toBe("Comfortable");
  });
});
