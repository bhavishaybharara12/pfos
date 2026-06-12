import { SimulateStudio, type SimBase } from "@/components/SimulateStudio";
import { getCashflow } from "@/lib/data/cashflow";
import { getLiabilities } from "@/lib/data/liabilities";
import { getRetirement } from "@/lib/data/goals";
import { getNetWorth } from "@/lib/data/networth";
import { resolveScope, scopeParams } from "@/lib/data/scope";

export const generateStaticParams = scopeParams;

export default async function SimulatePage({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope: scopeSlug } = await params;
  const scope = await resolveScope(scopeSlug);
  const [retirement, cash, liab, nw] = await Promise.all([
    getRetirement(scope),
    getCashflow(scope),
    getLiabilities(scope),
    getNetWorth(scope),
  ]);

  const cashValue = nw.allocation.find((a) => a.class === "Cash")?.value ?? 0;
  const debtValue = nw.allocation.find((a) => a.class === "Debt")?.value ?? 0;

  const base: SimBase = {
    currentAge: retirement.inputs.currentAge,
    retirementAgeDefault: retirement.inputs.retirementAge,
    monthlyExpenses: retirement.inputs.monthlyExpenses,
    currentCorpus: retirement.currentCorpus,
    monthlySip: retirement.monthlySip,
    incomeMonthly: scope.persons
      .filter((p) => scope.personIds.includes(p.id))
      .reduce((s, p) => s + p.monthlyIncome, 0),
    existingEmis: liab.totalEmi,
    essentialMonthly: cash.essentialMonthly,
    liquidAssets: Math.round(cashValue + 0.25 * debtValue),
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Simulate</h1>
      <p className="text-xs text-ink-faint -mt-3">
        Every scenario runs the same Monte Carlo engine as the retirement plan (2,000 paths,
        seeded — same inputs always give the same answer), right here in your browser.
      </p>
      <SimulateStudio base={base} />
    </div>
  );
}
