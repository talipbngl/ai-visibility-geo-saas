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

type ReportReadinessPanelProps = {
  auditId: string;
  brandId: string;
  hasScore: boolean;
  hasBrandWebsiteSnapshot: boolean;
  competitorWebsiteSnapshotCount: number;
  recommendationCount: number;
};

function CheckRow({
  title,
  description,
  isReady,
  action,
}: {
  title: string;
  description: string;
  isReady: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 md:flex-row md:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{title}</p>

          <Badge variant={isReady ? "default" : "outline"}>
            {isReady ? "Hazır" : "Eksik"}
          </Badge>
        </div>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

export function ReportReadinessPanel({
  auditId,
  brandId,
  hasScore,
  hasBrandWebsiteSnapshot,
  competitorWebsiteSnapshotCount,
  recommendationCount,
}: ReportReadinessPanelProps) {
  const hasCompetitorWebsiteSnapshots = competitorWebsiteSnapshotCount > 0;
  const hasRecommendations = recommendationCount > 0;

  const isStrongReport =
    hasScore && hasBrandWebsiteSnapshot && hasCompetitorWebsiteSnapshots;

  return (
    <Card
      className={
        isStrongReport
          ? "border-primary/20 bg-primary/5 shadow-sm print:hidden"
          : "border-amber-500/30 bg-amber-500/5 shadow-sm print:hidden"
      }
    >
      <CardHeader>
        <CardTitle>Rapor hazırlık kontrolü</CardTitle>
        <CardDescription>
          Bu bölüm raporun ne kadar kanıta dayalı hazırlandığını gösterir.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <CheckRow
          title="AI cevap analizi"
          description="Markanın AI cevaplarında geçip geçmediği analiz edilmiş olmalı."
          isReady={hasScore}
          action={
            hasScore ? null : (
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/audits/${auditId}`}>
                  Analize git
                </Link>
              </Button>
            )
          }
        />

        <CheckRow
          title="Marka website analizi"
          description="Markanın kendi web sitesindeki hizmet ve güven sinyalleri analiz edilmeli."
          isReady={hasBrandWebsiteSnapshot}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/brands/${brandId}/website`}>
                Website analizi
              </Link>
            </Button>
          }
        />

        <CheckRow
          title="Rakip website analizi"
          description={`${competitorWebsiteSnapshotCount} rakip için website analizi yapılmış.`}
          isReady={hasCompetitorWebsiteSnapshots}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href={`/dashboard/brands/${brandId}/competitors/websites`}>
                Rakip analizleri
              </Link>
            </Button>
          }
        />

        <CheckRow
          title="Kanıta bağlı öneriler"
          description={
            hasRecommendations
              ? `${recommendationCount} aksiyon önerisi mevcut. Website ve rakip analizlerinden sonra önerileri tekrar güncelleyebilirsin.`
              : "Henüz aksiyon önerisi yok. Analizleri tamamladıktan sonra önerileri üret."
          }
          isReady={hasRecommendations}
          action={
            <form
              action={`/api/audits/${auditId}/refresh-recommendations`}
              method="post"
            >
              <Button type="submit" size="sm">
                Önerileri güncelle
              </Button>
            </form>
          }
        />

        <div className="rounded-xl border bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          {isStrongReport ? (
            <p>
              Bu rapor; AI cevap analizi, marka website sinyalleri ve rakip
              website karşılaştırmasıyla daha güçlü hale getirilmiş durumda.
            </p>
          ) : (
            <p>
              Bu rapor görüntülenebilir; ancak daha güçlü ve satılabilir hale
              gelmesi için eksik analizleri tamamlaman önerilir.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}