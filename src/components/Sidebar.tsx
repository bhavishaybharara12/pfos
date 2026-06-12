"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "", label: "Home", icon: "◆" },
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
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const scopeSeg = pathname.split("/").filter(Boolean)[0] ?? "family";

  return (
    <aside className="w-56 shrink-0 border-r border-line bg-card hidden md:flex flex-col">
      <div className="px-5 py-5 border-b border-line">
        <Link href={`/${scopeSeg}`} className="text-lg font-semibold tracking-tight">
          <span className="text-brand">PF</span>OS
        </Link>
        <div className="text-[11px] text-ink-faint mt-0.5">Personal Finance OS</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((n) => {
          const target = `/${scopeSeg}${n.href}`;
          const active = pathname === target;
          return (
            <Link
              key={n.label}
              href={target}
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
