import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { EmptyState, PageHeader } from "@/features/ui/components";
import { BrandSectionNav } from "@/features/brands/components/BrandSectionNav";

type CompetitorsPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;

  }>;
};

function getWebsiteLabel(value: string | null) {
  if (!value) return "Website eklenmedi";

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function CompetitorsPage({
  params,
  searchParams,
}: CompetitorsPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, industry, country, language")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: competitors } = await supabase
    .from("competitors")
    .select(
      `
      id,
      name,
      website_url,
      description,
      created_at,
      competitor_aliases (
        id,
        alias
      )
    `
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
  eyebrow="Rakipler"
  title={`${brand.name} rakipleri`}
  description="AI cevaplarında markayla karşılaştırılacak rakipleri yönetin."
  actions={
    <Button asChild>
      <Link
        href={`/dashboard/brands/${brand.id}/prompts`}
      >
        Test Sorularına Geç
      </Link>
    </Button>
  }
/>

<BrandSectionNav
  brandId={brand.id}
  active="competitors"
/>

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}
      

{query.message ? (
  <Card className="border-primary/30 bg-primary/5 shadow-sm">
    <CardContent className="pt-6 text-sm">
      {query.message}
    </CardContent>
  </Card>
) : null}
<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3">
  <p className="text-sm text-muted-foreground">
    Rakip eklemek için manuel formu veya AI önerisini kullanabilirsiniz.
  </p>

  <div className="flex flex-wrap gap-2">
    <Button
      asChild
      variant="outline"
      size="sm"
    >
      <Link
        href={`/dashboard/brands/${brand.id}/competitors/websites`}
      >
        Rakip Sitelerini Analiz Et
      </Link>
    </Button>

    <form
      action={`/api/brands/${brand.id}/competitors/generate`}
      method="post"
    >
      <input
        type="hidden"
        name="competitorCount"
        value="5"
      />

      <Button
        type="submit"
        variant="outline"
        size="sm"
      >
        AI ile 5 Rakip Öner
      </Button>
    </form>
  </div>
</div>
      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Yeni Rakip Ekle</CardTitle>
            <CardDescription>
              Rakip adı, web sitesi ve farklı yazımlarını ekle.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              action={`/api/brands/${brand.id}/competitors`}
              method="post"
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Rakip adı *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Kahve Dünyası"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Web sitesi adresi</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  placeholder="https://www.kahvedunyasi.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Kısa açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Türkiye'de bilinirliği yüksek kahve markası."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">farklı yazımlar</Label>
                <Textarea
                  id="aliases"
                  name="aliases"
                  placeholder={"Kahve Dünyası\nkahvedunyasi.com\nKahve Dunyasi"}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Her satıra bir farklı yazım gir. AI cevabında bu yazımlar
                  yakalanacak.
                </p>
              </div>

              <Button type="submit" className="w-full">
                Rakibi kaydet
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Rakip Listesi</CardTitle>
            <CardDescription>
              Ölçüm sırasında AI cevaplarında bu rakiplerin geçip geçmediği
              kontrol edilir.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {competitors && competitors.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {competitors.map((competitor) => (
                  <div
  key={competitor.id}
  className="rounded-xl border p-4 transition-colors hover:bg-muted/30"
>
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="font-medium">{competitor.name}</p>

      {competitor.website_url ? (
        <Link
          href={competitor.website_url}
          target="_blank"
          className="mt-1 block truncate text-sm text-muted-foreground underline underline-offset-4"
        >
          {getWebsiteLabel(competitor.website_url)}
        </Link>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Web sitesi eklenmedi
        </p>
      )}
    </div>

    <Button asChild variant="outline" size="sm">
      <Link href={`/dashboard/competitors/${competitor.id}/edit`}>
        Düzenle
      </Link>
    </Button>
  </div>

  {competitor.description ? (
    <p className="mt-3 text-sm leading-6 text-muted-foreground">
      {competitor.description}
    </p>
  ) : null}

  <div className="mt-4 border-t pt-4">
    <p className="mb-2 text-xs font-medium text-muted-foreground">
      Farklı yazımlar
    </p>

    {competitor.competitor_aliases &&
    competitor.competitor_aliases.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {competitor.competitor_aliases.map((alias) => (
          <Badge key={alias.id} variant="secondary">
            {alias.alias}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-xs text-muted-foreground">
        Farklı yazım eklenmedi.
      </p>
    )}
  </div>
</div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Henüz rakip yok"
                description="İlk AI görünürlük raporunun anlamlı olması için 3-5 rakip ekle."
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}