import Link from "next/link";

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

type NewBrandPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewBrandPage({ searchParams }: NewBrandPageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Yeni Marka Ekle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI görünürlüğünü takip etmek istediğin markayı tanımla.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/brands">Markalara dön</Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Marka Profili</CardTitle>
          <CardDescription>
            Bu bilgiler prompt üretimi, rakip analizi ve audit raporu için temel veri olacak.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {params.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{params.error}</AlertDescription>
            </Alert>
          ) : null}

          <form action="/api/brands" method="post" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Marka adı *</Label>
              <Input
                id="name"
                name="name"
                placeholder="FitKahve"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website URL</Label>
              <Input
                id="websiteUrl"
                name="websiteUrl"
                placeholder="https://fitkahve.com"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="industry">Sektör</Label>
                <Input
                  id="industry"
                  name="industry"
                  placeholder="Kahve / e-ticaret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Ülke</Label>
                <Input id="country" name="country" defaultValue="TR" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Dil</Label>
                <Input id="language" name="language" defaultValue="tr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Kısa açıklama</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Marka ne satıyor, hangi problemi çözüyor?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Hedef kitle</Label>
              <Textarea
                id="targetAudience"
                name="targetAudience"
                placeholder="Evde kaliteli kahve içmek isteyen 25-40 yaş arası kullanıcılar"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primaryOffer">Ana ürün / teklif</Label>
              <Textarea
                id="primaryOffer"
                name="primaryOffer"
                placeholder="Uygun fiyatlı, taze kavrulmuş filtre kahve ve abonelik paketi"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aliases">Marka aliasları</Label>
              <Textarea
                id="aliases"
                name="aliases"
                placeholder={"Fit Kahve\nfitkahve.com\nFitKahve Türkiye"}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Her satıra bir farklı yazım gir.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/brands">Vazgeç</Link>
              </Button>

              <Button type="submit">Markayı kaydet</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}