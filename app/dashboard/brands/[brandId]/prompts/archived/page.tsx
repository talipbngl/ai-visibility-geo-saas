import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getIntentLabel, getPriorityLabel } from "@/lib/ui/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/features/ui/components";

type ArchivedPromptsPageProps = {
  params: Promise<{
    brandId: string;
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

export default async function ArchivedPromptsPage({
  params,
  searchParams,
}: ArchivedPromptsPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: prompts } = await supabase
    .from("prompts")
    .select(
      "id, text, intent, priority, language, country, city, is_active, is_archived, archived_at, created_at"
    )
    .eq("brand_id", brand.id)
    .eq("is_archived", true)
    .order("archived_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Arşiv"
        title={`${brand.name} arşivlenen test soruları`}
        description="Arşivlenen test soruları yeni ölçümlere girmez. Yanlışlıkla arşivlediğin soruları buradan geri alabilirsin."
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brand.id}/prompts`}>
              Test sorularına dön
            </Link>
          </Button>
        }
      />

      {query.error ? (
        <Card className="border-destructive shadow-sm">
          <CardContent className="pt-6 text-sm text-destructive">
            {query.error}
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Arşivlenen Sorular</CardTitle>
          <CardDescription>
            Geri al dediğinde soru tekrar aktif hale gelir ve yeni ölçümlerde
            kullanılabilir.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {prompts && prompts.length > 0 ? (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      {getIntentLabel(prompt.intent)}
                    </Badge>

                    <Badge variant="outline">
                      Öncelik: {getPriorityLabel(prompt.priority)}
                    </Badge>

                    <Badge variant="outline">
                      {prompt.country || "TR"} / {prompt.language || "tr"}
                      {prompt.city ? ` / ${prompt.city}` : ""}
                    </Badge>

                    <Badge variant="destructive">Arşivli</Badge>
                  </div>

                  <p className="text-sm font-medium leading-6">
                    {prompt.text}
                  </p>

                  <div className="mt-3 flex flex-col justify-between gap-3 border-t pt-3 md:flex-row md:items-center">
                    <p className="text-xs text-muted-foreground">
                      Arşivlenme: {formatDate(prompt.archived_at)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/prompts/${prompt.id}/edit`}>
                          Düzenle
                        </Link>
                      </Button>

                      <form
                        action={`/api/prompts/${prompt.id}/restore`}
                        method="post"
                      >
                        <Button type="submit" size="sm">
                          Geri al
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Arşivlenen test sorusu yok"
              description="Arşivlediğin test soruları burada görünecek."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}