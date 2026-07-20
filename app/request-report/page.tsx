import Link from "next/link";

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

type RequestReportPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function RequestReportPage({
  searchParams,
}: RequestReportPageProps) {
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-semibold tracking-tight">
            AI Visibility
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/demo-report">Demo rapor</Link>
            </Button>

            <Button asChild variant="outline">
              <Link href="/login">Giriş yap</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Badge variant="secondary">Rapor talebi</Badge>

          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Markanın AI görünürlük raporunu iste
            </h1>

            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Markanı, web siteni ve sektörünü gönder. AI cevaplarında ne kadar
              görünür olduğunu ve rakiplerine göre nerede durduğunu analiz etmek
              için ilk rapor sürecini başlatalım.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">Ne ölçülür?</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                ChatGPT/Gemini tarzı AI cevaplarında markanın geçip geçmediği,
                rakiplerin görünürlüğü, soru bazlı riskler ve içerik fırsatları.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">Kimler için uygun?</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Yerel işletmeler, klinikler, eğitim kurumları, e-ticaret
                markaları, ajans müşterileri ve hizmet sağlayıcılar.
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">Satış cümlesi</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Google’da görünmek yetmez. Artık AI cevaplarında da önerilen
                marka olmak gerekiyor.
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Rapor talep formu</CardTitle>
            <CardDescription>
              Bilgileri bırak, ilk analiz için seninle iletişime geçelim.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {query.success ? (
  <Card className="mb-5 border-primary/30 bg-primary/5 shadow-sm">
    <CardContent className="pt-6">
      <div className="space-y-2">
        <p className="text-lg font-semibold">
          Talep gönderimi başarılı ✅
        </p>

        <p className="text-sm leading-6 text-muted-foreground">
          Rapor talebin alındı. Markanı ve web siteni inceleyip AI görünürlük
          raporu süreci için en kısa sürede seninle iletişime geçeceğiz.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/demo-report">Demo raporu incele</Link>
          </Button>

          <Button asChild size="sm">
            <Link href="/">Ana sayfaya dön</Link>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
) : null}

            {query.error ? (
              <Alert variant="destructive" className="mb-5">
                <AlertDescription>{query.error}</AlertDescription>
              </Alert>
            ) : null}

            <form
  action="/api/lead-requests"
  method="post"
  className="space-y-5"
>
  <div
    className="sr-only"
    aria-hidden="true"
  >
    <Label htmlFor="companyWebsite">
      Şirket web adresi
    </Label>

    <Input
      id="companyWebsite"
      name="companyWebsite"
      tabIndex={-1}
      autoComplete="off"
    />
  </div>

  <div className="grid gap-4 md:grid-cols-2">
    <div className="space-y-2">
      <Label htmlFor="name">
        Ad soyad *
      </Label>

      <Input
        id="name"
        name="name"
        placeholder="Adın Soyadın"
        maxLength={120}
        required
      />
    </div>

    <div className="space-y-2">
      <Label htmlFor="email">
        E-posta *
      </Label>

      <Input
        id="email"
        name="email"
        type="email"
        placeholder="ornek@mail.com"
        maxLength={254}
        required
      />
    </div>
  </div>

  <div className="space-y-2">
    <Label htmlFor="companyName">
      Marka / şirket adı
    </Label>

    <Input
      id="companyName"
      name="companyName"
      placeholder="Nova Dental Klinik"
      maxLength={120}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="websiteUrl">
      Web sitesi
    </Label>

    <Input
      id="websiteUrl"
      name="websiteUrl"
      placeholder="https://www.ornek.com"
      maxLength={2048}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="industry">
      Sektör
    </Label>

    <Input
      id="industry"
      name="industry"
      placeholder="Diş kliniği / Eğitim / E-ticaret"
      maxLength={100}
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="message">
      Ek not
    </Label>

    <Textarea
      id="message"
      name="message"
      rows={5}
      placeholder="Rakipler, hedef şehir, özel istekler..."
      maxLength={2000}
    />
  </div>

  <Button
    type="submit"
    className="w-full"
  >
    Rapor talebi gönder
  </Button>

  <p className="text-center text-xs text-muted-foreground">
    Formu göndererek rapor talebin için iletişime
    geçilmesini kabul etmiş olursun.
  </p>
</form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
