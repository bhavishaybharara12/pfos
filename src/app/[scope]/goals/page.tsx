import { Money } from "@/components/Money";
import { Card, ProgressBar } from "@/components/ui";
import { getGoals } from "@/lib/data/goals";
import { resolveScope, scopeParams } from "@/lib/data/scope";
import { formatDate } from "@/lib/format";

export const generateStaticParams = scopeParams;

export default async function GoalsPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: scopeSlug } = await params;
  const scope = await resolveScope(scopeSlug);
  const goals = await getGoals(scope);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Goals</h1>
      <p className="text-xs text-ink-faint -mt-3">
        Success probability is Monte Carlo (2,000 paths) on the assets and SIPs mapped to each goal.
        Retirement & FIRE live on their own page.
      </p>

      {goals.map((g) => {
        const prob = g.plan.successProb;
        return (
          <Card key={g.id}>
            <div className="flex items-baseline justify-between flex-wrap gap-1">
              <div>
                <span className="font-semibold">{g.name}</span>
                <span className="text-xs text-ink-faint ml-2">
                  by {formatDate(g.targetDate)} · {g.yearsToTarget}y away
                </span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  prob >= 0.85
                    ? "bg-gain-soft text-gain"
                    : prob >= 0.7
                      ? "bg-warn-soft text-warn"
                      : "bg-loss-soft text-loss"
                }`}
              >
                {(prob * 100).toFixed(0)}% success probability
              </span>
            </div>

            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-ink-soft">
                <span>
                  Funded <Money value={g.currentFunding} className="font-medium text-ink" /> of{" "}
                  <Money value={g.targetAmount} /> (today&apos;s money)
                </span>
                <span className="tnum">{g.plan.fundedPct.toFixed(0)}%</span>
              </div>
              <ProgressBar pct={g.plan.fundedPct} danger={prob < 0.7} />
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div>
                <div className="text-[11px] text-ink-faint uppercase">Inflation-adjusted target</div>
                <Money value={g.plan.fvTarget} className="font-medium" />
              </div>
              <div>
                <div className="text-[11px] text-ink-faint uppercase">Current SIP mapped</div>
                <Money value={g.monthlySip} className="font-medium" />
                /mo
              </div>
              <div>
                <div className="text-[11px] text-ink-faint uppercase">
                  {g.plan.monthlyRequired > 0 ? "Additional needed" : "Status"}
                </div>
                {g.plan.monthlyRequired > 0 ? (
                  <span className="font-medium text-warn tnum">
                    +<Money value={g.plan.monthlyRequired} />
                    /mo
                  </span>
                ) : (
                  <span className="font-medium text-gain">On track ✓</span>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
