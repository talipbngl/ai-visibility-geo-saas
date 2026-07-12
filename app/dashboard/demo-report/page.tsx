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
import { MetricCard, PageHeader } from "@/features/ui/components";

const competitorVisibility = [
  {
    name: "Rakip A",
    visibility: 78,
    note: "AI cevaplarında sık öneriliyor.",
  },
  {
    name: "Rakip B",
    visibility: 61,
    note: "Karşılaştırma sorularında güçlü.",
  },
  {
    name: "Rakip C",
    visibility: 39,
    note: "Yerel önerilerde sınırlı görünüyor.",
  },
];

const promptResults = [
  {
    question: "İstanbul’da güvenilir diş kliniği önerir misin?",
    brandMentioned: false,
    rank: null,
    sentiment: "Nötr",
    summary:
      "AI cevabı rakip klinikleri önerdi ancak demo marka cevapta yer almadı.",
    risk: "Yerel arama niyetli sorularda marka görünürlüğü düşük.",
    opportunity:
      "Google Business profili, yerel içerikler ve hasta yorumları güçlendirilmeli.",
  },
  {
    question: "Diş implantı için en iyi klinikler hangileri?",
    brandMentioned: true,
    rank: 3,
    sentiment: "Olumlu",
    summary:
      "Marka cevapta geçti ancak ilk öneri olarak konumlanmadı. Rakipler daha güçlü açıklamalarla öne çıktı.",
    risk: "Uzmanlık ve vaka içerikleri rakiplere göre zayıf algılanıyor.",
    opportunity:
      "İmplant tedavisi için uzmanlık sayfası ve doktor profilleri güçlendirilmeli.",
  },
  {
    question: "Çocuk diş hekimi arıyorum, hangi kliniği seçmeliyim?",
    brandMentioned: false,
    rank: null,
    sentiment: "Nötr",
    summary:
      "AI cevabı çocuk diş hekimliği özelinde markayı tanımadı. Rakipler daha net kategori sinyali veriyor.",
    risk: "Hizmet kırılımı AI tarafından yeterince anlaşılmıyor.",
    opportunity:
      "Pedodonti hizmet sayfası, sık sorulan sorular ve lokal içerikler hazırlanmalı.",
  },
];

const recommendations = [
  {
    title: "Hizmet bazlı landing page oluştur",
    priority: "Yüksek",
    impact: "Yüksek",
    effort: "Orta",
    description:
      "İmplant, ortodonti ve çocuk diş hekimliği gibi hizmetler için ayrı sayfalar oluşturulmalı.",
  },
  {
    title: "Yerel otorite sinyallerini güçlendir",
    priority: "Yüksek",
    impact: "Yüksek",
    effort: "Düşük",
    description:
      "Google yorumları, doktor profilleri, adres bilgileri ve yerel anahtar kelimeler daha tutarlı hale getirilmeli.",
  },
  {
    title: "AI cevaplarına uygun SSS içerikleri ekle",
    priority: "Orta",
    impact: "Orta",
    effort: "Düşük",
    description:
      "Kullanıcıların AI araçlarına sorduğu doğal sorulara cevap veren kısa ve net SSS blokları eklenmeli.",
  },
];

export default function DemoReportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Demo Rapor"
        title="AI Görünürlük Demo Raporu"
        description="Bu sayfa satış görüşmelerinde ürünü anlatmak için hazırlanmış örnek rapordur. Gerçek müşteri verisi içermez."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard’a dön</Link>
            </Button>

            <Button asChild>
              <Link href="/dashboard/brands/new">Yeni marka ekle</Link>
            </Button>
          </>
        }
      />

      <section className="rounded-2xl border bg-background p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Örnek Marka
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Nova Dental Klinik
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Bu demo rapor, bir diş kliniğinin ChatGPT/Gemini benzeri AI
              cevaplarında ne kadar göründüğünü, rakiplere göre konumunu ve
              hangi aksiyonlarla görünürlüğünü artırabileceğini gösterir.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>Demo</Badge>
            <Badge variant="secondary">Diş Kliniği</Badge>
            <Badge variant="outline">Türkiye / Türkçe</Badge>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="AI Görünürlük Skoru"
          description="Markanın AI cevaplarında görünme gücü"
          value="42/100"
        />

        <MetricCard
          title="Görünürlük Payı"
          description="Rakiplere göre cevaplardaki pay"
          value="18%"
        />

        <MetricCard
          title="Ortalama Sıra"
          description="Marka geçtiğinde yaklaşık konum"
          value="3"
        />

        <MetricCard
          title="Olumlu Ton"
          description="Marka geçtiğinde algı yönü"
          value="67%"
        />
      </section>

      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader>
          <CardTitle>Yönetici Özeti</CardTitle>
          <CardDescription>
            Satış görüşmesinde müşteriye okunabilecek kısa rapor özeti.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-sm leading-6">
          <p>
            Nova Dental Klinik, AI cevaplarında bazı yüksek niyetli sorularda
            görünse de genel görünürlük seviyesi rakiplerin gerisinde kalıyor.
            Özellikle yerel öneri ve hizmet bazlı sorularda marka yeterince
            güçlü sinyal vermiyor.
          </p>

          <p>
            En büyük fırsat; hizmet sayfalarını güçlendirmek, Google yorumları
            ve uzmanlık sinyallerini artırmak, AI araçlarının anlayacağı net SSS
            içerikleri üretmek.
          </p>
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Rakip Görünürlüğü</CardTitle>
            <CardDescription>
              AI cevaplarında rakiplerin ne kadar güçlü göründüğü.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {competitorVisibility.map((competitor) => (
              <div key={competitor.name} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{competitor.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {competitor.note}
                    </p>
                  </div>

                  <Badge variant="secondary">
                    %{competitor.visibility}
                  </Badge>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${competitor.visibility}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>En Kritik Fırsatlar</CardTitle>
            <CardDescription>
              Görünürlüğü artırmak için öncelikli aksiyonlar.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-xl border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge>{recommendation.priority}</Badge>
                  <Badge variant="secondary">
                    Etki: {recommendation.impact}
                  </Badge>
                  <Badge variant="outline">
                    Efor: {recommendation.effort}
                  </Badge>
                </div>

                <p className="font-medium">{recommendation.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {recommendation.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Soru Bazlı AI Sonuçları</CardTitle>
          <CardDescription>
            AI’a sorulan örnek sorular ve markanın cevaplarda görünme durumu.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {promptResults.map((result) => (
            <div key={result.question} className="rounded-xl border p-4">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge
                  variant={result.brandMentioned ? "default" : "outline"}
                >
                  {result.brandMentioned ? "Marka geçti" : "Marka geçmedi"}
                </Badge>

                <Badge variant="secondary">
                  Sıra: {result.rank ?? "-"}
                </Badge>

                <Badge variant="outline">Ton: {result.sentiment}</Badge>
              </div>

              <p className="font-medium leading-6">{result.question}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm font-medium">Özet</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {result.summary}
                  </p>
                </div>

                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
                  <p className="text-sm font-medium text-destructive">Risk</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {result.risk}
                  </p>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <p className="text-sm font-medium">Fırsat</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {result.opportunity}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Satışta Kullanılacak Kısa Anlatım</CardTitle>
          <CardDescription>
            Müşteri görüşmesinde ürünü anlatmak için kullanabileceğin metin.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border bg-muted/20 p-5 text-sm leading-7">
            <p>
              “Google’da görünmek artık tek başına yeterli değil. İnsanlar
              ChatGPT, Gemini ve benzeri AI araçlarına ‘en iyi klinik hangisi?’
              diye soruyor. Biz bu raporla markanızın bu cevaplarda görünüp
              görünmediğini, rakiplerinize göre nerede durduğunu ve görünürlüğü
              artırmak için hangi içerik/SEO aksiyonlarının gerektiğini
              çıkarıyoruz.”
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}