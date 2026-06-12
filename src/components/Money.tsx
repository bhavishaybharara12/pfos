import { compactINR, formatINR } from "@/lib/format";

/** Money text — tabular numerals, blurred when privacy mode is on (via .privacy-on .money CSS). */
export function Money({
  value,
  compact = true,
  signed = false,
  className = "",
}: {
  value: number;
  compact?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const text = compact ? compactINR(value) : formatINR(value);
  const sign = signed && value > 0 ? "+" : "";
  return (
    <span className={`money tnum ${className}`}>
      {sign}
      {text}
    </span>
  );
}
