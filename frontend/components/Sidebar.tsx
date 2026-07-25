"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ScanLine,
  Clock,
  FileText,
  MessageCircle,
  BookOpen,
  Settings,
  Info,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { clearSession, getStoredUser, initials, type StoredUser } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pages the mockup shows but that don't have real routes/backend yet. */
  comingSoon?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard", label: "New Scan", icon: ScanLine },
  { href: "/scans", label: "Recent Scans", icon: Clock },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/chat", label: "Chat Assistant", icon: MessageCircle },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
{ href: "#", label: "Settings", icon: Settings, comingSoon: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-white flex flex-col min-h-screen">
      <div className="px-5 py-6 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center shrink-0">
          <Image src="/logo-mark.png" alt="Kindsight" width={40} height={44} className="h-10 w-auto" priority />
        </span>
        <div>
          <p className="font-display text-base leading-tight text-white">Kindsight</p>
          <p className="text-[11px] text-white/50 leading-tight">AI Radiology Assistant</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV.map((item, i) => {
          const active = !item.comingSoon && pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (item.comingSoon) {
            return (
              <div
                key={`${item.label}-${i}`}
                title="Not built yet"
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-white/35 cursor-default select-none"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-white/25">Soon</span>
              </div>
            );
          }

          return (
            <Link
              key={`${item.label}-${i}`}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sage text-white font-medium"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-lg bg-white/5 px-3.5 py-3 text-xs text-white/60 leading-relaxed flex gap-2">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-sage-muted" strokeWidth={1.75} />
        <p>
          <span className="text-white/80 font-medium">For clinical use only.</span> Kindsight is a
          triage / second-reader assistant. Not a replacement for clinician judgment.
        </p>
      </div>

      <div className="mx-3 mb-4 flex items-center gap-3 rounded-lg px-3 py-3 border-t border-white/10 pt-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sage-muted/30 text-xs font-medium text-white shrink-0">
          {user ? initials(user.full_name) : "…"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate">{user?.full_name ?? "Loading…"}</p>
          <p className="text-[11px] text-white/45 truncate">{user?.email ?? ""}</p>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          className="shrink-0 rounded-md p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;