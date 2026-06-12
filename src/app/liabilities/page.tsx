import { AmortizationChart } from "@/components/charts";
import { Money } from "@/components/Money";
import { Card, ProgressBar } from "@/components/ui";
import { getLiabilities } from "@/lib/data/liabilities";
import { resolveScope } from "@/lib/data/scope";

export const dynamic = "force-dynamic";

export default async function LiabilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const scope = await resolveScope(scopeParam);
  const liab = await getLiabilities(scope);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">
          Liabilities · <Money value={liab.totalDebt} compact={false} />
        </h1>
        <div className="text-sm text-ink-soft tnum">
          EMIs <Money value={liab.totalEmi} className="font-medium" />/mo · FOIR{" "}
          <span className={liab.foir > 0.45 ? "text-loss font-medium" : "font-medium"}>
            {(liab.foir * 100).toFixed(0)}%
          </span>{" "}
          of take-home
        </div>
      </div>

      <p className="text-xs text-ink-faint">
        Loans ordered by interest rate (avalanche order) — prepay from the top.
      </p>

      {liab.loans.map((l) => (
        <Card key={l.accountId}>
          <div className="flex items-baseline justify-between flex-wrap gap-1">
            <div>
              <span className="font-semibold">{l.name}</span>
              <span
                className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  l.interestRate > 12 ? "bg-loss-soft text-loss" : "bg-brand-soft text-brand"
                }`}
              >
                {l.interestRate}%
              </span>
            </div>
            <Money value={l.outstanding} compact={false} className="font-semibold" />
          </div>
          <div className="grid sm:grid-cols-4 gap-3 mt-3 text-sm">
            <div>
              <div className="text-[11px] text-ink-faint uppercase">EMI</div>
              <Money value={l.emi} className="font-medium" /> <span className="text-xs text-ink-faint">on the {l.emiDay}th</span>
            </div>
            <div>
              <div className="text-[11px] text-ink-faint uppercase">Remaining</div>
              <span className="font-medium tnum">
                {Math.floor(l.remainingMonths / 12)}y {l.remainingMonths % 12}m
              </span>
            </div>
            <div>
              <div className="text-[11px] text-ink-faint uppercase">Interest left</div>
              <Money value={l.totalInterestRemaining} className="font-medium" />
            </div>
            <div>
              <div className="text-[11px] text-ink-faint uppercase">₹10k/mo extra saves</div>
              <span className="font-medium tnum">
                <Money value={l.prepay10k.interestSaved} /> · {l.prepay10k.monthsSaved} months
              </span>
            </div>
          </div>
          <div className="mt-3">
            <AmortizationChart data={l.schedule} />
          </div>
        </Card>
      ))}

      {liab.cards.map((c) => (
        <Card key={c.accountId}>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{c.name}</span>
            <Money value={c.outstanding} compact={false} className="font-semibold" />
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-ink-soft">
              <span>
                Utilization{" "}
                <span className={c.utilization > 0.3 ? "text-warn font-semibold" : "font-semibold"}>
                  {(c.utilization * 100).toFixed(0)}%
                </span>{" "}
                of <Money value={c.creditLimit} />
              </span>
              <span>
                due on the {c.dueDay}th · {c.apr}% APR if revolved
              </span>
            </div>
            <ProgressBar pct={c.utilization * 100} danger={c.utilization > 0.3} />
            {c.utilization > 0.3 && (
              <p className="text-xs text-warn mt-1">
                Above the 30% line that credit bureaus penalize — pay down before statement day.
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
