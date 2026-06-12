import { db } from "../db";
import { amortizationSchedule, prepaymentImpact, type AmortRow } from "../engines";
import type { Scope } from "./scope";

export interface LoanView {
  accountId: string;
  name: string;
  institution: string | null;
  type: string;
  outstanding: number;
  principal: number;
  interestRate: number;
  emi: number;
  emiDay: number;
  remainingMonths: number;
  totalInterestRemaining: number;
  schedule: AmortRow[];
  prepay10k: { monthsSaved: number; interestSaved: number };
}

export interface CardView {
  accountId: string;
  name: string;
  outstanding: number;
  creditLimit: number;
  utilization: number;
  apr: number;
  dueDay: number;
}

export interface LiabilitySummary {
  totalDebt: number;
  totalEmi: number;
  loans: LoanView[];
  cards: CardView[];
  foir: number; // EMIs / take-home income
}

export async function getLiabilities(scope: Scope): Promise<LiabilitySummary> {
  const accounts = await db.account.findMany({
    where: { personId: { in: scope.personIds }, class: "liability" },
    include: { loanDetail: true, cardDetail: true, valuations: { orderBy: { asOfDate: "desc" }, take: 1 } },
  });

  const loans: LoanView[] = [];
  const cards: CardView[] = [];
  for (const a of accounts) {
    if (a.loanDetail) {
      const d = a.loanDetail;
      const schedule = amortizationSchedule(d.outstanding, d.interestRate, d.emi);
      loans.push({
        accountId: a.id,
        name: a.displayName,
        institution: a.institution,
        type: a.type,
        outstanding: d.outstanding,
        principal: d.principal,
        interestRate: d.interestRate,
        emi: d.emi,
        emiDay: d.emiDay,
        remainingMonths: schedule.length,
        totalInterestRemaining: Math.round(schedule.reduce((s, r) => s + r.interest, 0)),
        schedule,
        prepay10k: (() => {
          const p = prepaymentImpact(d.outstanding, d.interestRate, d.emi, 10000);
          return { monthsSaved: p.monthsSaved, interestSaved: Math.round(p.interestSaved) };
        })(),
      });
    } else if (a.cardDetail) {
      const d = a.cardDetail;
      const outstanding = Math.abs(a.valuations[0]?.value ?? 0);
      cards.push({
        accountId: a.id,
        name: a.displayName,
        outstanding,
        creditLimit: d.creditLimit,
        utilization: outstanding / d.creditLimit,
        apr: d.apr,
        dueDay: d.dueDay,
      });
    }
  }
  loans.sort((x, y) => y.interestRate - x.interestRate); // avalanche order

  const income = scope.persons
    .filter((p) => scope.personIds.includes(p.id))
    .reduce((s, p) => s + p.monthlyIncome, 0);
  const totalEmi = loans.reduce((s, l) => s + l.emi, 0);
  const totalDebt =
    loans.reduce((s, l) => s + l.outstanding, 0) + cards.reduce((s, c) => s + c.outstanding, 0);

  return { totalDebt: Math.round(totalDebt), totalEmi: Math.round(totalEmi), loans, cards, foir: income ? totalEmi / income : 0 };
}

export interface Obligation {
  date: Date;
  label: string;
  amount: number;
  kind: "emi" | "sip" | "card_due" | "premium";
}

export async function getUpcomingObligations(scope: Scope): Promise<Obligation[]> {
  const out: Obligation[] = [];
  const today = new Date();
  const addNext = (day: number, label: string, amount: number, kind: Obligation["kind"]) => {
    const d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d.setMonth(d.getMonth() + 1);
    if ((d.getTime() - today.getTime()) / 86400000 <= 35) out.push({ date: d, label, amount, kind });
  };

  const liab = await getLiabilities(scope);
  for (const l of liab.loans) addNext(l.emiDay, `${l.name} EMI`, l.emi, "emi");
  for (const c of liab.cards) addNext(c.dueDay, `${c.name} bill due`, c.outstanding, "card_due");
  addNext(5, "SIP ₹85,000 (4 funds)", 85000, "sip");
  addNext(7, "SIP ₹25,000 (2 funds)", 25000, "sip");

  const policies = await db.insurancePolicy.findMany({ where: { personId: { in: scope.personIds } } });
  for (const p of policies) {
    if (!p.renewalDate) continue;
    const d = new Date(p.renewalDate);
    d.setFullYear(today.getFullYear());
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    if ((d.getTime() - today.getTime()) / 86400000 <= 35)
      out.push({ date: d, label: `${p.insurer} ${p.type} premium`, amount: p.annualPremium, kind: "premium" });
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
