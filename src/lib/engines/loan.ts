// Loan math: EMI, amortization schedule, prepayment simulation (pfos/05-engines.md §8).

export interface AmortRow {
  period: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export function emi(principal: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  const f = Math.pow(1 + r, months);
  return (principal * r * f) / (f - 1);
}

export function amortizationSchedule(
  outstanding: number,
  annualRatePct: number,
  emiAmount: number,
  extraMonthly = 0,
): AmortRow[] {
  const r = annualRatePct / 100 / 12;
  const rows: AmortRow[] = [];
  let balance = outstanding;
  let period = 0;
  while (balance > 0.5 && period < 600) {
    period++;
    const interest = balance * r;
    const pay = Math.min(emiAmount + extraMonthly, balance + interest);
    const principal = pay - interest;
    if (principal <= 0) break; // EMI doesn't cover interest
    balance -= principal;
    rows.push({ period, emi: pay, principal, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

export function totalInterest(rows: AmortRow[]): number {
  return rows.reduce((s, r) => s + r.interest, 0);
}

/** Effect of paying `extraMonthly` more: months saved and interest saved. */
export function prepaymentImpact(
  outstanding: number,
  annualRatePct: number,
  emiAmount: number,
  extraMonthly: number,
) {
  const base = amortizationSchedule(outstanding, annualRatePct, emiAmount);
  const accel = amortizationSchedule(outstanding, annualRatePct, emiAmount, extraMonthly);
  return {
    monthsSaved: base.length - accel.length,
    interestSaved: totalInterest(base) - totalInterest(accel),
    newTenureMonths: accel.length,
  };
}
