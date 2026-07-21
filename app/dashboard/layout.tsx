import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createClient } from "@/lib/supabase/server";

type DashboardLayoutProps = {
  children: ReactNode;
};

const memberNavigationItems = [
  {
    label: "Genel Bakış",
    href: "/dashboard",
    description: "Ana panel",
  },
  {
    label: "Markalar",
    href: "/dashboard/brands",
    description: "Marka ve rakip yönetimi",
  },
  {
    label: "Ölçümler",
    href: "/dashboard/audits",
    description: "Ölçümler ve raporlar",
  },
  {
    label: "Ayarlar",
    href: "/dashboard/settings",
    description: "Hesap ve çalışma alanı",
  },
];

const adminNavigationItems = [
  {
    label: "Sistem Kontrolü",
    href: "/dashboard/health",
    description: "Yayın ve servis durumu",
  },
  {
    label: "Rapor Talepleri",
    href: "/dashboard/leads",
    description: "Herkese açık formdan gelen talepler",
  },
];

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const navigationItems = isPlatformAdmin(user.email)
    ? [
        memberNavigationItems[0]!,
        ...adminNavigationItems,
        ...memberNavigationItems.slice(1),
      ]
    : memberNavigationItems;

  async function signOut() {
    "use server";

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r bg-background/95 px-4 py-5 shadow-sm md:flex md:flex-col">
          <div className="rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              AI Görünürlük
            </p>

            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              Marka Takip Paneli
            </h1>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Markalarının AI cevaplarında ne kadar göründüğünü ölç, rakiplerle
              karşılaştır ve raporla.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-xl border border-transparent px-4 py-3 transition hover:border-border hover:bg-muted/50"
              >
                <p className="text-sm font-medium">
                  {item.label}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-4 rounded-2xl border bg-muted/20 p-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Oturum
              </p>

              <p className="mt-1 truncate text-sm font-medium">
                {user.email}
              </p>
            </div>

            <Badge variant="secondary">
              Beta sürümü
            </Badge>

            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                className="w-full"
              >
                Çıkış yap
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  AI Görünürlük
                </p>

                <p className="font-semibold">
                  Marka Takip Paneli
                </p>
              </div>

              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                >
                  Çıkış
                </Button>
              </form>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="outline"
                  size="sm"
                >
                  <Link href={item.href}>
                    {item.label}
                  </Link>
                </Button>
              ))}
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}