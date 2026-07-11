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
import { EmptyState, PageHeader, StatusBadge } from "@/features/ui/components";

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AuditsPage() {
  const supabase = await createClient();

  const { data: audits } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, error_message, created_at"
    )
    .order("created_at", { ascending: false });

  const brandIds = Array.from(
    new Set((audits ?? []).map((audit) => audit.brand_id).filter(Boolean))
  );

  const brandsResult =
    brandIds.length > 0
      ? await supabase.from("brands").select("id, name").in("id", brandIds)
      : { data: [] };

  const brandNameById = new Map(
    (brandsResult.data ?? []).map((brand) => [brand.id, brand.name])
  );

  const auditIds = (audits ?? []).map((audit) => audit.id);

  const scoresResult =
    auditIds.length > 0
      ? await supabase
          .from("audit_scores")
          .select("audit_id, visibility_score, share_of_voice")
          .in("audit_id", auditIds)
      : { data: [] };

  const scoreByAuditId = new Map(
    (scoresResult.data ?? []).map((score) => [score.audit_id, score])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ölçümler"
        title="AI görünürlük ölçümleri"
        description="Başlatılan tüm ölçümleri, durumlarını ve rapor bağlantılarını buradan takip et."
        actions={
          <Button asChild>
            <Link href="/dashboard/brands">Markalara git</Link>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Ölçüm Geçmişi</CardTitle>
          <CardDescription>
            Her ölçüm, seçili markanın aktif test soruları üzerinden oluşturulur.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {audits && audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => {
                const score = scoreByAuditId.get(audit.id);

                return (
                  <div
                    key={audit.id}
                    className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {brandNameById.get(audit.brand_id) ?? "Marka"}
                          </p>

                          <StatusBadge status={audit.status} />

                          <Badge variant="outline">
                            {audit.completed_prompts} / {audit.total_prompts}{" "}
                            soru
                          </Badge>
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          Oluşturulma: {formatDate(audit.created_at)}
                        </p>

                        {audit.error_message ? (
                          <p className="mt-2 text-sm text-destructive">
                            {audit.error_message}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm md:grid-cols-2 lg:min-w-[260px]">
                        <div className="rounded-lg border p-3">
                          <p className="text-muted-foreground">Görünürlük</p>
                          <p className="font-semibold">
                            {score
                              ? `${Math.round(score.visibility_score)}/100`
                              : "-"}
                          </p>
                        </div>

                        <div className="rounded-lg border p-3">
                          <p className="text-muted-foreground">Pay</p>
                          <p className="font-semibold">
                            {score
                              ? `${Math.round(score.share_of_voice)}%`
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/audits/${audit.id}`}>
                            Detay
                          </Link>
                        </Button>

                        <Button asChild size="sm">
                          <Link href={`/dashboard/audits/${audit.id}/report`}>
                            Rapor
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Henüz ölçüm yok"
              description="Bir markanın test soruları sayfasından ilk AI görünürlük ölçümünü başlatabilirsin."
              action={
                <Button asChild>
                  <Link href="/dashboard/brands">Markalara git</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}