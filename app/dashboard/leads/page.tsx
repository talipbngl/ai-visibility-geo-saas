import Link from "next/link";
import { redirect } from "next/navigation";

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
  EmptyState,
  MetricCard,
  PageHeader,
} from "@/features/ui/components";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type LeadsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

function formatDate(
  value: string | null
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

function getStatusLabel(
  status: string
) {
  if (status === "new") {
    return "Yeni";
  }

  if (status === "contacted") {
    return "İletişime geçildi";
  }

  if (status === "qualified") {
    return "Uygun müşteri adayı";
  }

  if (status === "closed") {
    return "Kapandı";
  }

  if (status === "rejected") {
    return "Uygun değil";
  }

return "Bilinmeyen durum";}

function getStatusVariant(
  status: string
) {
  if (status === "new") {
    return "default" as const;
  }

  if (
    status === "contacted" ||
    status === "qualified"
  ) {
    return "secondary" as const;
  }

  if (status === "closed") {
    return "outline" as const;
  }

  if (status === "rejected") {
    return "destructive" as const;
  }

  return "outline" as const;
}

export default async function LeadsPage({
  searchParams,
}: LeadsPageProps) {
  const params = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isPlatformAdmin(user.email)) {
    redirect("/dashboard");
  }

  const supabaseAdmin =
    createAdminClient();

  const {
    data: leads,
    error: leadsError,
  } = await supabaseAdmin
    .from("lead_requests")
    .select(
      `
      id,
      name,
      email,
      company_name,
      website_url,
      industry,
      message,
      status,
      created_at
      `
    )
    .order("created_at", {
      ascending: false,
    });

  if (leadsError) {
  console.error("Rapor talepleri alınamadı:", leadsError);

  throw new Error(
    "Rapor talepleri şu anda alınamıyor. Lütfen daha sonra tekrar deneyin."
  );
}

  const totalLeadCount =
    leads?.length ?? 0;

  const newLeadCount =
    leads?.filter(
      (lead) => lead.status === "new"
    ).length ?? 0;

  const contactedLeadCount =
    leads?.filter((lead) =>
      [
        "contacted",
        "qualified",
      ].includes(lead.status)
    ).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Talepler"
        title="Rapor talepleri"
description="Tanıtım sayfasından gelen AI görünürlük raporu taleplerini buradan takip edebilirsiniz."
        actions={
          <>
            <Button
              asChild
              variant="outline"
            >
              <Link href="/request-report">
                Talep formunu aç
              </Link>
            </Button>

            <Button asChild>
              <Link href="/demo-report">
               Herkese açık örnek rapor
              </Link>
            </Button>
          </>
        }
      />

      {params.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {params.success}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {params.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Toplam Talep"
          description="Formdan gelen tüm talepler"
          value={totalLeadCount}
        />

        <MetricCard
          title="Yeni Talep"
          description="Henüz işlem yapılmamış talepler"
          value={newLeadCount}
        />

        <MetricCard
          title="Takibe Alınan"
          description="İletişim veya değerlendirme aşamasında"
          value={contactedLeadCount}
        />
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>
            Gelen Talepler
          </CardTitle>

          <CardDescription>
            En yeni talepler üstte
            görünür.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {leads &&
          leads.length > 0 ? (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {lead.name}
                        </p>

                        <Badge
                          variant={getStatusVariant(
                            lead.status
                          )}
                        >
                          {getStatusLabel(
                            lead.status
                          )}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {lead.email}
                      </p>
                    </div>

                    <Badge variant="outline">
                      {formatDate(
                        lead.created_at
                      )}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Marka / Şirket
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {lead.company_name ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Sektör
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {lead.industry ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Web sitesi
                      </p>

                      {lead.website_url ? (
                        <a
                          href={
                            lead.website_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-sm font-medium underline underline-offset-4"
                        >
                          {
                            lead.website_url
                          }
                        </a>
                      ) : (
                        <p className="mt-1 text-sm font-medium">
                          -
                        </p>
                      )}
                    </div>
                  </div>

                  {lead.message ? (
                    <div className="mt-4 rounded-xl border bg-background p-4">
                      <p className="text-sm font-medium">
                        Ek not
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {lead.message}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                      >
                        <a
                          href={`mailto:${lead.email}`}
                        >
                          E-posta gönder
                        </a>
                      </Button>

                      {lead.website_url ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                        >
                          <a
                            href={
                              lead.website_url
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            Web sitesini aç
                          </a>
                        </Button>
                      ) : null}
                    </div>

                    <form
                      action={`/api/lead-requests/${lead.id}/status`}
                      method="post"
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <label
                        htmlFor={`lead-status-${lead.id}`}
                        className="text-sm font-medium"
                      >
                        Durum
                      </label>

                      <select
                        id={`lead-status-${lead.id}`}
                        name="status"
                        defaultValue={
                          lead.status
                        }
                        className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm"
                      >
                        <option value="new">
                          Yeni
                        </option>

                        <option value="contacted">
                          İletişime geçildi
                        </option>

                        <option value="qualified">
                          Uygun müşteri adayı
                        </option>

                        <option value="closed">
                          Kapandı
                        </option>

                        <option value="rejected">
                          Uygun değil
                        </option>
                      </select>

                      <Button
                        type="submit"
                        size="sm"
                      >
                        Durumu kaydet
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Henüz talep yok"
description="Landing page’deki rapor talep formu doldurulunca talepler burada görünecek."
              action={
                <Button asChild>
                  <Link href="/request-report">
                    Talep formunu aç
                  </Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}