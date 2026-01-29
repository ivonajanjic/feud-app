"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@acme/ui";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/games", label: "Games" },
  { href: "/questions", label: "Questions" },
  { href: "/teams", label: "Teams" },
  { href: "/settings", label: "Settings" },
];

export function SideNavigation() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight text-primary">
          Family Feud
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">Game Dashboard</p>
      </div>
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </aside>
  );
}
