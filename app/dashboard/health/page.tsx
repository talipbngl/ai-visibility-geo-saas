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

function getCheckBadge(isOk: boolean) {
  return (
    <Badge variant={isOk ? "default" : "destructive"}>
      {isOk ? "Hazır" : "Eksik"}
    </Badge>
  );
}

export default async function HealthPage() {
  const supabase = await createClient();

  const hasAppUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL);
const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const hasSupabaseKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const hasSupabaseSecret = Boolean(process.env.SUPABASE_SECRET_KEY);
const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
const hasGeminiModel = Boolean(process.env.GEMINI_MODEL);

  const { count: brandCount } = await supabase
    .from("brands")
    .select("id", { count: "exact", head: true });

  const { count: auditCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true });

  const { count: scoreCount } = await supabase
    .from("audit_scores")
    .select("id", { count: "exact", head: true });

  const envChecks = [
    {
  title: "App URL",
  description: "Local ve production ortamında uygulamanın ana adresini belirler.",
  isOk: hasAppUrl,
},
    {
      title: "Supabase URL",
      description: "Frontend ve server bağlantısı için gerekli.",
      isOk: hasSupabaseUrl,
    },
    {
      title: "Supabase Publishable Key",
      description: "Tarayıcı tarafı Supabase işlemleri için gerekli.",
      isOk: hasSupabaseKey,
    },
    {
      title: "Supabase Secret Key",
      description: "Server tarafı güvenli işlemler için gerekli.",
      isOk: hasSupabaseSecret,
    },
    {
      title: "Gemini API Key",
      description: "AI cevaplarını üretmek için gerekli.",
      isOk: hasGeminiKey,
    },
    {
      title: "Gemini Model",
      description: "Kullanılacak Gemini model adını belirler.",
      isOk: hasGeminiModel,
    },
  ];

  const dataChecks = [
    {
      title: "En az 1 marka",
      description: "Demo veya gerçek ölçüm için marka oluşturulmuş olmalı.",
      isOk: (brandCount ?? 0) > 0,
      actionHref: "/dashboard/brands/new",
      actionLabel: "Marka ekle",
    },
    {
      title: "En az 1 ölçüm",
      description: "AI görünürlük raporu için ölçüm oluşturulmuş olmalı.",
      isOk: (auditCount ?? 0) > 0,
      actionHref: "/dashboard/brands",
      actionLabel: "Markalara git",
    },
    {
      title: "En az 1 analiz skoru",
      description: "Satış demosu için tamamlanmış bir rapor olması iyi olur.",
      isOk: (scoreCount ?? 0) > 0,
      actionHref: "/dashboard/audits",
      actionLabel: "Ölçümlere git",
    },
  ];

  const allEnvReady = envChecks.every((check) => check.isOk);
  const allDataReady = dataChecks.every((check) => check.isOk);
  const isMvpReady = allEnvReady && allDataReady;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistem Kontrol"
        title="MVP hazırlık kontrolü"
        description="Deploy ve satış demosu öncesi temel sistem parçalarının hazır olup olmadığını buradan kontrol edebilirsin."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard’a dön</Link>
            </Button>

            <Button asChild>
              <Link href="/demo-report">Public demo rapor</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Marka"
          description="Sistemde kayıtlı marka"
          value={brandCount ?? 0}
        />

        <MetricCard
          title="Ölçüm"
          description="Oluşturulan audit"
          value={auditCount ?? 0}
        />

        <MetricCard
          title="Skor"
          description="Analiz edilmiş rapor"
          value={scoreCount ?? 0}
        />

        <MetricCard
          title="MVP Durumu"
          description="Demo/satış hazırlığı"
          value={isMvpReady ? "Hazır" : "Eksik"}
        />
      </section>

      <Card
        className={
          isMvpReady
            ? "border-primary/20 bg-primary/5 shadow-sm"
            : "border-destructive/30 bg-destructive/5 shadow-sm"
        }
      >
        <CardHeader>
          <CardTitle>
            {isMvpReady
              ? "MVP demo için hazır görünüyor"
              : "MVP için tamamlanması gerekenler var"}
          </CardTitle>
          <CardDescription>
            Bu kontrol teknik doğrulama içindir. Satışa çıkmadan önce bir gerçek
            marka ile uçtan uca test yapman yine gerekli.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard/brands/new">Yeni marka ekle</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/dashboard/audits">Ölçümleri kontrol et</Link>
            </Button>

            <Button asChild>
              <Link href="/dashboard/demo-report">Dashboard demo rapor</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ortam değişkenleri</CardTitle>
            <CardDescription>
              API key ve bağlantı ayarlarının varlığını kontrol eder. Değerleri
              güvenlik için göstermez.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {envChecks.map((check) => (
              <div
                key={check.title}
                className="flex items-start justify-between gap-4 rounded-xl border p-4"
              >
                <div>
                  <p className="font-medium">{check.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {check.description}
                  </p>
                </div>

                {getCheckBadge(check.isOk)}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Demo veri kontrolü</CardTitle>
            <CardDescription>
              Satış demosu için gereken minimum ürün verilerini kontrol eder.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {dataChecks.map((check) => (
              <div
                key={check.title}
                className="rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{check.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {check.description}
                    </p>
                  </div>

                  {getCheckBadge(check.isOk)}
                </div>

                {!check.isOk ? (
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={check.actionHref}>{check.actionLabel}</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}