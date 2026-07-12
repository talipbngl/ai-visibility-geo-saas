import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "AI cevaplarında marka görünürlüğü",
    description:
      "ChatGPT, Gemini ve benzeri AI araçlarının cevaplarında markanız geçiyor mu, hangi sırada geçiyor ve nasıl algılanıyor ölçün.",
  },
  {
    title: "Rakip karşılaştırması",
    description:
      "Rakipleriniz AI cevaplarında sizden daha sık mı öneriliyor? Görünürlük farkını ve fırsat alanlarını görün.",
  },
  {
    title: "Aksiyon odaklı rapor",
    description:
      "Sadece skor değil; içerik, SEO, yerel görünürlük ve güven sinyalleri için uygulanabilir öneriler alın.",
  },
];

const useCases = [
  "Diş klinikleri",
  "Özel eğitim kurumları",
  "Yerel hizmet işletmeleri",
  "E-ticaret markaları",
  "Danışmanlık şirketleri",
  "Ajans müşterileri",
];

const reportItems = [
  "AI görünürlük skoru",
  "Rakiplere göre görünürlük payı",
  "Soru bazlı marka geçme durumu",
  "Olumlu / nötr / olumsuz ton analizi",
  "Rakip görünürlüğü",
  "Risk ve fırsat notları",
  "Aksiyon önerileri",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="font-semibold tracking-tight">
            AI Visibility
          </Link>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Giriş yap</Link>
            </Button>

            <Button asChild>
                <Link href="/request-report">Rapor iste</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <Badge variant="secondary">AI görünürlük raporu</Badge>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
            Markanız AI cevaplarında görünüyor mu?
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Kullanıcılar artık sadece Google’da aramıyor; ChatGPT ve Gemini’ye
            “en iyi seçenek hangisi?” diye soruyor. Biz markanızın bu cevaplarda
            geçip geçmediğini, rakiplere göre konumunu ve görünürlüğü artırmak
            için ne yapılması gerektiğini raporluyoruz.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Markamı analiz et</Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="/demo-report">Demo raporu gör</Link>            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            MVP sürümünde demo rapor ve panel girişinden sonra örnek analiz
            akışını inceleyebilirsin.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle>Örnek rapor özeti</CardTitle>
            <CardDescription>
              Bir markanın AI cevaplarında nasıl göründüğünü tek ekranda
              özetler.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Görünürlük Skoru
                </p>
                <p className="mt-1 text-3xl font-semibold">42/100</p>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Rakip Farkı
                </p>
                <p className="mt-1 text-3xl font-semibold">-36%</p>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Ortalama Sıra
                </p>
                <p className="mt-1 text-3xl font-semibold">3</p>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">
                  Olumlu Ton
                </p>
                <p className="mt-1 text-3xl font-semibold">67%</p>
              </div>
            </div>

            <div className="rounded-xl border bg-background p-4 text-sm leading-6 text-muted-foreground">
              Marka bazı yüksek niyetli sorularda geçiyor; ancak yerel öneri ve
              hizmet bazlı sorularda rakiplerin gerisinde kalıyor.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="shadow-sm">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-2">
        <div>
          <Badge variant="outline">Kimler için?</Badge>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            AI cevaplarından müşteri kazanan her işletme için
          </h2>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Özellikle kullanıcıların “en iyi”, “yakınımdaki”, “güvenilir”,
            “karşılaştırma” ve “hangi markayı seçmeliyim?” gibi sorular sorduğu
            sektörlerde ciddi değer üretir.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {useCases.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Raporda neler var?</CardTitle>
            <CardDescription>
              Müşteriye gösterilecek çıktılar net ve aksiyon odaklıdır.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {reportItems.map((item) => (
                <div key={item} className="rounded-xl border p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">
              İlk AI görünürlük raporunu oluştur
            </CardTitle>
            <CardDescription>
              Markanı ekle, rakiplerini tanımla, test sorularını üret ve AI
              görünürlük raporunu çıkar.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/request-report">Rapor iste</Link>
            </Button>
            <Button asChild>
  <Link href="/request-report">İlk raporu iste</Link>
</Button>

            <Button asChild variant="outline">
              <Link href="/login">Zaten hesabım var</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}