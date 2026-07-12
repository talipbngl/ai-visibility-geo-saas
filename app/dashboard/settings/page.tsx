import Link from "next/link";

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
import { MetricCard, PageHeader } from "@/features/ui/components";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskEmail(email: string | undefined) {
  if (!email) return "-";

  const [name, domain] = email.split("@");

  if (!name || !domain) return email;

  const visibleName = name.slice(0, 2);
  const maskedName = `${visibleName}${"*".repeat(Math.max(name.length - 2, 3))}`;

  return `${maskedName}@${domain}`;
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, slug, created_at")
    .order("created_at", { ascending: true })
    .limit(5);

  const activeWorkspace = workspaces?.[0];

  const { count: brandCount } = await supabase
    .from("brands")
    .select("id", { count: "exact", head: true });

  const { count: auditCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true });

  const { count: promptCount } = await supabase
    .from("prompts")
    .select("id", { count: "exact", head: true });

  const { count: competitorCount } = await supabase
    .from("competitors")
    .select("id", { count: "exact", head: true });

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const geminiModel = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ayarlar"
        title="Hesap ve çalışma alanı"
        description="Hesap bilgilerini, çalışma alanı özetini ve sistem durumunu buradan kontrol edebilirsin."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard">Panele dön</Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Markalar"
          description="Takip edilen toplam marka"
          value={brandCount ?? 0}
        />

        <MetricCard
          title="Rakipler"
          description="Tanımlanan toplam rakip"
          value={competitorCount ?? 0}
        />

        <MetricCard
          title="Test Soruları"
          description="Oluşturulan toplam soru"
          value={promptCount ?? 0}
        />

        <MetricCard
          title="Ölçümler"
          description="Başlatılan toplam ölçüm"
          value={auditCount ?? 0}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Hesap Bilgileri</CardTitle>
            <CardDescription>
              Oturum açan kullanıcı bilgileri.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">E-posta</p>
              <p className="mt-1 font-medium">
                {profile?.email ?? user?.email ?? "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Görünen ad</p>
              <p className="mt-1 font-medium">
                {profile?.full_name || "Henüz eklenmedi"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Kullanıcı ID</p>
              <p className="mt-1 break-all text-sm font-medium">
                {user?.id ?? "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Kayıt tarihi</p>
              <p className="mt-1 font-medium">
                {formatDate(profile?.created_at ?? user?.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Çalışma Alanı</CardTitle>
            <CardDescription>
              Markaların ve ölçümlerin bağlı olduğu workspace bilgisi.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Workspace adı</p>
              <p className="mt-1 font-medium">
                {activeWorkspace?.name ?? "Varsayılan çalışma alanı"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="mt-1 font-medium">
                {activeWorkspace?.slug ?? "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Oluşturulma</p>
              <p className="mt-1 font-medium">
                {formatDate(activeWorkspace?.created_at)}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">Not</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Workspace düzenleme, ekip üyeleri ve rol yönetimi production
                aşamasında eklenecek. Şu an tek kullanıcı odaklı MVP akışı
                kullanılıyor.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sistem Durumu</CardTitle>
            <CardDescription>
              Uygulamanın çalışması için kritik servislerin kısa kontrolü.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">Supabase</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Auth, veritabanı ve RLS bağlantısı.
                </p>
              </div>

              <Badge variant="secondary">Aktif</Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">Gemini API</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI cevapları ve test sorusu üretimi için kullanılır.
                </p>
              </div>

              <Badge variant={hasGeminiKey ? "secondary" : "destructive"}>
                {hasGeminiKey ? "Tanımlı" : "Eksik"}
              </Badge>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">Aktif model</p>
              <p className="mt-1 font-medium">{geminiModel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Güvenlik Notları</CardTitle>
            <CardDescription>
              MVP için dikkat edilmesi gereken temel noktalar.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-xl border p-4">
              <p className="font-medium">Environment dosyası</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                <code>.env.local</code> dosyası GitHub’a gönderilmemeli. API
                keyler sadece local ve deploy ortamında tutulmalı.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">Gizli bilgiler</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Bu sayfada API key değerleri gösterilmez. Sadece tanımlı olup
                olmadığı kontrol edilir.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">Kullanıcı e-postası</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Maskeli görünüm örneği: {maskEmail(user?.email)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}