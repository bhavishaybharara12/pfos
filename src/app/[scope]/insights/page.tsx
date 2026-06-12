import { ScoreHistoryChart } from "@/components/charts";
import { InsightList } from "@/components/InsightList";
import { Card, CardTitle, ScoreRing } from "@/components/ui";
import { getBrief, getHealth, getInsights } from "@/lib/data/insights";
import { resolveScope, scopeParams } from "@/lib/data/scope";

export const generateStaticParams = scopeParams;

export default async function InsightsPage({ params }: { params: Promise<{ scope: string }> }) {
  const { scope: scopeSlug } = await params;
  const scope = await resolveScope(scopeSlug);
  const [insights, health, brief] = await Promise.all([
    getInsights(scope),
    getHealth(scope),
    getBrief(scope),
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Copilot</h1>

      <Card className="border-l-4 border-l-brand">
        <CardTitle>Today&apos;s brief</CardTitle>
        <p className="text-sm leading-relaxed">{brief.text}</p>
        <p className="text-[11px] text-ink-faint mt-2">
          Deterministic rules decide; the narration layer is a template in this demo (Claude-narrated
          in production — numbers always come from the engines, never the model).
        </p>
      </Card>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="flex items-center gap-4">
          <ScoreRing value={health.total} label={health.band} size={96} />
          <div className="text-xs text-ink-soft space-y-1">
            {health.components
              .filter((c) => c.score !== null)
              .sort((a, b) => (a.score as number) - (b.score as number))
              .slice(0, 3)
              .map((c) => (
                <div key={c.key}>
                  {c.label}: <span className="font-medium tnum">{Math.round(c.score as number)}</span>/100
                </div>
              ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>Score history</CardTitle>
          <ScoreHistoryChart data={health.history} />
        </Card>
      </div>

      <InsightList insights={insights} />
    </div>
  );
}
