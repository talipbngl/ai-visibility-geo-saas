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

type EditBrandPageProps = {
  params: Promise<{
    brandId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditBrandPage({
  params,
  searchParams,
}: EditBrandPageProps) {
  const { brandId } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, website_url, industry, country, language, description, target_audience, primary_offer"
    )
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) {
    notFound();
  }

  const { data: aliases } = await supabase
    .from("brand_aliases")
    .select("alias")
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: true });

  const aliasText = (aliases ?? []).map((item) => item.alias).join("\n");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Marka Düzenleme"
        title={`${brand.name} bilgilerini düzenle`}
        description="Marka bilgilerini güncelle. Bu değişiklikler yeni test sorusu üretimi ve yeni ölçümler için kullanılacak."
        actions={
          <Button asChild variant="outline">
            <Link href={`/dashboard/brands/${brand.id}`}>
              Marka detayına dön
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
              Eski raporlar etkilenmez. Yeni ölçümler güncel marka bilgilerine
              göre oluşturulur.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Aliasları dikkatli gir</p>
              <p className="mt-1 text-muted-foreground">
                Marka farklı yazımlarla geçiyorsa her satıra bir alias ekle.
              </p>
            </div>

            <div className="rounded-xl border bg-background/80 p-4">
              <p className="font-medium">Website URL önemli</p>
              <p className="mt-1 text-muted-foreground">
                Raporlarda ve analiz açıklamalarında marka bağlamını güçlendirir.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Marka Profili</CardTitle>
            <CardDescription>
              Marka adı zorunlu. Diğer alanlar analiz kalitesini artırır.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              action={`/api/brands/${brand.id}`}
              method="post"
              className="space-y-5"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Marka adı *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={brand.name}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    defaultValue={brand.website_url ?? ""}
                    placeholder="https://www.ornek.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="industry">Sektör</Label>
                  <Input
                    id="industry"
                    name="industry"
                    defaultValue={brand.industry ?? ""}
                    placeholder="Kahve / E-ticaret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Ülke</Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue={brand.country ?? "TR"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Dil</Label>
                  <Input
                    id="language"
                    name="language"
                    defaultValue={brand.language ?? "tr"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Kısa açıklama</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={brand.description ?? ""}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Hedef kitle</Label>
                  <Textarea
                    id="targetAudience"
                    name="targetAudience"
                    defaultValue={brand.target_audience ?? ""}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryOffer">Ana ürün / teklif</Label>
                  <Textarea
                    id="primaryOffer"
                    name="primaryOffer"
                    defaultValue={brand.primary_offer ?? ""}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">Marka aliasları</Label>
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
                  <Link href={`/dashboard/brands/${brand.id}`}>Vazgeç</Link>
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