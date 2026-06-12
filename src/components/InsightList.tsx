"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import type { Insight } from "@/lib/data/insights";
import { getActions, getServerActions, setAction, subscribe } from "@/lib/insightStore";
import { compactINR } from "@/lib/format";
import { Card, SeverityBadge } from "./ui";

export function InsightList({ insights }: { insights: Insight[] }) {
  const pathname = usePathname();
  const scopeBase = `/${pathname.split("/").filter(Boolean)[0] ?? "family"}`;
  const actions = useSyncExternalStore(subscribe, getActions, getServerActions);
  const [showEvidence, setShowEvidence] = useState<string | null>(null);

  const withStatus = insights.map((i) => ({
    ...i,
    status: (actions[i.ruleCode] as Insight["status"]) ?? "open",
  }));
  const open = withStatus.filter((i) => i.status === "open");
  const handled = withStatus.filter((i) => i.status !== "open");

  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
        {open.length} open insights · ranked by severity and ₹ impact
      </div>
      {open.map((i) => (
        <Card key={i.ruleCode} className="!p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={i.severity} />
                {i.impactPerYear !== null && (
                  <span className="text-[10px] font-semibold text-gain bg-gain-soft px-2 py-0.5 rounded-full">
                    ~{compactINR(i.impactPerYear)}/yr impact
                  </span>
                )}
                <span className="text-[10px] text-ink-faint">{i.ruleCode}</span>
              </div>
              <div className="font-medium text-sm mt-1.5">{i.title}</div>
              <p className="text-sm text-ink-soft mt-1 leading-relaxed">{i.body}</p>
              <div className="flex items-center gap-3 mt-2">
                {i.cta && (
                  <Link href={`${scopeBase}${i.cta.href}`} className="text-xs font-medium text-brand">
                    {i.cta.label} →
                  </Link>
                )}
                <button
                  className="text-xs text-ink-faint hover:text-ink"
                  onClick={() => setShowEvidence(showEvidence === i.ruleCode ? null : i.ruleCode)}
                >
                  why am I seeing this?
                </button>
              </div>
              {showEvidence === i.ruleCode && (
                <pre className="text-[11px] bg-paper border border-line rounded-md p-2 mt-2 overflow-x-auto">
                  {JSON.stringify(i.evidence, null, 2)}
                </pre>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setAction(i.ruleCode, "acted")}
                className="text-xs px-3 py-1 rounded-md bg-ink text-white"
              >
                Mark acted
              </button>
              <button
                onClick={() => setAction(i.ruleCode, "dismissed")}
                className="text-xs px-3 py-1 rounded-md border border-line text-ink-soft"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Card>
      ))}
      {handled.length > 0 && (
        <>
          <div className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase pt-2">
            Handled
          </div>
          {handled.map((i) => (
            <Card key={i.ruleCode} className="!p-3 opacity-60">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="text-[10px] uppercase font-semibold mr-2">{i.status}</span>
                  {i.title}
                </span>
                <button onClick={() => setAction(i.ruleCode, "open")} className="text-xs text-brand shrink-0">
                  Reopen
                </button>
              </div>
            </Card>
          ))}
        </>
      )}
      <p className="text-[11px] text-ink-faint pt-2">
        Class E/A educational insights only (docs/06 SEBI taxonomy) — fund-specific recommendations
        require RIA registration and ship gated in V2. Act/dismiss state is stored on this device.
      </p>
    </div>
  );
}
