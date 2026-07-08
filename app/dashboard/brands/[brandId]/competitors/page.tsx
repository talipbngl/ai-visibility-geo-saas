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

type CompetitorsPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CompetitorsPage({
  params,
  searchParams,
}: CompetitorsPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, industry")
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
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <p className="text-sm text-muted-foreground">Rakip yönetimi</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {brand.name} rakipleri
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI cevaplarında markanı hangi rakiplerle karşılaştıracağımızı burada belirliyoruz.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={`/dashboard/brands/${brand.id}`}>Marka detayına dön</Link>
        </Button>
      </section>

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Yeni Rakip Ekle</CardTitle>
            <CardDescription>
              Her marka için en az 3 rakip eklemek iyi bir başlangıçtır.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              action={`/api/brands/${brand.id}/competitors`}
              method="post"
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Rakip adı *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Kronotrop"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  placeholder="https://kronotrop.com.tr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Kısa açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Rakip ne satıyor, hangi konuda güçlü?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">Rakip aliasları</Label>
                <Textarea
                  id="aliases"
                  name="aliases"
                  placeholder={"Kronotrop\nkronotrop.com.tr\nKronotrop Coffee"}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Her satıra bir farklı yazım gir.
                </p>
              </div>

              <Button type="submit" className="w-full">
                Rakibi kaydet
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rakip Listesi</CardTitle>
            <CardDescription>
              Audit sırasında bu rakiplerin AI cevaplarında geçip geçmediği ölçülecek.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {competitors && competitors.length > 0 ? (
              <div className="space-y-4">
                {competitors.map((competitor) => (
                  <div key={competitor.id} className="rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{competitor.name}</p>

                      {competitor.website_url ? (
                        <Link
                          href={competitor.website_url}
                          target="_blank"
                          className="text-sm text-muted-foreground underline"
                        >
                          {competitor.website_url}
                        </Link>
                      ) : null}

                      {competitor.description ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {competitor.description}
                        </p>
                      ) : null}
                    </div>

                    {competitor.competitor_aliases &&
                    competitor.competitor_aliases.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {competitor.competitor_aliases.map((alias) => (
                          <Badge key={alias.id} variant="secondary">
                            {alias.alias}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Alias eklenmedi.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="font-medium">Henüz rakip yok</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  İlk audit raporunun anlamlı olması için 3-5 rakip ekle.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}