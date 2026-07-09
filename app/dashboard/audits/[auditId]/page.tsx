import Link from "next/link";
import { notFound } from "next/navigation";

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

type AuditDetailPageProps = {
  params: Promise<{
    auditId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

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

export default async function AuditDetailPage({
  params,
  searchParams,
}: AuditDetailPageProps) {
  const { auditId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, brand_id, status, total_prompts, completed_prompts, error_message, started_at, completed_at, created_at"
    )
    .eq("id", auditId)
    .maybeSingle();

  if (!audit) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, industry")
    .eq("id", audit.brand_id)
    .maybeSingle();

  const { data: runs } = await supabase
    .from("audit_runs")
    .select(
      `
      id,
      status,
      engine,
      model,
      raw_answer,
      error_message,
      started_at,
      completed_at,
      created_at,
      prompts (
        id,
        text,
        intent,
        priority
      )
    `
    )
    .eq("audit_id", audit.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Audit Detayı
            </h1>

            <Badge variant={getStatusVariant(audit.status)}>
              {audit.status}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {brand?.name ?? "Marka"} için oluşturulan audit.
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Oluşturulma: {formatDate(audit.created_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/audits">Auditlere dön</Link>
          </Button>

          {brand ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                Promptlara dön
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {query.error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Prompt</CardTitle>
            <CardDescription>Bu audit içinde çalışacak prompt</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">{audit.total_prompts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tamamlanan</CardTitle>
            <CardDescription>Şu ana kadar biten prompt</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-semibold">
              {audit.completed_prompts}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engine</CardTitle>
            <CardDescription>Kullanılacak AI motoru</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-lg font-semibold">Gemini</p>
          </CardContent>
        </Card>
      </section>

      {audit.error_message ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Audit Hatası</CardTitle>
          </CardHeader>

          <CardContent className="text-sm text-destructive">
            {audit.error_message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Prompt Çalıştırmaları</CardTitle>
          <CardDescription>
            Şimdilik kayıtlar pending. Bir sonraki adımda bu promptları Gemini’ye
            sorduracağız.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {runs && runs.length > 0 ? (
            <div className="space-y-3">
              {runs.map((run) => {
                const prompt = Array.isArray(run.prompts)
                  ? run.prompts[0]
                  : run.prompts;

                return (
                  <div key={run.id} className="rounded-lg border p-4">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <Badge variant={getStatusVariant(run.status)}>
                        {run.status}
                      </Badge>

                      <Badge variant="secondary">{run.engine}</Badge>

                      {run.model ? (
                        <Badge variant="outline">{run.model}</Badge>
                      ) : null}
                    </div>

                    <p className="font-medium">
                      {prompt?.text ?? "Prompt metni bulunamadı"}
                    </p>

                    {prompt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Intent: {prompt.intent} / Priority: {prompt.priority}
                      </p>
                    ) : null}

                    {run.raw_answer ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                        {run.raw_answer}
                      </p>
                    ) : null}

                    {run.error_message ? (
                      <p className="mt-2 text-sm text-destructive">
                        {run.error_message}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Run kaydı yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit oluşturulurken prompt run kayıtları yazılmalıydı.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}