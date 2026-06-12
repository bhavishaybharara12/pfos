import { AllocationDonut } from "@/components/charts";
import { Money } from "@/components/Money";
import { Card, CardTitle, ConfidenceDot } from "@/components/ui";
import { getAssetGroups } from "@/lib/data/holdings";
import { getNetWorth } from "@/lib/data/networth";
import { resolveScope, scopeParams } from "@/lib/data/scope";
import { pct } from "@/lib/format";

export const generateStaticParams = scopeParams;

const TYPE_LABEL: Record<string, string> = {
  mf_folio: "Mutual Funds",
  demat: "Stocks",
  savings_account: "Cash",
  fixed_deposit: "Deposits",
  epf: "EPF",
  ppf: "PPF",
  nps_tier1: "NPS",
  esop_grant: "ESOPs",
  real_estate: "Real Estate",
  vehicle: "Vehicle",
  gold_jewellery: "Gold",
};

export default async function AssetsPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: scopeSlug } = await params;
  const scope = await resolveScope(scopeSlug);
  const [groups, nw] = await Promise.all([getAssetGroups(scope), getNetWorth(scope)]);
  const total = groups.reduce((s, g) => s + g.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">
          Assets · <Money value={total} compact={false} />
        </h1>
        <span className="text-xs text-ink-faint">{scope.label} scope</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardTitle>Allocation</CardTitle>
          <AllocationDonut data={nw.allocation} />
        </Card>
        <Card>
          <CardTitle>By asset class</CardTitle>
          <div className="space-y-2 text-sm">
            {nw.allocation.map((a) => (
              <div key={a.class} className="flex items-center justify-between">
                <span>{a.class}</span>
                <span className="tnum">
                  <Money value={a.value} className="font-medium" />{" "}
                  <span className="text-ink-faint text-xs w-12 inline-block text-right">
                    {a.pct.toFixed(1)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-3 leading-relaxed">
            True-exposure X-ray (looking through fund portfolios) ships in V1.1 — current view uses
            each account&apos;s dominant class.
          </p>
        </Card>
      </div>

      {groups.map((g) => (
        <Card key={g.accountId}>
          <div className="flex items-baseline justify-between flex-wrap gap-1">
            <div>
              <span className="font-semibold">{TYPE_LABEL[g.type] ?? g.type}</span>
              <span className="text-ink-soft text-sm ml-2">{g.name}</span>
              <ConfidenceDot confidence={g.confidence} />
            </div>
            <div className="text-sm tnum">
              <Money value={g.value} className="font-semibold" />
              {g.invested !== null && g.invested > 0 && (
                <span className={`ml-3 text-xs ${g.value >= g.invested ? "text-gain" : "text-loss"}`}>
                  {g.value >= g.invested ? "▲" : "▼"} <Money value={Math.abs(g.value - g.invested)} />
                </span>
              )}
              {g.xirr !== null && (
                <span className="ml-3 text-xs text-ink-soft">XIRR {pct(g.xirr)}</span>
              )}
            </div>
          </div>
          {g.connectionLabel && (
            <div className="text-[11px] text-ink-faint mt-0.5">
              via {g.connectionLabel}
              {g.dataQuality !== null && ` · data quality ${g.dataQuality}/100`}
            </div>
          )}
          {g.holdings.length > 0 && (
            <table className="w-full mt-3 text-sm">
              <thead>
                <tr className="text-[11px] text-ink-faint uppercase tracking-wide text-left">
                  <th className="font-medium py-1">Holding</th>
                  <th className="font-medium py-1 text-right">Value</th>
                  <th className="font-medium py-1 text-right hidden sm:table-cell">Invested</th>
                  <th className="font-medium py-1 text-right">Gain</th>
                  <th className="font-medium py-1 text-right">XIRR</th>
                </tr>
              </thead>
              <tbody>
                {g.holdings.map((h) => (
                  <tr key={h.instrument} className="border-t border-line">
                    <td className="py-1.5">
                      {h.instrument}
                      {h.sector && <span className="text-[10px] text-ink-faint ml-2">{h.sector}</span>}
                      {h.expenseRatio !== null && (
                        <span className="text-[10px] text-ink-faint ml-2">ER {h.expenseRatio}%</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right tnum">
                      <Money value={h.value} />
                    </td>
                    <td className="py-1.5 text-right tnum text-ink-soft hidden sm:table-cell">
                      <Money value={h.invested} />
                    </td>
                    <td className={`py-1.5 text-right tnum ${h.gain >= 0 ? "text-gain" : "text-loss"}`}>
                      {h.gain >= 0 ? "+" : ""}
                      {pct(h.gainPct, 0)}
                    </td>
                    <td className="py-1.5 text-right tnum text-ink-soft">
                      {h.xirr !== null ? pct(h.xirr) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ))}
    </div>
  );
}
