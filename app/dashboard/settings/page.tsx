import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MetricCard,
  PageHeader,
} from "@/features/ui/components";
import { createClient } from "@/lib/supabase/server";

type GeminiUsage = {
  daily_used: number;
  daily_limit: number;
  daily_remaining: number;
  resets_at: string;
};
type GeminiUsageBreakdown = {
  auditPrompt: number;
  promptGeneration: number;
  competitorGeneration: number;
};

type GeminiUsageBreakdownRow = {
  operation: string;
  usage_count: number;
};
function formatDate(
  value: string | null | undefined
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

function maskEmail(
  email: string | undefined
) {
  if (!email) {
    return "-";
  }

  const [name, domain] =
    email.split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleName =
    name.slice(0, 2);

  const maskedName =
    `${visibleName}${"*".repeat(
      Math.max(name.length - 2, 3)
    )}`;

  return `${maskedName}@${domain}`;
}

function getDailyGeminiPromptLimit() {
  const configuredLimit = Number(
    process.env
      .DAILY_GEMINI_PROMPT_LIMIT ??
      50
  );

  if (
    !Number.isInteger(configuredLimit) ||
    configuredLimit < 1
  ) {
    return 50;
  }

  return Math.min(
    configuredLimit,
    500
  );
}

export default async function SettingsPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select(
          "id, email, full_name, created_at"
        )
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const { data: workspaces } =
    await supabase
      .from("workspaces")
      .select(
        "id, name, slug, created_at"
      )
      .order("created_at", {
        ascending: true,
      })
      .limit(5);

  const activeWorkspace =
    workspaces?.[0];

  const [
    brandResult,
    auditResult,
    promptResult,
    competitorResult,
  ] = await Promise.all([
    supabase
      .from("brands")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("audits")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("prompts")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("competitors")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  const dailyLimit =
    getDailyGeminiPromptLimit();

  let geminiUsage: GeminiUsage = {
    daily_used: 0,
    daily_limit: dailyLimit,
    daily_remaining: dailyLimit,
    resets_at: "",
  };

  let usageError: string | null =
    null;
  let usageBreakdown: GeminiUsageBreakdown = {
    auditPrompt: 0,
    promptGeneration: 0,
    competitorGeneration: 0,
  };
  if (activeWorkspace) {
    const {
      data: usageData,
      error,
    } = await supabase.rpc(
      "get_workspace_gemini_usage",
      {
        p_workspace_id:
          activeWorkspace.id,
        p_daily_limit: dailyLimit,
      }
    );

    if (error) {
      usageError = error.message;
    } else {
      const firstUsage = (
        usageData ?? []
      )[0] as
        | GeminiUsage
        | undefined;

      if (firstUsage) {
        geminiUsage = {
          daily_used: Number(
            firstUsage.daily_used ?? 0
          ),
          daily_limit: Number(
            firstUsage.daily_limit ??
              dailyLimit
          ),
          daily_remaining: Number(
            firstUsage.daily_remaining ??
              dailyLimit
          ),
          resets_at:
            firstUsage.resets_at ?? "",
        };
      }
    }
        const {
      data: breakdownData,
      error: breakdownError,
    } = await supabase.rpc(
      "get_workspace_gemini_usage_breakdown",
      {
        p_workspace_id:
          activeWorkspace.id,
      }
    );

    if (breakdownError) {
      usageError = usageError
        ? `${usageError} | ${breakdownError.message}`
        : breakdownError.message;
    } else {
      const rows =
        (breakdownData ??
          []) as GeminiUsageBreakdownRow[];

      usageBreakdown = {
        auditPrompt: Number(
          rows.find(
            (row) =>
              row.operation ===
              "audit_prompt"
          )?.usage_count ?? 0
        ),

        promptGeneration: Number(
          rows.find(
            (row) =>
              row.operation ===
              "prompt_generation"
          )?.usage_count ?? 0
        ),

        competitorGeneration: Number(
          rows.find(
            (row) =>
              row.operation ===
              "competitor_generation"
          )?.usage_count ?? 0
        ),
      };
    }
  }

  const usagePercentage =
    geminiUsage.daily_limit > 0
      ? Math.min(
          Math.round(
            (geminiUsage.daily_used /
              geminiUsage.daily_limit) *
              100
          ),
          100
        )
      : 0;

  const usageBarColor =
    usagePercentage >= 90
      ? "bg-destructive"
      : usagePercentage >= 70
        ? "bg-amber-500"
        : "bg-emerald-500";

  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY
  );

  const geminiModel =
    process.env.GEMINI_MODEL ??
    "gemini-3.1-flash-lite";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ayarlar"
        title="Hesap ve çalışma alanı"
        description="Hesap bilgilerini, çalışma alanı özetini ve sistem durumunu buradan kontrol edebilirsin."
        actions={
          <Button
            asChild
            variant="outline"
          >
            <Link href="/dashboard">
              Panele dön
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Markalar"
          description="Takip edilen toplam marka"
          value={
            brandResult.count ?? 0
          }
        />

        <MetricCard
          title="Rakipler"
          description="Tanımlanan toplam rakip"
          value={
            competitorResult.count ??
            0
          }
        />

        <MetricCard
          title="Test Soruları"
          description="Oluşturulan toplam soru"
          value={
            promptResult.count ?? 0
          }
        />

        <MetricCard
          title="Ölçümler"
          description="Başlatılan toplam ölçüm"
          value={
            auditResult.count ?? 0
          }
        />
      </section>

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>
                Günlük Gemini Kullanımı
              </CardTitle>

              <CardDescription className="mt-1">
                Workspace için bugün
                kullanılan AI prompt
                hakkı.
              </CardDescription>
            </div>

            <Badge
              variant={
                usagePercentage >= 90
                  ? "destructive"
                  : "secondary"
              }
            >
              %{usagePercentage} kullanıldı
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {usageError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Kullanım bilgisi
              alınamadı: {usageError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Bugün kullanılan
              </p>

              <p className="mt-1 text-2xl font-semibold">
                {
                  geminiUsage.daily_used
                }
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Kalan hak
              </p>

              <p className="mt-1 text-2xl font-semibold">
                {
                  geminiUsage.daily_remaining
                }
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">
                Günlük limit
              </p>

              <p className="mt-1 text-2xl font-semibold">
                {
                  geminiUsage.daily_limit
                }
              </p>
            </div>
          </div>
                     <div className="space-y-3">
            <p className="text-sm font-medium">
              Kullanım dağılımı
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Audit cevapları
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {
                    usageBreakdown.auditPrompt
                  }
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Prompt üretimi
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {
                    usageBreakdown.promptGeneration
                  }
                </p>
              </div>

              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  Rakip üretimi
                </p>

                <p className="mt-1 text-xl font-semibold">
                  {
                    usageBreakdown.competitorGeneration
                  }
                </p>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">
                Kullanım oranı
              </span>

              <span className="font-medium">
                {geminiUsage.daily_used} /{" "}
                {geminiUsage.daily_limit}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${usageBarColor}`}
                style={{
                  width: `${usagePercentage}%`,
                }}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Limit UTC gece yarısında
            yenilenir
            {geminiUsage.resets_at
              ? ` (${formatDate(
                  geminiUsage.resets_at
                )})`
              : "."}
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              Hesap Bilgileri
            </CardTitle>

            <CardDescription>
              Oturum açan kullanıcı
              bilgileri.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                E-posta
              </p>

              <p className="mt-1 font-medium">
                {profile?.email ??
                  user?.email ??
                  "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Görünen ad
              </p>

              <p className="mt-1 font-medium">
                {profile?.full_name ||
                  "Henüz eklenmedi"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Kullanıcı ID
              </p>

              <p className="mt-1 break-all text-sm font-medium">
                {user?.id ?? "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Kayıt tarihi
              </p>

              <p className="mt-1 font-medium">
                {formatDate(
                  profile?.created_at ??
                    user?.created_at
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              Çalışma Alanı
            </CardTitle>

            <CardDescription>
              Markaların ve ölçümlerin
              bağlı olduğu workspace.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Workspace adı
              </p>

              <p className="mt-1 font-medium">
                {activeWorkspace?.name ??
                  "Varsayılan çalışma alanı"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Slug
              </p>

              <p className="mt-1 font-medium">
                {activeWorkspace?.slug ??
                  "-"}
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Oluşturulma
              </p>

              <p className="mt-1 font-medium">
                {formatDate(
                  activeWorkspace?.created_at
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">
                MVP durumu
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Şu anda tek kullanıcı
                odaklı çalışma alanı
                kullanılıyor. Ekip ve rol
                yönetimi sonraki aşamada
                genişletilecek.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              Sistem Durumu
            </CardTitle>

            <CardDescription>
              Kritik servislerin kısa
              kontrolü.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">
                  Supabase
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Auth, veritabanı ve
                  RLS bağlantısı.
                </p>
              </div>

              <Badge variant="secondary">
                Aktif
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="font-medium">
                  Gemini API
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  AI cevapları ve test
                  sorusu üretimi.
                </p>
              </div>

              <Badge
                variant={
                  hasGeminiKey
                    ? "secondary"
                    : "destructive"
                }
              >
                {hasGeminiKey
                  ? "Tanımlı"
                  : "Eksik"}
              </Badge>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Aktif model
              </p>

              <p className="mt-1 font-medium">
                {geminiModel}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              Güvenlik Notları
            </CardTitle>

            <CardDescription>
              MVP için kritik güvenlik
              noktaları.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-xl border p-4">
              <p className="font-medium">
                Environment dosyası
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                <code>.env.local</code>{" "}
                GitHub’a gönderilmemeli.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">
                Gizli bilgiler
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                API key değerleri
                gösterilmez. Yalnızca
                tanımlı olup olmadığı
                kontrol edilir.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="font-medium">
                Kullanıcı e-postası
              </p>

              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Maskeli görünüm:{" "}
                {maskEmail(user?.email)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}