import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            AI Visibility / GEO SaaS
          </p>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Markanız AI cevaplarında görünüyor mu?
          </h1>

          <p className="mt-6 text-lg text-muted-foreground">
            ChatGPT, Gemini ve Perplexity gibi AI araçlarında markanızın hangi
            satın alma sorularında göründüğünü, rakiplerinizin nerede öne
            çıktığını ve ne yapmanız gerektiğini raporluyoruz.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/register">Ücretsiz başla</Link>
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link href="/login">Giriş yap</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid w-full gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Prompt bazlı analiz</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Markanızın hangi AI sorularında geçtiğini ölçün.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rakip karşılaştırması</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Rakiplerinizin hangi promptlarda daha görünür olduğunu görün.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aksiyon önerileri</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sadece skor değil, görünürlüğü artıracak yapılacaklar listesi alın.
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}