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

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusVariant(status: string) {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "running") return "secondary";

  return "outline";
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-background p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Auditler</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Başlatılan AI görünürlük auditleri burada listelenir.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Audit Geçmişi</CardTitle>
          <CardDescription>
            Her audit, seçili markanın aktif promptları üzerinden oluşturulur.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {audits && audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <div
                  key={audit.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {brandNameById.get(audit.brand_id) ?? "Marka"}
                      </p>

                      <Badge variant={getStatusVariant(audit.status)}>
                        {audit.status}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {audit.completed_prompts} / {audit.total_prompts} prompt
                      tamamlandı
                    </p>

                    {audit.error_message ? (
                      <p className="mt-1 text-sm text-destructive">
                        {audit.error_message}
                      </p>
                    ) : null}

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(audit.created_at)}
                    </p>
                  </div>

                  <Button asChild size="sm">
                    <Link href={`/dashboard/audits/${audit.id}`}>
                      Detaya git
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz audit yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bir markanın prompt sayfasından audit başlat.
              </p>

              <Button asChild className="mt-4">
                <Link href="/dashboard/brands">Markalara git</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}