import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CompetitorContentGapProps = {
  brandName: string;
  brandTechnicalSignalsValue: unknown;
  competitors: Array<{
    id: string;
    name: string;
    technicalSignalsValue: unknown;
  }>;
};

type ContentType =
  | "service"
  | "about"
  | "contact"
  | "faq"
  | "guide"
  | "comparison"
  | "pricing";

type ContentCoverage = {
  checked: boolean;
  types: Set<ContentType>;
};

type ContentGap = {
  type: ContentType;
  competitorCount: number;
  competitorNames: string[];
};

const validContentTypes =
  new Set<ContentType>([
    "service",
    "about",
    "contact",
    "faq",
    "guide",
    "comparison",
    "pricing",
  ]);

const contentTypeLabels: Record<
  ContentType,
  string
> = {
  service: "Ürün veya hizmet",
  about: "Kurumsal",
  contact: "İletişim",
  faq: "Sık sorulan sorular",
  guide: "Rehber",
  comparison: "Karşılaştırma",
  pricing: "Fiyatlandırma",
};

const strategicPriority: Record<
  ContentType,
  number
> = {
  faq: 7,
  guide: 6,
  comparison: 5,
  service: 4,
  pricing: 3,
  about: 2,
  contact: 1,
};

function toRecord(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getContentCoverage(
  value: unknown
): ContentCoverage {
  const technicalSignals =
    toRecord(value);

  const rawContentTypes =
    technicalSignals.contentTypesFound;

  if (!Array.isArray(rawContentTypes)) {
    return {
      checked: false,
      types: new Set<ContentType>(),
    };
  }

  const types = new Set(
  rawContentTypes.filter(
    (item): item is ContentType =>
      typeof item === "string" &&
      validContentTypes.has(
        item as ContentType
      )
  )
);

if (
  technicalSignals.hasAboutLink === true
) {
  types.add("about");
}

if (
  technicalSignals.hasContactLink === true
) {
  types.add("contact");
}

return {
  checked: true,
  types,
};
}

export function CompetitorContentGap({
  brandName,
  brandTechnicalSignalsValue,
  competitors,
}: CompetitorContentGapProps) {
  const brandCoverage =
    getContentCoverage(
      brandTechnicalSignalsValue
    );

  const analyzedCompetitors =
    competitors
      .map((competitor) => ({
        ...competitor,
        coverage: getContentCoverage(
          competitor.technicalSignalsValue
        ),
      }))
      .filter(
        (competitor) =>
          competitor.coverage.checked
      );

  const gaps: ContentGap[] = [];

  if (brandCoverage.checked) {
    for (
      const contentType of validContentTypes
    ) {
      if (
        brandCoverage.types.has(contentType)
      ) {
        continue;
      }

      const competitorsWithContent =
        analyzedCompetitors.filter(
          (competitor) =>
            competitor.coverage.types.has(
              contentType
            )
        );

      if (
        competitorsWithContent.length === 0
      ) {
        continue;
      }

      gaps.push({
        type: contentType,
        competitorCount:
          competitorsWithContent.length,
        competitorNames:
          competitorsWithContent.map(
            (competitor) =>
              competitor.name
          ),
      });
    }
  }

  const importantGaps = gaps
    .sort((first, second) => {
      if (
        second.competitorCount !==
        first.competitorCount
      ) {
        return (
          second.competitorCount -
          first.competitorCount
        );
      }

      return (
        strategicPriority[second.type] -
        strategicPriority[first.type]
      );
    })
    .slice(0, 3);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          Rakip içerik açığı
        </CardTitle>

        <CardDescription>
          Rakiplerde bulunan ancak {brandName} sitesinde belirgin olarak görülmeyen içerikler.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!brandCoverage.checked ? (
          <p className="text-sm leading-6 text-muted-foreground">
            İçerik karşılaştırması için marka web sitesi analizini yeniden çalıştırın.
          </p>
        ) : analyzedCompetitors.length ===
          0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Karşılaştırma için en az bir rakibin web sitesi analizini yeniden çalıştırın.
          </p>
        ) : importantGaps.length > 0 ? (
          <div className="space-y-3">
            {importantGaps.map(
              (gap, index) => (
                <div
                  key={gap.type}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {index + 1}
                    </Badge>

                    <Badge variant="secondary">
                      {
                        gap.competitorCount
                      }
                      /
                      {
                        analyzedCompetitors.length
                      }{" "}
                      rakipte var
                    </Badge>
                  </div>

                  <p className="mt-3 font-medium">
                    {
                      contentTypeLabels[
                        gap.type
                      ]
                    }{" "}
                    içeriği
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Bu içerik{" "}
                        {gap.competitorNames
                        .slice(0, 3)
                        .join(", ")}{" "}
                        {gap.competitorCount === 1
                        ? "sitesinde"
                        : "sitelerinde"}{" "}
                        tespit edildi.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Yapılacak:{" "}
                    </span>

                    Rakiplerin içeriğini kopyalamadan, markanın müşterilerine özgü daha açıklayıcı bir sayfa hazırlayın.
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-medium">
              Belirgin içerik açığı bulunmadı
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              İncelenen rakiplerde olup markada bulunmayan önemli bir içerik türü tespit edilmedi.
            </p>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Karşılaştırma yalnızca güncel analizi bulunan sitelerin taranabilen sayfalarına dayanır.
        </p>
      </CardContent>
    </Card>
  );
}