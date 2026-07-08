import { redirect } from "next/navigation";
import { logoutAction } from "@/features/auth/actions/logout.action";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
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

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, plan")
    .limit(5);

  const { count: brandCount } = await supabase
    .from("brands")
    .select("id", { count: "exact", head: true });

  const activeWorkspace = workspaces?.[0];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Hoş geldin</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.full_name || profile?.email || user.email}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI görünürlük audit panelinin ilk auth testi başarılı.
            </p>
          </div>

          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Çıkış yap
            </Button>
          </form>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>Aktif çalışma alanı</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                {activeWorkspace?.name ?? "Workspace yok"}
              </p>
              <Badge className="mt-3" variant="secondary">
                {activeWorkspace?.plan ?? "free"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Markalar</CardTitle>
              <CardDescription>Takip edilen marka sayısı</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{brandCount ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sonraki adım</CardTitle>
              <CardDescription>Marka ekleme modülü</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sıradaki modülde kullanıcı ilk markasını ekleyebilecek.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}