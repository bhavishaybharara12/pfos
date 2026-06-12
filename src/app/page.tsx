import Link from "next/link";
import { NetWorthChart } from "@/components/charts";
import { Money } from "@/components/Money";
import { Card, CardTitle, FreshnessBadge, ProgressBar, ScoreRing, TrendChip } from "@/components/ui";
import { getBrief, getHealth, getInsights } from "@/lib/data/insights";
import { getCashflow } from "@/lib/data/cashflow";
import { getGoals, getRetirement } from "@/lib/data/goals";
import { getNetWorth } from "@/lib/data/networth";
import { resolveScope } from "@/lib/data/scope";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const scope = await resolveScope(scopeParam);
  const [nw, cash, health, retirement, goals, brief, insights] = await Promise.all([
    getNetWorth(scope),
    getCashflow(scope),
    getHealth(scope),
    getRetirement(scope),
    getGoals(scope),
    getBrief(scope),
    getInsights(scope),
  ]);
  const credit = await db.creditReport.findFirst({
    where: { personId: { in: scope.personIds } },
    orderBy: { pulledAt: "desc" },
  });
  const openInsights = insights.filter((i) => i.status === "open");
  const month = cash.lastFull;

  return (
    <div className="space-y-5">
      {/* hero */}
      <Card>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle>Net Worth · {scope.label}</CardTitle>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tracking-tight">
                <Money value={nw.netWorth} compact={false} />
              </span>
              <TrendChip value={nw.changeMonthPct * 100} suffix="%" />
              <span className="text-sm text-ink-soft">
                <Money value={nw.changeMonth} signed /> this month
              </span>
            </div>
            <div className="text-sm text-ink-soft mt-1">
              Assets <Money value={nw.totalAssets} className="font-medium" /> · Liabilities{" "}
              <Money value={nw.totalLiabilities} className="font-medium" />
            </div>
          </div>
          <FreshnessBadge synced={nw.freshness.synced} total={nw.freshness.total} />
        </div>
        <div className="mt-4">
          <NetWorthChart data={nw.series} />
        </div>
      </Card>

      {/* stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-center gap-4">
          <ScoreRing value={health.total} label={health.band} />
          <div>
            <CardTitle>Health Score</CardTitle>
            {health.biggestDrag && (
              <div className="text-xs text-ink-soft leading-snug">
                biggest drag:
                <br />
                <Link href="/insights" className="text-brand font-medium">
                  {health.biggestDrag.label} →
                </Link>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardTitle>Cash Flow · {month.month}</CardTitle>
          <div className="text-sm space-y-1 tnum">
            <div className="flex justify-between">
              <span className="text-ink-soft">In</span>
              <Money value={month.income} className="font-medium" />
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Out</span>
              <Money value={month.expenses} className="font-medium" />
            </div>
            <div className="flex justify-between border-t border-line pt-1">
              <span className="text-ink-soft">Saved</span>
              <span className="font-semibold text-gain">{(month.savingsRate * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Credit Score</CardTitle>
          <div className="text-3xl font-semibold tnum">{credit?.score ?? "—"}</div>
          <div className="text-xs text-ink-soft mt-1">
            {credit?.bureau} · utilization {credit ? `${(credit.utilization * 100).toFixed(0)}%` : "—"}
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <ScoreRing value={retirement.plan.fundedPct} label="funded" />
          <div>
            <CardTitle>Retirement</CardTitle>
            <div className="text-xs text-ink-soft leading-snug">
              {(retirement.plan.successProb * 100).toFixed(0)}% success prob
              <br />
              <Link href="/retirement" className="text-brand font-medium">
                plan →
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* copilot brief */}
      <Card className="border-l-4 border-l-brand">
        <CardTitle>
          Copilot Brief —{" "}
          {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
        </CardTitle>
        <p className="text-sm leading-relaxed">{brief.text}</p>
        <div className="mt-3 flex gap-3">
          {openInsights[0]?.cta && (
            <Link
              href={openInsights[0].cta.href}
              className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-md"
            >
              {openInsights[0].cta.label}
            </Link>
          )}
          <Link href="/insights" className="text-xs font-medium text-brand px-3 py-1.5">
            See all {openInsights.length} insights →
          </Link>
        </div>
      </Card>

      {/* goals + upcoming */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Goals</CardTitle>
          <div className="space-y-3">
            {goals.map((g) => (
              <Link key={g.id} href="/goals" className="block group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="group-hover:text-brand">{g.name}</span>
                  <span className="tnum text-ink-soft">{g.plan.fundedPct.toFixed(0)}%</span>
                </div>
                <ProgressBar pct={g.plan.fundedPct} danger={g.plan.successProb < 0.7} />
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Upcoming · next 35 days</CardTitle>
          <div className="space-y-2 text-sm">
            {brief.obligations.slice(0, 6).map((o, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-ink-soft">
                  <span className="tnum font-medium text-ink mr-2">{shortDate(o.date)}</span>
                  {o.label}
                </span>
                <Money value={o.amount} className="font-medium" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
