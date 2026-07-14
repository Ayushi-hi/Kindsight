"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Studies", hint: "worklist" },
  { href: "/upload", label: "New scan", hint: "upload" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-panel/60 flex flex-col">
      <div className="px-5 py-6 border-b border-line">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan shadow-glow" />
          <span className="font-mono text-sm tracking-widest text-ink">RADINTEL</span>
        </div>
        <p className="mt-1 font-mono text-[11px] text-ink-muted tracking-wide">
          AI · CHEST X-RAY · v0.1
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-panel-raised text-ink border border-line"
                  : "text-ink-muted hover:text-ink hover:bg-panel-raised/60"
              }`}
            >
              <span>{item.label}</span>
              <span className="font-mono text-[10px] text-ink-muted">{item.hint}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-line font-mono text-[10px] text-ink-muted leading-relaxed">
        For triage support only.
        <br />
        Not a substitute for radiologist review.
      </div>
    </aside>
  );
}
