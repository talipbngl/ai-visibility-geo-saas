import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/features/ui/components";

type CountRow = {
  brand_id: string | null;
};

function buildCountMap(rows: CountRow[] | null | undefined) {
  const map = new Map<string, number>();

  (rows ?? []).forEach((row) => {
    if (!row.brand_id) return;

    map.set(row.brand_id, (map.get(row.brand_id) ?? 0) + 1);
  });

  return map;
}

function getWebsiteLabel(value: string | null) {
  if (!value) return null;

  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function BrandsPage() {
  const supabase = await createClient();

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, website_url, industry, country, language, created_at")
    .order("created_at", { ascending: false });

  const brandIds = (brands ?? []).map((brand) => brand.id);

  const competitorsResult =
    brandIds.length > 0
      ? await supabase
          .from("competitors")
          .select("brand_id")
          .in("brand_id", brandIds)
      : { data: [] };

  const promptsResult =
    brandIds.length > 0
      ? await supabase
          .from("prompts")
          .select("brand_id")
          .in("brand_id", brandIds)
      : { data: [] };

  const auditsResult =
    brandIds.length > 0
      ? await supabase
          .from("audits")
          .select("brand_id")
          .in("brand_id", brandIds)
      : { data: [] };

  const competitorCountByBrandId = buildCountMap(competitorsResult.data);
  const promptCountByBrandId = buildCountMap(promptsResult.data);
  const auditCountByBrandId = buildCountMap(auditsResult.data);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Markalar"
        title="Takip ettiğin markalar"
        description="AI görünürlük ölçümü yapacağın markaları buradan yönet. Her marka için rakipleri, test sorularını ve raporları ayrı takip edebilirsin."
        actions={
          <Button asChild>
            <Link href="/dashboard/brands/new">Yeni marka ekle</Link>
          </Button>
        }
      />

      {brands && brands.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => {
            const websiteLabel = getWebsiteLabel(brand.website_url);

            return (
              <Card key={brand.id} className="shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{brand.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {brand.industry || "Sektör belirtilmedi"}
                      </CardDescription>
                    </div>

                    <Badge variant="secondary">
                      {brand.country || "TR"} / {brand.language || "tr"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {websiteLabel ? (
                    <p className="text-sm text-muted-foreground">
                      {websiteLabel}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Website eklenmedi
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="font-semibold">
                        {competitorCountByBrandId.get(brand.id) ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Rakip</p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="font-semibold">
                        {promptCountByBrandId.get(brand.id) ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Soru</p>
                    </div>

                    <div className="rounded-lg border p-3">
                      <p className="font-semibold">
                        {auditCountByBrandId.get(brand.id) ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Ölçüm</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/brands/${brand.id}`}>
                        Detay
                      </Link>
                    </Button>

                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/brands/${brand.id}/competitors`}>
                        Rakipler
                      </Link>
                    </Button>

                    <Button asChild size="sm">
                      <Link href={`/dashboard/brands/${brand.id}/prompts`}>
                        Test soruları
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="Henüz marka yok"
          description="İlk AI görünürlük raporunu oluşturmak için önce takip etmek istediğin markayı ekle."
          action={
            <Button asChild>
              <Link href="/dashboard/brands/new">İlk markayı ekle</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}