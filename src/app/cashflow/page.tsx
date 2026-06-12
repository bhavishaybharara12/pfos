import { CashflowBars, CategoryBars } from "@/components/charts";
import { Money } from "@/components/Money";
import { Card, CardTitle } from "@/components/ui";
import { getCashflow } from "@/lib/data/cashflow";
import { resolveScope } from "@/lib/data/scope";

export const dynamic = "force-dynamic";

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const scope = await resolveScope(scopeParam);
  const cash = await getCashflow(scope);
  const m = cash.lastFull;

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Cash Flow · {m.month}</h1>
        <div className="text-sm tnum text-ink-soft">
          In <Money value={m.income} className="font-medium text-ink" /> · Out{" "}
          <Money value={m.expenses} className="font-medium text-ink" /> · Invested{" "}
          <Money value={m.invested} className="font-medium text-ink" /> · Saved{" "}
          <span className="font-semibold text-gain">{(m.savingsRate * 100).toFixed(0)}%</span>
        </div>
      </div>

      <Card>
        <CardTitle>Trailing months</CardTitle>
        <CashflowBars data={cash.months.slice(0, -1)} />
        <p className="text-[11px] text-ink-faint mt-2">
          Internal transfers and card autopay are excluded (transfer pairing) — spends are counted
          once, at the card transaction. Savings rate = (income − expenses) / income; investments
          count as savings.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Where it went · {m.month}</CardTitle>
          <CategoryBars data={m.byCategory} />
        </Card>
        <Card>
          <CardTitle>Recurring detected</CardTitle>
          <div className="space-y-2 text-sm">
            {cash.recurring.slice(0, 9).map((r) => (
              <div key={r.merchant} className="flex justify-between">
                <span>
                  {r.merchant}
                  <span className="text-[10px] text-ink-faint ml-2">{r.category}</span>
                </span>
                <span className="tnum text-ink-soft">
                  ~<Money value={r.avgAmount} />/mo
                </span>
              </div>
            ))}
          </div>
          {cash.anomalies.length > 0 && (
            <>
              <div className="text-[11px] font-semibold tracking-wider text-warn uppercase mt-5 mb-2">
                Anomalies
              </div>
              {cash.anomalies.map((a, i) => (
                <div key={i} className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">{a.category}</span> hit{" "}
                  <Money value={a.amount} className="font-medium text-ink" /> in {a.month} vs{" "}
                  <Money value={a.baseline} /> average — trip, annual fee, or new habit?
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
