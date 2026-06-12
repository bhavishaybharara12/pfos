"use client";

// What-if studio + purchase advisor. All math runs in the browser with the same
// engine package the server uses (pfos/05 §"shared TS engines") — sliders are
// instant and the static export needs no API.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  advisePurchase,
  monteCarlo,
  planRetirement,
  type MonteCarloResult,
  type RetirementResult,
} from "@/lib/engines";
import { compactINR } from "@/lib/format";
import { FanChart } from "./charts";
import { Card, CardTitle } from "./ui";

export interface SimBase {
  currentAge: number;
  retirementAgeDefault: number;
  monthlyExpenses: number;
  currentCorpus: number;
  monthlySip: number;
  incomeMonthly: number;
  existingEmis: number;
  essentialMonthly: number;
  liquidAssets: number;
}

interface Scenario {
  plan: RetirementResult;
  mc: MonteCarloResult;
}

function runScenario(
  base: SimBase,
  opts: { extraMonthly: number; retirementAge: number; crash: boolean; purchaseAmt: number },
): Scenario {
  const plan = planRetirement({
    currentAge: base.currentAge,
    retirementAge: opts.retirementAge,
    monthlyExpensesNow: base.monthlyExpenses,
    preReturn: 0.11,
    currentCorpus: base.currentCorpus,
    monthlyInvestment: Math.max(0, base.monthlySip + opts.extraMonthly),
  });
  const yearsToRetire = Math.max(1, opts.retirementAge - base.currentAge);
  const mc = monteCarlo(
    {
      startCorpus: opts.crash ? base.currentCorpus * 0.74 : base.currentCorpus,
      monthlyContribution: Math.max(0, base.monthlySip + opts.extraMonthly),
      contributionStepUpAnnual: 0.05,
      contributionYears: yearsToRetire,
      totalYears: yearsToRetire,
      annualReturn: 0.11,
      annualVol: 0.13,
      oneTimeFlows:
        opts.purchaseAmt > 0 ? [{ month: 12, amount: -opts.purchaseAmt }] : undefined,
    },
    plan.corpusNeeded,
  );
  return { plan, mc };
}

export function SimulateStudio({ base }: { base: SimBase }) {
  const [tab, setTab] = useState<"whatif" | "purchase">("whatif");

  // what-if state
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [retirementAge, setRetirementAge] = useState(base.retirementAgeDefault);
  const [crash, setCrash] = useState(false);
  const [purchaseAmt, setPurchaseAmt] = useState(0);
  const [result, setResult] = useState<Scenario | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseline = useMemo(
    () =>
      runScenario(base, {
        extraMonthly: 0,
        retirementAge: base.retirementAgeDefault,
        crash: false,
        purchaseAmt: 0,
      }),
    [base],
  );

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(runScenario(base, { extraMonthly, retirementAge, crash, purchaseAmt }));
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [base, extraMonthly, retirementAge, crash, purchaseAmt]);

  // purchase state
  const [pKind, setPKind] = useState<"car" | "house" | "vacation">("car");
  const [pPrice, setPPrice] = useState(2000000);
  const [pFunding, setPFunding] = useState<"loan" | "cash">("loan");

  const pResult = useMemo(() => {
    const verdict = advisePurchase({
      kind: pKind,
      price: pPrice,
      funding: pFunding,
      loanRatePct: pKind === "house" ? 8.75 : 9.5,
      loanTenureMonths: pKind === "house" ? 240 : 60,
      downPaymentPct: 0.2,
      monthlyTakeHome: base.incomeMonthly,
      annualTakeHome: base.incomeMonthly * 12,
      existingEmis: base.existingEmis,
      liquidAssets: base.liquidAssets,
      emergencyFundTarget: base.essentialMonthly * 6,
    });
    const after = planRetirement({
      currentAge: base.currentAge,
      retirementAge: base.retirementAgeDefault,
      monthlyExpensesNow: base.monthlyExpenses,
      preReturn: 0.11,
      currentCorpus: base.currentCorpus,
      monthlyInvestment: Math.max(0, base.monthlySip - verdict.newEmi),
    });
    return { verdict, successProbBase: baseline.mc.successProb, successProbAfter: after.successProb };
  }, [pKind, pPrice, pFunding, base, baseline]);

  const delta = result ? (result.mc.successProb - baseline.mc.successProb) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["whatif", "purchase"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === t ? "bg-ink text-white" : "bg-card border border-line text-ink-soft"
            }`}
          >
            {t === "whatif" ? "What-if studio" : "Major purchase advisor"}
          </button>
        ))}
      </div>

      {tab === "whatif" && (
        <div className="grid lg:grid-cols-[300px_1fr] gap-5">
          <Card className="space-y-5 h-fit">
            <div>
              <label className="text-xs font-medium text-ink-soft flex justify-between">
                Extra monthly investment
                <span className="tnum text-ink font-semibold">{compactINR(extraMonthly)}</span>
              </label>
              <input
                type="range" min={-50000} max={100000} step={5000}
                value={extraMonthly}
                onChange={(e) => setExtraMonthly(+e.target.value)}
                className="w-full accent-(--color-brand)"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft flex justify-between">
                Retirement age
                <span className="tnum text-ink font-semibold">{retirementAge}</span>
              </label>
              <input
                type="range" min={45} max={65} step={1}
                value={retirementAge}
                onChange={(e) => setRetirementAge(+e.target.value)}
                className="w-full accent-(--color-brand)"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft flex justify-between">
                One-time purchase next year
                <span className="tnum text-ink font-semibold">{compactINR(purchaseAmt)}</span>
              </label>
              <input
                type="range" min={0} max={5000000} step={100000}
                value={purchaseAmt}
                onChange={(e) => setPurchaseAmt(+e.target.value)}
                className="w-full accent-(--color-brand)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={crash} onChange={(e) => setCrash(e.target.checked)} className="accent-(--color-loss)" />
              −35% equity crash tomorrow
            </label>
          </Card>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-5">
              <Card>
                <CardTitle>Success probability</CardTitle>
                <div className="text-3xl font-semibold tnum">
                  {result ? `${(result.mc.successProb * 100).toFixed(0)}%` : "…"}
                </div>
                {result && (
                  <div className={`text-xs font-medium mt-1 ${delta >= 0 ? "text-gain" : "text-loss"}`}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}pp vs base (
                    {(baseline.mc.successProb * 100).toFixed(0)}%)
                  </div>
                )}
              </Card>
              <Card>
                <CardTitle>Projected corpus (median)</CardTitle>
                <div className="text-3xl font-semibold tnum">
                  {result ? compactINR(result.mc.terminalP50) : "…"}
                </div>
                {result && (
                  <div className="text-xs text-ink-soft mt-1">
                    needs {compactINR(result.plan.corpusNeeded)}
                  </div>
                )}
              </Card>
              <Card>
                <CardTitle>Readiness score</CardTitle>
                <div className="text-3xl font-semibold tnum">
                  {result ? result.plan.readinessScore : "…"}
                </div>
                {result && (
                  <div className="text-xs text-ink-soft mt-1">base {baseline.plan.readinessScore}</div>
                )}
              </Card>
            </div>
            <Card>
              <CardTitle>Scenario fan vs target</CardTitle>
              {result ? (
                <FanChart data={result.mc.fan} target={result.plan.corpusNeeded} />
              ) : (
                <div className="h-60 flex items-center justify-center text-ink-faint text-sm">
                  Running simulation…
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "purchase" && (
        <div className="grid lg:grid-cols-[300px_1fr] gap-5">
          <Card className="space-y-4 h-fit">
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">I want to buy a</label>
              <div className="flex gap-2">
                {(["car", "house", "vacation"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setPKind(k)}
                    className={`px-3 py-1 rounded-md text-sm capitalize ${
                      pKind === k ? "bg-ink text-white" : "border border-line text-ink-soft"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft flex justify-between">
                Price <span className="tnum text-ink font-semibold">{compactINR(pPrice)}</span>
              </label>
              <input
                type="range"
                min={200000}
                max={pKind === "house" ? 30000000 : 5000000}
                step={100000}
                value={pPrice}
                onChange={(e) => setPPrice(+e.target.value)}
                className="w-full accent-(--color-brand)"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">Funding</label>
              <div className="flex gap-2">
                {(["loan", "cash"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPFunding(f)}
                    className={`px-3 py-1 rounded-md text-sm capitalize ${
                      pFunding === f ? "bg-ink text-white" : "border border-line text-ink-soft"
                    }`}
                  >
                    {f === "loan" ? "Loan (20% down)" : "Cash"}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card
              className={`border-l-4 ${
                pResult.verdict.verdict === "Comfortable"
                  ? "border-l-gain"
                  : pResult.verdict.verdict === "Stretch"
                    ? "border-l-warn"
                    : "border-l-loss"
              }`}
            >
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-2xl font-semibold ${
                    pResult.verdict.verdict === "Comfortable"
                      ? "text-gain"
                      : pResult.verdict.verdict === "Stretch"
                        ? "text-warn"
                        : "text-loss"
                  }`}
                >
                  {pResult.verdict.verdict}
                </span>
                <span className="text-sm text-ink-soft">
                  comfortable range for you: {compactINR(pResult.verdict.comfortableRange[0])} –{" "}
                  {compactINR(pResult.verdict.comfortableRange[1])}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-ink-soft list-disc pl-4">
                {pResult.verdict.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </Card>
            <div className="grid grid-cols-3 gap-5">
              <Card>
                <CardTitle>New EMI</CardTitle>
                <div className="text-2xl font-semibold tnum">
                  {compactINR(pResult.verdict.newEmi)}
                </div>
              </Card>
              <Card>
                <CardTitle>Obligations after</CardTitle>
                <div className={`text-2xl font-semibold tnum ${pResult.verdict.foirAfter > 0.45 ? "text-loss" : ""}`}>
                  {(pResult.verdict.foirAfter * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-ink-soft">of take-home (cap 45%)</div>
              </Card>
              <Card>
                <CardTitle>Retirement impact</CardTitle>
                <div className="text-2xl font-semibold tnum">
                  {(pResult.successProbAfter * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-ink-soft">
                  success prob (was {(pResult.successProbBase * 100).toFixed(0)}%)
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
