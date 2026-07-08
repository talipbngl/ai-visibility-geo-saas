import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", user?.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-background p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hesap ve workspace ayarları burada olacak.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Hesap Bilgileri</CardTitle>
          <CardDescription>
            Şimdilik sadece mevcut kullanıcı bilgilerini gösteriyoruz.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Ad Soyad</p>
            <p className="font-medium">{profile?.full_name || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{profile?.email || user?.email}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}