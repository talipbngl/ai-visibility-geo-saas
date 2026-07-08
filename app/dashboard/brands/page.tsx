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

export default async function BrandsPage() {
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, country, language, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-xl border bg-background p-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Markalar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI görünürlüğünü takip edeceğin markalar burada listelenecek.
          </p>
        </div>

        <Button disabled>Yeni Marka Ekle</Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Marka Listesi</CardTitle>
          <CardDescription>
            Marka ekleme formu bir sonraki modülde aktif olacak.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {brands && brands.length > 0 ? (
            <div className="space-y-3">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border p-4 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {brand.industry || "Sektör belirtilmedi"}
                    </p>
                    {brand.website_url ? (
                      <Link
                        href={brand.website_url}
                        target="_blank"
                        className="text-sm text-muted-foreground underline"
                      >
                        {brand.website_url}
                      </Link>
                    ) : null}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {brand.country || "TR"} / {brand.language || "tr"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Henüz marka yok</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sonraki adımda “Yeni Marka Ekle” formunu yazacağız.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}