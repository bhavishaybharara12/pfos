import { NextRequest, NextResponse } from "next/server";
import { advisePurchase, monteCarlo, type PurchaseInput } from "@/lib/engines";
import { getRetirement } from "@/lib/data/goals";
import { getCashflow } from "@/lib/data/cashflow";
import { getLiabilities } from "@/lib/data/liabilities";
import { resolveScope } from "@/lib/data/scope";

interface WhatIfBody {
  kind: "whatif";
  extraMonthly?: number; // additional monthly investment (can be negative)
  retirementAge?: number;
  oneTimePurchase?: { amount: number; inMonths: number };
  marketCrash?: boolean; // -35% equity shock in year 1
}

interface PurchaseBody {
  kind: "purchase";
  purchase: Omit<PurchaseInput, "monthlyTakeHome" | "annualTakeHome" | "existingEmis" | "liquidAssets" | "emergencyFundTarget">;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WhatIfBody | PurchaseBody;
  const scope = await resolveScope("family");

  if (body.kind === "purchase") {
    const [cash, liab] = await Promise.all([getCashflow(scope), getLiabilities(scope)]);
    const income = scope.persons.reduce((s, p) => s + p.monthlyIncome, 0);
    const verdict = advisePurchase({
      ...body.purchase,
      monthlyTakeHome: income,
      annualTakeHome: income * 12,
      existingEmis: liab.totalEmi,
      liquidAssets: 900000, // cash + FD (demo: from balance sheet)
      emergencyFundTarget: cash.essentialMonthly * 6,
    });

    // retirement impact: divert down payment + EMI from investing
    const base = await getRetirement(scope);
    const monthlyDrag = verdict.newEmi;
    const downPayment = body.purchase.funding === "loan" ? body.purchase.price * (body.purchase.downPaymentPct ?? 0.2) : body.purchase.price;
    const scenario = await getRetirement(scope, {
      monthlyInvestment: Math.max(0, base.monthlySip - monthlyDrag),
    });
    // subtract the one-time down payment from corpus effect via deterministic delta
    const corpusDelta = scenario.plan.projectedCorpusP50 - base.plan.projectedCorpusP50 - downPayment * Math.pow(1.11, base.inputs.retirementAge - base.inputs.currentAge);

    return NextResponse.json({
      verdict,
      retirementImpact: {
        successProbBase: base.plan.successProb,
        successProbAfter: scenario.plan.successProb,
        corpusDelta: Math.round(corpusDelta),
      },
    });
  }

  // what-if: re-run retirement Monte Carlo with deltas
  const base = await getRetirement(scope);
  const retirementAge = body.retirementAge ?? base.inputs.retirementAge;
  const extra = body.extraMonthly ?? 0;
  const yearsToRetire = Math.max(1, retirementAge - base.inputs.currentAge);

  const oneTimeFlows = body.oneTimePurchase
    ? [{ month: body.oneTimePurchase.inMonths, amount: -body.oneTimePurchase.amount }]
    : undefined;

  const scenarioPlan = await getRetirement(scope, {
    retirementAge,
    monthlyInvestment: base.monthlySip + extra,
  });

  // overlay one-time purchase / crash on the MC directly for the fan chart
  const mc = monteCarlo(
    {
      startCorpus: body.marketCrash ? base.currentCorpus * 0.74 : base.currentCorpus, // ~35% equity shock on a 74%-equity corpus
      monthlyContribution: base.monthlySip + extra,
      contributionStepUpAnnual: 0.05,
      contributionYears: yearsToRetire,
      totalYears: yearsToRetire,
      annualReturn: 0.11,
      annualVol: 0.13,
      oneTimeFlows,
    },
    scenarioPlan.plan.corpusNeeded,
  );

  return NextResponse.json({
    base: {
      corpusNeeded: Math.round(base.plan.corpusNeeded),
      projected: Math.round(base.plan.projectedCorpusP50),
      successProb: base.plan.successProb,
      readiness: base.plan.readinessScore,
      fan: base.plan.mc.fan,
    },
    scenario: {
      corpusNeeded: Math.round(scenarioPlan.plan.corpusNeeded),
      projected: Math.round(mc.terminalP50),
      successProb: mc.successProb,
      readiness: scenarioPlan.plan.readinessScore,
      fan: mc.fan,
    },
    inputs: { retirementAge, extraMonthly: extra, currentAge: base.inputs.currentAge },
  });
}
