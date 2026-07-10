import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Building2, Home, Settings } from "lucide-react";

import { logoutAction } from "@/features/auth/actions/logout.action";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Genel Bakış",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Markalar",
    href: "/dashboard/brands",
    icon: Building2,
  },
  {
    title: "Ölçümler",
    href: "/dashboard/audits",
    icon: BarChart3,
  },
  {
    title: "Ayarlar",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background px-4 py-6 md:block">
        <div className="mb-8">
          <Link href="/dashboard" className="block">
            <p className="text-sm text-muted-foreground">AI Visibility</p>
            <h1 className="text-lg font-semibold">GEO SaaS</h1>
          </Link>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="size-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <div className="mb-3 rounded-lg border bg-muted/40 p-3">
            <p className="text-sm font-medium">
              {profile?.full_name || "Kullanıcı"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile?.email || user.email}
            </p>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Çıkış yap
            </Button>
          </form>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Dashboard</p>
              <h2 className="text-xl font-semibold">AI Görünürlük Paneli</h2>
            </div>

            <form action={logoutAction} className="md:hidden">
              <Button type="submit" variant="outline" size="sm">
                Çıkış
              </Button>
            </form>
          </div>
        </header>

        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  );
}