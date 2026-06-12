"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV = [
  { href: "/", label: "Home", icon: "◆" },
  { href: "/assets", label: "Assets", icon: "▲" },
  { href: "/liabilities", label: "Liabilities", icon: "▼" },
  { href: "/cashflow", label: "Cash Flow", icon: "⇄" },
  { href: "/goals", label: "Goals", icon: "◎" },
  { href: "/retirement", label: "Retirement & FIRE", icon: "☀" },
  { href: "/simulate", label: "Simulate", icon: "≈" },
  { href: "/insights", label: "Copilot", icon: "✦" },
  { href: "/connections", label: "Connections", icon: "⛓" },
];

export function Sidebar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const scope = search.get("scope");
  const qs = scope ? `?scope=${scope}` : "";

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-card hidden md:flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <Link href={`/${qs}`} className="text-lg font-semibold tracking-tight">
          <span className="text-brand">PF</span>OS
        </Link>
        <div className="text-[11px] text-ink-faint mt-0.5">Personal Finance OS</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={`${n.href}${qs}`}
              className={`flex items-center gap-3 px-5 py-2 text-sm ${
                active
                  ? "text-brand bg-brand-soft font-medium border-r-2 border-brand"
                  : "text-ink-soft hover:text-ink hover:bg-paper"
              }`}
            >
              <span className="w-4 text-center text-xs">{n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-line text-[11px] text-ink-faint leading-relaxed">
        Conflict-free by design.
        <br />
        No commissions. No data selling.
      </div>
    </aside>
  );
}
