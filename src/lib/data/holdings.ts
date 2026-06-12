import { db } from "../db";
import { xirr, type CashFlow } from "../engines";
import type { Scope } from "./scope";

export interface HoldingRow {
  instrument: string;
  symbol: string | null;
  assetClass: string;
  subClass: string | null;
  sector: string | null;
  quantity: number;
  invested: number;
  value: number;
  gain: number;
  gainPct: number;
  xirr: number | null;
  expenseRatio: number | null;
}

export interface AccountGroup {
  accountId: string;
  name: string;
  type: string;
  institution: string | null;
  connectionLabel: string | null;
  dataQuality: number | null;
  confidence: number;
  value: number;
  invested: number | null;
  xirr: number | null;
  holdings: HoldingRow[];
}

export async function getAssetGroups(scope: Scope): Promise<AccountGroup[]> {
  const accounts = await db.account.findMany({
    where: { personId: { in: scope.personIds }, class: "asset" },
    include: {
      positions: { include: { instrument: true } },
      valuations: { orderBy: { asOfDate: "desc" }, take: 1 },
      transactions: { where: { type: "buy" }, orderBy: { txnDate: "asc" } },
      connection: true,
    },
  });

  const groups: AccountGroup[] = [];
  for (const a of accounts) {
    const value = a.valuations[0]?.value ?? 0;
    const invested = a.valuations[0]?.invested ?? null;

    // account-level XIRR from buy flows + current value
    let acctXirr: number | null = null;
    if (a.transactions.length > 0 && value > 0) {
      const flows: CashFlow[] = a.transactions.map((t) => ({ date: t.txnDate, amount: t.amount }));
      flows.push({ date: new Date(), amount: value });
      acctXirr = xirr(flows);
    }

    const holdings: HoldingRow[] = a.positions.map((p) => {
      const v = p.quantity * p.currentPrice;
      const inv = p.investedAmount ?? 0;
      const instFlows = a.transactions.filter((t) => t.instrumentId === p.instrumentId);
      let hx: number | null = null;
      if (instFlows.length > 0) {
        const flows: CashFlow[] = instFlows.map((t) => ({ date: t.txnDate, amount: t.amount }));
        flows.push({ date: new Date(), amount: v });
        hx = xirr(flows);
      }
      return {
        instrument: p.instrument.name,
        symbol: p.instrument.symbol,
        assetClass: p.instrument.assetClass,
        subClass: p.instrument.subClass,
        sector: p.instrument.sector,
        quantity: p.quantity,
        invested: Math.round(inv),
        value: Math.round(v),
        gain: Math.round(v - inv),
        gainPct: inv ? (v - inv) / inv : 0,
        xirr: hx,
        expenseRatio: p.instrument.expenseRatio,
      };
    });
    holdings.sort((x, y) => y.value - x.value);

    groups.push({
      accountId: a.id,
      name: a.displayName,
      type: a.type,
      institution: a.institution,
      connectionLabel: a.connection?.label ?? null,
      dataQuality: a.connection?.dataQuality ?? null,
      confidence: a.confidence,
      value: Math.round(value),
      invested: invested !== null ? Math.round(invested) : null,
      xirr: acctXirr,
      holdings,
    });
  }
  return groups.sort((x, y) => y.value - x.value);
}
