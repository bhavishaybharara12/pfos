// Small shared presentational pieces (server-safe).

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card border border-line rounded-xl p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase mb-2">
      {children}
    </div>
  );
}

export function TrendChip({ value, suffix = "" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
        up ? "text-gain bg-gain-soft" : "text-loss bg-loss-soft"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

export function FreshnessBadge({ synced, total }: { synced: number; total: number }) {
  const ok = synced === total;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${ok ? "text-gain" : "text-warn"}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? "bg-gain" : "bg-warn"}`} />
      {synced} of {total} sources synced
    </span>
  );
}

export function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 100) return null;
  return (
    <span className="text-[10px] text-warn ml-1" title={`Estimated value — ${confidence}% confidence`}>
      est.●{confidence}%
    </span>
  );
}

export function SeverityBadge({
  severity,
}: {
  severity: "critical" | "warning" | "opportunity" | "info";
}) {
  const map = {
    critical: "text-loss bg-loss-soft",
    warning: "text-warn bg-warn-soft",
    opportunity: "text-gain bg-gain-soft",
    info: "text-brand bg-brand-soft",
  } as const;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[severity]}`}>
      {severity}
    </span>
  );
}

export function ScoreRing({
  value,
  max = 100,
  size = 88,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  const color = frac >= 0.8 ? "var(--color-gain)" : frac >= 0.6 ? "var(--color-brand)" : frac >= 0.4 ? "var(--color-warn)" : "var(--color-loss)";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-xl font-semibold tnum leading-none">{Math.round(value)}</div>
        {label && <div className="text-[9px] text-ink-faint mt-0.5">{label}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ pct, danger = false }: { pct: number; danger?: boolean }) {
  return (
    <div className="h-2 rounded-full bg-line overflow-hidden">
      <div
        className={`h-full rounded-full ${danger ? "bg-warn" : "bg-brand"}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
