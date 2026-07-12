import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/features/ui/components";

type EditCompetitorPageProps = {
  params: Promise<{
    competitorId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditCompetitorPage({
  params,
  searchParams,
}: EditCompetitorPageProps) {
  const { competitorId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, brand_id, name, website_url, description")
    .eq("id", competitorId)
    .maybeSingle();

  if (!competitor) {
    notFound();
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", competitor.brand_id)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: aliases } = await supabase
    .from("competitor_aliases")
    .select("alias")
    .eq("competitor_id", competitor.id)
    .order("created_at", { ascending: true });

  const aliasText = (aliases ?? []).map((item) => item.alias).join("\n");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rakip Düzenleme"
        title={`${competitor.name} bilgilerini düzenle`}
        description={`${brand.name} markası için rakip bilgilerini ve aliasları güncelle.`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brand.id}/competitors`}>
              Rakiplere dön
            </Link>
          </Button>
        }
      />

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle>Düzenleme notu</CardTitle>
            <CardDescription>
              Rakip bilgileri yeni analizlerde kullanılır. Eski raporların
              çıktısı bozulmaz.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Aliaslar önemli</p>
              <p className="mt-1 text-muted-foreground">
                AI cevabında rakip farklı yazımlarla geçebilir. Her satıra bir
                farklı yazım ekle.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Rakip adı net olmalı</p>
              <p className="mt-1 text-muted-foreground">
                Analiz motoru rakip görünürlüğünü bu ad ve aliaslar üzerinden
                yakalar.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Rakip Profili</CardTitle>
            <CardDescription>
              Rakip adı zorunlu. Website ve açıklama analiz bağlamını
              güçlendirir.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              action={`/api/competitors/${competitor.id}`}
              method="post"
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Rakip adı *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={competitor.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  defaultValue={competitor.website_url ?? ""}
                  placeholder="https://www.ornek-rakip.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Kısa açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={competitor.description ?? ""}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">Rakip aliasları</Label>
                <Textarea
                  id="aliases"
                  name="aliases"
                  defaultValue={aliasText}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Her satıra bir farklı yazım gir.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/brands/${brand.id}/competitors`}>
                    Vazgeç
                  </Link>
                </Button>

                <Button type="submit">Değişiklikleri kaydet</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}