import { Card } from "@/components/ui";
import { resolveScope } from "@/lib/data/scope";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PROVIDER_INFO: Record<string, { kind: string; desc: string }> = {
  aa_finvu: { kind: "Account Aggregator", desc: "Banks, deposits, demat — RBI consent framework, daily fetch" },
  mf_central: { kind: "RTA", desc: "All mutual fund folios across CAMS + KFintech" },
  broker_zerodha: { kind: "Broker", desc: "Holdings & trades via Kite Connect" },
  cibil: { kind: "Credit bureau", desc: "Score, loans, cards, utilization — monthly soft pull" },
  epfo: { kind: "EPFO", desc: "PF balance via UAN passbook" },
  manual: { kind: "Manual", desc: "Self-tracked assets — quarterly revaluation nudges" },
};

async function getConnectionRows(scopeParam?: string) {
  const scope = await resolveScope(scopeParam);
  const connections = await db.connection.findMany({
    where: { personId: { in: scope.personIds } },
    include: { person: true, _count: { select: { accounts: true } } },
    orderBy: { dataQuality: "desc" },
  });
  const now = Date.now();
  return connections.map((c) => ({
    ...c,
    daysSinceFetch: c.lastFetchAt ? Math.floor((now - c.lastFetchAt.getTime()) / 86400000) : null,
  }));
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const connections = await getConnectionRows(scopeParam);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Connections & Consents</h1>
      <p className="text-xs text-ink-faint -mt-3">
        In production these are live AA consent artefacts, MF Central sessions, and bureau pulls
        (pfos/04). The demo simulates fetched state. Revoking a consent purges its raw data
        (crypto-shred) per RBI AA directions.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {connections.map((c) => {
          const info = PROVIDER_INFO[c.provider] ?? { kind: c.provider, desc: "" };
          const days = c.daysSinceFetch;
          const healthy = c.status === "active" && (days ?? 99) <= 2;
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{c.label}</div>
                  <div className="text-[11px] text-ink-faint">
                    {info.kind} · {c.person.fullName.split(" ")[0]} · {c._count.accounts} account
                    {c._count.accounts === 1 ? "" : "s"}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    healthy ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
                  }`}
                >
                  {healthy ? "Healthy" : c.status === "error" ? "Error" : "Stale"}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-2">{info.desc}</p>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-ink-faint">
                  {days === null ? "Never fetched" : days === 0 ? "Synced today" : `Synced ${days}d ago`}
                  {" · "}data quality{" "}
                  <span className={`font-semibold ${c.dataQuality >= 80 ? "text-gain" : c.dataQuality >= 60 ? "text-warn" : "text-loss"}`}>
                    {c.dataQuality}/100
                  </span>
                </span>
                <span className="text-brand font-medium cursor-not-allowed opacity-60" title="Demo — connectors are mocked">
                  Refresh now
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
