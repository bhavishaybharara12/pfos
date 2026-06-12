"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePrivacy } from "./PrivacyProvider";

export function TopBar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const { hidden, toggle } = usePrivacy();
  const scope = search.get("scope") ?? "family";
  const [persons, setPersons] = useState<{ id: string; fullName: string }[]>([]);

  useEffect(() => {
    fetch("/api/persons")
      .then((r) => r.json())
      .then(setPersons)
      .catch(() => {});
  }, []);

  const pill = (key: string, label: string) => (
    <Link
      key={key}
      href={`${pathname}${key === "family" ? "" : `?scope=${key}`}`}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        scope === key ? "bg-ink text-white" : "bg-card border border-line text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="h-14 border-b border-line bg-card/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {pill("family", "Family")}
        {persons.map((p) => pill(p.id, p.fullName.split(" ")[0]))}
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
