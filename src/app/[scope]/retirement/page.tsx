import { FanChart } from "@/components/charts";
import { Money } from "@/components/Money";
import { Card, CardTitle, ScoreRing } from "@/components/ui";
import { getRetirement } from "@/lib/data/goals";
import { resolveScope, scopeParams } from "@/lib/data/scope";

export const generateStaticParams = scopeParams;

export default async function RetirementPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: scopeSlug } = await params;
  const scope = await resolveScope(scopeSlug);
  const r = await getRetirement(scope);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Retirement & FIRE</h1>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="flex items-center gap-5">
          <ScoreRing value={r.plan.readinessScore} label="readiness" size={96} />
          <div className="text-sm space-y-1">
            <div>
              <span className="text-ink-faint text-xs uppercase block">Corpus needed</span>
              <Money value={r.plan.corpusNeeded} className="font-semibold text-lg" />
            </div>
            <div>
              <span className="text-ink-faint text-xs uppercase block">Projected (median)</span>
              <Money value={r.plan.projectedCorpusP50} className="font-semibold text-lg" />
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Assumptions</CardTitle>
          <div className="text-sm space-y-1 text-ink-soft">
            <div>Age {r.inputs.currentAge} → retire at {r.inputs.retirementAge}, plan to 90</div>
            <div>
              Expenses <Money value={r.inputs.monthlyExpenses} />/mo today · 80% continue · 6% inflation
            </div>
            <div>
              Investing <Money value={r.monthlySip} />/mo (+5%/yr) · 11% pre / 8% post returns
            </div>
            <div>
              Earmarked corpus today: <Money value={r.currentCorpus} className="font-medium text-ink" />
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Success probability</CardTitle>
          <div className="text-4xl font-semibold tnum">
            {(r.plan.successProb * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-ink-soft mt-1 leading-relaxed">
            of 2,000 simulated market paths reach the corpus by {new Date().getFullYear() + (r.inputs.retirementAge - r.inputs.currentAge)}.
            Monthly expense at retirement: <Money value={r.plan.monthlyExpenseAtRetirement} />.
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Projection fan · 10th–90th percentile</CardTitle>
        <FanChart data={r.plan.mc.fan} target={r.plan.corpusNeeded} />
        <p className="text-[11px] text-ink-faint mt-2">
          Dashed line = corpus needed. Try levers in <a href={`/${scope.key}/simulate`} className="text-brand">Simulate</a> —
          every recommendation is shown, not asserted.
        </p>
      </Card>

      <Card>
        <CardTitle>FIRE</CardTitle>
        <div className="grid sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[11px] text-ink-faint uppercase">FIRE number (3.5% SWR)</div>
            <Money value={r.fire.fireNumber} className="font-semibold text-lg" />
            <div className="text-xs text-ink-soft tnum mt-0.5">{r.fire.fundedPct.toFixed(0)}% funded</div>
          </div>
          <div>
            <div className="text-[11px] text-ink-faint uppercase">Lean FIRE</div>
            <Money value={r.fire.leanFireNumber} className="font-medium" />
          </div>
          <div>
            <div className="text-[11px] text-ink-faint uppercase">Fat FIRE</div>
            <Money value={r.fire.fatFireNumber} className="font-medium" />
          </div>
          <div>
            <div className="text-[11px] text-ink-faint uppercase">Years to FIRE</div>
            <span className="font-semibold text-lg tnum">
              {r.fire.yearsToFire ?? "—"}
            </span>
            {r.fire.fireAge && <span className="text-xs text-ink-soft ml-1">(age {r.fire.fireAge})</span>}
          </div>
        </div>
        <p className="text-xs text-ink-soft mt-3">
          {r.fire.coastReached
            ? "You've passed Coast FIRE — existing corpus alone compounds to your FIRE number by 60. New savings now buy earlier freedom."
            : `Coast FIRE needs ${"" /* inline money below */}`}
          {!r.fire.coastReached && <Money value={r.fire.coastFireNumber} className="font-medium" />}
          {!r.fire.coastReached && " invested today — past that point, compounding alone gets you there by 60."}
        </p>
      </Card>
    </div>
  );
}
