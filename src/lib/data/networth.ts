import { db } from "../db";
import type { Scope } from "./scope";

export interface NetWorthSummary {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number; // positive number
  changeMonth: number;
  changeMonthPct: number;
  series: { date: string; netWorth: number; assets: number; liabilities: number }[];
  allocation: { class: string; value: number; pct: number }[];
  freshness: { synced: number; total: number; stale: { label: string; daysAgo: number }[] };
}

const CLASS_LABELS: Record<string, string> = {
  equity: "Equity",
  debt: "Debt",
  cash: "Cash",
  gold: "Gold",
  real_estate: "Real Estate",
  alternative: "Alternative",
};

export async function getNetWorth(scope: Scope): Promise<NetWorthSummary> {
  const accounts = await db.account.findMany({
    where: { personId: { in: scope.personIds } },
    include: { valuations: { orderBy: { asOfDate: "asc" } }, connection: true },
  });

  // aggregate by exact date (seed aligns dates across accounts); carry forward last value
  const dates = new Set<number>();
  for (const a of accounts) for (const v of a.valuations) dates.add(v.asOfDate.getTime());
  const sorted = [...dates].sort((x, y) => x - y);

  const series = sorted.map((t) => {
    let assets = 0;
    let liabilities = 0;
    for (const a of accounts) {
      // last valuation at or before t
      let val: number | null = null;
      for (let i = a.valuations.length - 1; i >= 0; i--) {
        if (a.valuations[i].asOfDate.getTime() <= t) {
          val = a.valuations[i].value;
          break;
        }
      }
      if (val === null) continue;
      if (a.class === "asset") assets += val;
      else liabilities += -val;
    }
    return {
      date: new Date(t).toISOString().slice(0, 10),
      netWorth: Math.round(assets - liabilities),
      assets: Math.round(assets),
      liabilities: Math.round(liabilities),
    };
  });

  const latest = series[series.length - 1];
  const monthAgoTs = Date.now() - 30 * 86400000;
  const monthAgo =
    [...series].reverse().find((s) => new Date(s.date).getTime() <= monthAgoTs) ?? series[0];

  // allocation from latest asset valuations
  const byClass = new Map<string, number>();
  for (const a of accounts) {
    if (a.class !== "asset" || a.valuations.length === 0) continue;
    const v = a.valuations[a.valuations.length - 1].value;
    byClass.set(a.assetClass, (byClass.get(a.assetClass) ?? 0) + v);
  }
  const totalAssets = [...byClass.values()].reduce((s, v) => s + v, 0);
  const allocation = [...byClass.entries()]
    .map(([k, v]) => ({ class: CLASS_LABELS[k] ?? k, value: Math.round(v), pct: (v / totalAssets) * 100 }))
    .sort((a, b) => b.value - a.value);

  // freshness from connections
  const conns = new Map<string, { label: string; lastFetchAt: Date | null; status: string }>();
  for (const a of accounts)
    if (a.connection && a.connection.provider !== "manual")
      conns.set(a.connection.id, a.connection);
  const stale: { label: string; daysAgo: number }[] = [];
  let synced = 0;
  for (const c of conns.values()) {
    const days = c.lastFetchAt ? Math.floor((Date.now() - c.lastFetchAt.getTime()) / 86400000) : 999;
    if (c.status === "active" && days <= 2) synced++;
    else stale.push({ label: c.label, daysAgo: days });
  }

  return {
    netWorth: latest.netWorth,
    totalAssets: latest.assets,
    totalLiabilities: latest.liabilities,
    changeMonth: latest.netWorth - monthAgo.netWorth,
    changeMonthPct: monthAgo.netWorth ? (latest.netWorth - monthAgo.netWorth) / monthAgo.netWorth : 0,
    series,
    allocation,
    freshness: { synced, total: conns.size, stale },
  };
}
