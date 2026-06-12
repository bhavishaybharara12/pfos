"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivacy } from "./PrivacyProvider";

const SCOPES = ["family"]; // person slugs appended via props

export function TopBar({ persons }: { persons: { slug: string; name: string }[] }) {
  const pathname = usePathname();
  const { hidden, toggle } = usePrivacy();

  const segments = pathname.split("/").filter(Boolean);
  const known = new Set([...SCOPES, ...persons.map((p) => p.slug)]);
  const currentScope = known.has(segments[0]) ? segments[0] : "family";
  const rest = known.has(segments[0]) ? segments.slice(1).join("/") : segments.join("/");

  const pill = (slug: string, label: string) => (
    <Link
      key={slug}
      href={`/${slug}${rest ? `/${rest}` : ""}`}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        currentScope === slug
          ? "bg-ink text-white"
          : "bg-card border border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="h-14 border-b border-line bg-card/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {pill("family", "Family")}
        {persons.map((p) => pill(p.slug, p.name))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="text-xs px-3 py-1.5 rounded-md border border-line bg-card text-ink-soft hover:text-ink"
          title="Blur all amounts (for opening PFOS in public)"
        >
          {hidden ? "🙈 Privacy on" : "👁 Privacy off"}
        </button>
        <div className="w-7 h-7 rounded-full bg-brand text-white text-xs flex items-center justify-center font-semibold">
          AS
        </div>
      </div>
    </header>
  );
}
