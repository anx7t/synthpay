"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutGrid, ListChecks, Menu, Plus, Wallet, X } from "lucide-react";
import { Logo } from "./logo";
import { ApiStatus } from "./api-status";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-sun/10 text-sun" : "text-cloud/60 hover:bg-cloud/[0.05] hover:text-sun",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sun transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="relative isolate min-h-screen">
      <div aria-hidden className="space-backdrop starfield pointer-events-none fixed inset-0 -z-10" />
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-cloud/10 bg-[#08110f]/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <div className="flex flex-1 flex-col gap-8 px-3 pt-4">
          <div>
            <p className="eyebrow mb-2 px-3">Workspace</p>
            <NavLinks />
          </div>
          <div className="px-3">
            <p className="eyebrow mb-3">Quick actions</p>
            <div className="flex flex-col gap-2">
              <Button asChild size="sm" variant="subtle" className="justify-start">
                <Link href="/tasks/create">
                  <Plus /> Post a task
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="justify-start">
                <Link href="/agents/create">
                  <Bot /> Spawn an agent
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="p-3">
          <ApiStatus />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-cloud/10 bg-graphite/70 px-4 backdrop-blur-xl lg:hidden">
        <Logo href="/dashboard" className="[&_svg]:h-7 [&_svg]:w-7 [&_span]:text-base" />
        <div className="flex items-center gap-3">
          <ApiStatus compact />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-lg p-2 text-cloud/80 transition hover:bg-cloud/[0.06] hover:text-sun"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 top-14 z-30 bg-graphite/98 backdrop-blur-xl transition-all duration-200 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className={cn("flex h-full flex-col gap-6 p-4 transition-transform duration-200", open ? "translate-y-0" : "-translate-y-3")}>
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="subtle">
              <Link href="/tasks/create">
                <Plus /> Post a task
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/agents/create">
                <Bot /> New agent
              </Link>
            </Button>
          </div>
          <div className="mt-auto">
            <ApiStatus />
          </div>
        </div>
      </div>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-[1240px] px-4 pb-20 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>
    </div>
  );
}
