// XIRR — Newton-Raphson with bisection fallback (pfos/05-engines.md §1.3).

export interface CashFlow {
  date: Date;
  amount: number; // negative = money in (investment), positive = money out / current value
}

const MS_PER_DAY = 86400000;

function npv(rate: number, flows: CashFlow[], t0: number): number {
  let sum = 0;
  for (const cf of flows) {
    const years = (cf.date.getTime() - t0) / MS_PER_DAY / 365;
    sum += cf.amount / Math.pow(1 + rate, years);
  }
  return sum;
}

function dNpv(rate: number, flows: CashFlow[], t0: number): number {
  let sum = 0;
  for (const cf of flows) {
    const years = (cf.date.getTime() - t0) / MS_PER_DAY / 365;
    sum += (-years * cf.amount) / Math.pow(1 + rate, years + 1);
  }
  return sum;
}

/** Annualized internal rate of return for dated cash flows. Returns null if undefined/non-convergent. */
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasNeg = flows.some((f) => f.amount < 0);
  const hasPos = flows.some((f) => f.amount > 0);
  if (!hasNeg || !hasPos) return null;
  const t0 = Math.min(...flows.map((f) => f.date.getTime()));

  // Newton-Raphson
  let rate = 0.1;
  for (let i = 0; i < 50; i++) {
    const f = npv(rate, flows, t0);
    const df = dNpv(rate, flows, t0);
    if (Math.abs(df) < 1e-12) break;
    const next = rate - f / df;
    if (!isFinite(next) || next <= -0.99 || next > 10) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Bisection fallback on (-0.99, 10)
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo, flows, t0);
  if (fLo * npv(hi, flows, t0) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, flows, t0);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
