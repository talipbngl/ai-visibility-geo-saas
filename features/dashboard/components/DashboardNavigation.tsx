"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  label: string;
  href: string;
};

type DashboardNavigationProps = {
  items: NavigationItem[];
  variant: "desktop" | "mobile";
};

function isNavigationItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNavigation({
  items,
  variant,
}: DashboardNavigationProps) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <nav
        aria-label="Mobil panel menüsü"
        className="mt-3 flex gap-2 overflow-x-auto pb-1"
      >
        {items.map((item) => {
          const isActive = isNavigationItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Panel menüsü" className="mt-6 space-y-2">
      {items.map((item) => {
        const isActive = isNavigationItemActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`block rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary/30 bg-primary/10 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}