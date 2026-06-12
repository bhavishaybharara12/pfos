// Major Purchase Advisor (pfos/05-engines.md §7).

import { emi } from "./loan";

export interface PurchaseInput {
  kind: "car" | "house" | "vacation" | "other";
  price: number;
  monthlyTakeHome: number;
  annualTakeHome: number;
  existingEmis: number;
  liquidAssets: number; // cash + liquid funds available
  emergencyFundTarget: number;
  funding: "cash" | "loan";
  loanRatePct?: number;
  loanTenureMonths?: number;
  downPaymentPct?: number; // for loan funding
  portfolioExpectedReturn?: number; // for opportunity-cost note
}

export interface PurchaseVerdict {
  verdict: "Comfortable" | "Stretch" | "Risky";
  comfortableRange: [number, number];
  newEmi: number;
  foirAfter: number;
  breachesEmergencyFund: boolean;
  notes: string[];
}

export function advisePurchase(inp: PurchaseInput): PurchaseVerdict {
  const notes: string[] = [];
  const down =
    inp.funding === "loan" ? inp.price * (inp.downPaymentPct ?? 0.2) : inp.price;
  const newEmi =
    inp.funding === "loan"
      ? emi(inp.price - down, inp.loanRatePct ?? 9.5, inp.loanTenureMonths ?? 60)
      : 0;
  const foirAfter = (inp.existingEmis + newEmi) / inp.monthlyTakeHome;
  const breachesEmergencyFund = inp.liquidAssets - down < inp.emergencyFundTarget;

  // guideline cap by purchase kind
  let guidelineCap: number;
  if (inp.kind === "car") {
    guidelineCap = 0.5 * inp.annualTakeHome; // car ≤ 50% of annual take-home
    notes.push("Rule applied: car budget ≤ 50% of annual take-home (20/4/10 check on loans).");
  } else if (inp.kind === "house") {
    // affordability driven by EMI headroom: total FOIR ≤ 35% for housing comfort
    const emiHeadroom = Math.max(0, 0.35 * inp.monthlyTakeHome - inp.existingEmis);
    const rate = inp.loanRatePct ?? 8.75;
    const months = inp.loanTenureMonths ?? 240;
    const r = rate / 100 / 12;
    const f = Math.pow(1 + r, months);
    const loanCapacity = (emiHeadroom * (f - 1)) / (r * f);
    guidelineCap = loanCapacity / 0.8; // assuming 20% down
    notes.push("Rule applied: home EMI keeps total obligations ≤ 35% of take-home.");
  } else {
    guidelineCap = 0.1 * inp.annualTakeHome; // discretionary big-ticket ≤ 10% of annual income
    notes.push("Rule applied: discretionary purchase ≤ 10% of annual take-home.");
  }

  let verdict: PurchaseVerdict["verdict"];
  if (inp.price <= guidelineCap && foirAfter <= 0.45 && !breachesEmergencyFund) {
    verdict = "Comfortable";
  } else if (inp.price <= guidelineCap * 1.25 && foirAfter <= 0.5) {
    verdict = "Stretch";
  } else {
    verdict = "Risky";
  }

  if (foirAfter > 0.45)
    notes.push(
      `Total EMIs would be ${(foirAfter * 100).toFixed(0)}% of take-home (recommended ≤ 45%).`,
    );
  if (breachesEmergencyFund)
    notes.push("The down payment dips into your emergency fund — rebuild it before or right after.");
  if (inp.funding === "cash" && (inp.portfolioExpectedReturn ?? 0.11) > (inp.loanRatePct ?? 9.5) / 100)
    notes.push(
      "Your expected portfolio return exceeds the loan rate — partial financing may beat paying all cash (post-tax comparison).",
    );

  return {
    verdict,
    comfortableRange: [guidelineCap * 0.7, guidelineCap],
    newEmi,
    foirAfter,
    breachesEmergencyFund,
    notes,
  };
}
