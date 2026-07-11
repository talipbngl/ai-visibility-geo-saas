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
import { PageHeader } from "@/features/ui/components";

type NewBrandPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewBrandPage({
  searchParams,
}: NewBrandPageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Yeni Marka"
        title="AI görünürlük ölçümü için marka ekle"
        description="Marka bilgileri; test sorusu üretimi, rakip analizi ve rapor yorumları için kullanılır. Ne kadar net bilgi girersen analiz o kadar anlamlı olur."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/brands">Markalara dön</Link>
          </Button>
        }
      />

      {params.error ? (
        <Alert variant="destructive">
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle>İlk rapor için gerekli bilgiler</CardTitle>
            <CardDescription>
              Bu formdan sonra rakipleri ve test sorularını ekleyip ölçüm
              başlatacağız.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border bg-background/80 p-4">
                <p className="font-medium">1. Marka profilini oluştur</p>
                <p className="mt-1 text-muted-foreground">
                  Marka adı, website, sektör ve hedef kitle bilgisini gir.
                </p>
              </div>

              <div className="rounded-xl border bg-background/80 p-4">
                <p className="font-medium">2. Rakipleri ekle</p>
                <p className="mt-1 text-muted-foreground">
                  AI cevaplarında hangi markalarla karşılaştırılacağını belirle.
                </p>
              </div>

              <div className="rounded-xl border bg-background/80 p-4">
                <p className="font-medium">3. Ölçüm başlat</p>
                <p className="mt-1 text-muted-foreground">
                  Test sorularını üret, AI cevaplarını analiz et ve raporu gör.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Marka Profili</CardTitle>
            <CardDescription>
              Zorunlu alan yalnızca marka adı. Diğer alanlar analiz kalitesini
              artırır.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action="/api/brands" method="post" className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Marka adı *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Fit Kahve"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    placeholder="https://www.fitkahve.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="industry">Sektör</Label>
                  <Input
                    id="industry"
                    name="industry"
                    placeholder="Kahve / E-ticaret"
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
                  placeholder="Türkiye'de taze kavrulmuş kahve satan online marka."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                  Her satıra bir farklı yazım gir. AI cevabında marka bu
                  yazımlarla da yakalanır.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button asChild variant="outline">
                  <Link href="/dashboard/brands">Vazgeç</Link>
                </Button>

                <Button type="submit">Markayı kaydet</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}