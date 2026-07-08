import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: brandCount } = await supabase
    .from("brands")
    .select("id", { count: "exact", head: true });

  const { count: auditCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true });

  const { data: latestBrands } = await supabase
    .from("brands")
    .select("id, name, industry, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-background p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Genel Bakış
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Markalarının AI cevaplarındaki görünürlüğünü buradan takip edeceksin.
            </p>
          </div>

          <Button asChild>
            <Link href="/dashboard/brands">Markaları görüntüle</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Toplam Marka</CardTitle>
            <CardDescription>Takip edilen marka sayısı</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{brandCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Toplam Audit</CardTitle>
            <CardDescription>Çalıştırılan görünürlük analizi</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{auditCount ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ortalama Skor</CardTitle>
            <CardDescription>Audit sonuçlarından hesaplanacak</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">-</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Son Eklenen Markalar</CardTitle>
            <CardDescription>
              Henüz marka yoksa sıradaki modülde ilk markanı ekleyeceğiz.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestBrands && latestBrands.length > 0 ? (
              <div className="space-y-3">
                {latestBrands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {brand.industry || "Sektör belirtilmedi"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="font-medium">Henüz marka eklenmedi</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  İlk AI görünürlük audit’inizi başlatmak için marka ekleme modülünü hazırlayacağız.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}