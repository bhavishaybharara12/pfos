"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compactINR } from "@/lib/format";
import { FanChart } from "./charts";
import { Card, CardTitle } from "./ui";

interface SimResult {
  base: { corpusNeeded: number; projected: number; successProb: number; readiness: number; fan: FanPoint[] };
  scenario: { corpusNeeded: number; projected: number; successProb: number; readiness: number; fan: FanPoint[] };
  inputs: { retirementAge: number; extraMonthly: number; currentAge: number };
}
interface FanPoint { month: number; p10: number; p25: number; p50: number; p75: number; p90: number }

interface PurchaseResult {
  verdict: {
    verdict: "Comfortable" | "Stretch" | "Risky";
    comfortableRange: [number, number];
    newEmi: number;
    foirAfter: number;
    breachesEmergencyFund: boolean;
    notes: string[];
  };
  retirementImpact: { successProbBase: number; successProbAfter: number; corpusDelta: number };
}

export function SimulateStudio() {
  const [tab, setTab] = useState<"whatif" | "purchase">("whatif");

  // what-if state
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [retirementAge, setRetirementAge] = useState(55);
  const [crash, setCrash] = useState(false);
  const [purchaseAmt, setPurchaseAmt] = useState(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    setLoading(true);
    fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "whatif",
        extraMonthly,
        retirementAge,
        marketCrash: crash,
        oneTimePurchase: purchaseAmt > 0 ? { amount: purchaseAmt, inMonths: 12 } : undefined,
      }),
    })
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  }, [extraMonthly, retirementAge, crash, purchaseAmt]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [run]);

  // purchase state
  const [pKind, setPKind] = useState<"car" | "house" | "vacation">("car");
  const [pPrice, setPPrice] = useState(2000000);
  const [pFunding, setPFunding] = useState<"loan" | "cash">("loan");
  const [pResult, setPResult] = useState<PurchaseResult | null>(null);
  const [pLoading, setPLoading] = useState(false);

  const runPurchase = () => {
    setPLoading(true);
    fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "purchase",
        purchase: {
          kind: pKind,
          price: pPrice,
          funding: pFunding,
          loanRatePct: pKind === "house" ? 8.75 : 9.5,
          loanTenureMonths: pKind === "house" ? 240 : 60,
          downPaymentPct: 0.2,
        },
      }),
    })
      .then((r) => r.json())
      .then(setPResult)
      .finally(() => setPLoading(false));
  };

  const delta = result
    ? (result.scenario.successProb - result.base.successProb) * 100
    : 0;

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
                  {result ? `${(result.scenario.successProb * 100).toFixed(0)}%` : "…"}
                </div>
                {result && (
                  <div className={`text-xs font-medium mt-1 ${delta >= 0 ? "text-gain" : "text-loss"}`}>
                    {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}pp vs base ({(result.base.successProb * 100).toFixed(0)}%)
                  </div>
                )}
              </Card>
              <Card>
                <CardTitle>Projected corpus (median)</CardTitle>
                <div className="text-3xl font-semibold tnum">
                  {result ? compactINR(result.scenario.projected) : "…"}
                </div>
                {result && (
                  <div className="text-xs text-ink-soft mt-1">
                    needs {compactINR(result.scenario.corpusNeeded)}
                  </div>
                )}
              </Card>
              <Card>
                <CardTitle>Readiness score</CardTitle>
                <div className="text-3xl font-semibold tnum">
                  {result ? result.scenario.readiness : "…"}
                </div>
                {result && (
                  <div className="text-xs text-ink-soft mt-1">base {result.base.readiness}</div>
                )}
              </Card>
            </div>
            <Card className={loading ? "opacity-60" : ""}>
              <CardTitle>Scenario fan vs target</CardTitle>
              {result ? (
                <FanChart data={result.scenario.fan} target={result.scenario.corpusNeeded} />
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
            <button
              onClick={runPurchase}
              disabled={pLoading}
              className="w-full bg-brand text-white rounded-md py-2 text-sm font-medium disabled:opacity-50"
            >
              {pLoading ? "Checking affordability…" : "Get verdict"}
            </button>
          </Card>

          <div className="space-y-5">
            {pResult ? (
              <>
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
                      {(pResult.retirementImpact.successProbAfter * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-ink-soft">
                      success prob (was {(pResult.retirementImpact.successProbBase * 100).toFixed(0)}%)
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <Card className="h-40 flex items-center justify-center text-ink-faint text-sm">
                Set a price and get your affordability verdict.
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
