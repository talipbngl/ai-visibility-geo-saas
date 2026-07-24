import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WebsiteContentOpportunitiesProps = {
  technicalSignalsValue: unknown;
  serviceSignalsValue: unknown;
  trustSignalsValue: unknown;
};

type Signal = {
  keyword: string;
  found: boolean;
};

type AnalyzedPage = {
  url: string;
  title: string | null;
  wordCount: number;
};

type Opportunity = {
  title: string;
  evidence: string;
  action: string;
  priority: "Yüksek" | "Orta" | "Düşük";
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

function toSignals(value: unknown): Signal[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const signal =
        item as Record<string, unknown>;

      const keyword = String(
        signal.keyword ?? ""
      ).trim();

      if (!keyword) return null;

      return {
        keyword,
        found: Boolean(signal.found),
      };
    })
    .filter(
      (item): item is Signal =>
        item !== null
    );
}

function toAnalyzedPages(
  technicalSignals: Record<string, unknown>
): AnalyzedPage[] {
  const value =
    technicalSignals.analyzedPages;

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return null;
      }

      const page =
        item as Record<string, unknown>;

      const url = String(
        page.url ?? ""
      ).trim();

      if (!url) return null;

      return {
        url,
        title:
          typeof page.title === "string"
            ? page.title
            : null,
        wordCount: Number(
          page.wordCount ?? 0
        ),
      };
    })
    .filter(
      (item): item is AnalyzedPage =>
        item !== null
    );
}

function normalizeText(value: string) {
  let decodedValue = value;

  try {
    decodedValue =
      decodeURIComponent(value);
  } catch {
    // Kodlanmış adres çözülemezse mevcut değer kullanılır.
  }

  return decodedValue
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAnyTerm(
  content: string,
  terms: string[]
) {
  return terms.some((term) =>
    content.includes(term)
  );
}

function getPriorityVariant(
  priority: Opportunity["priority"]
) {
  if (priority === "Yüksek") {
    return "destructive" as const;
  }

  if (priority === "Orta") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function WebsiteContentOpportunities({
  technicalSignalsValue,
  serviceSignalsValue,
  trustSignalsValue,
}: WebsiteContentOpportunitiesProps) {
  const technicalSignals = toRecord(
    technicalSignalsValue
  );

  const analyzedPages =
    toAnalyzedPages(technicalSignals);

  const serviceSignals = toSignals(
    serviceSignalsValue
  );

  const trustSignals = toSignals(
    trustSignalsValue
  );

  const pageContent = normalizeText(
    analyzedPages
      .map(
        (page) =>
          `${page.url} ${page.title ?? ""}`
      )
      .join(" ")
  );

  const foundServiceSignals =
    serviceSignals.filter(
      (signal) => signal.found
    );

  const missingServiceSignals =
    serviceSignals.filter(
      (signal) => !signal.found
    );

  const foundTrustSignals =
    trustSignals.filter(
      (signal) => signal.found
    );

  const pageScope =
    analyzedPages.length > 1
      ? `İncelenen ${analyzedPages.length} sayfada`
      : "İncelenen ana sayfada";

  const hasServicePage = containsAnyTerm(
    pageContent,
    [
      "hizmet",
      "service",
      "urun",
      "product",
      "cozum",
      "solution",
      "tedavi",
      "uygulama",
      "kategori",
      "collection",
    ]
  );

  const hasFaqPage = containsAnyTerm(
    pageContent,
    [
      "sik-sorulan",
      "sik sorulan",
      "sss",
      "faq",
    ]
  );

  const hasGuidePage = containsAnyTerm(
    pageContent,
    [
      "blog",
      "rehber",
      "guide",
      "makale",
      "article",
      "bilgi",
    ]
  );

  const hasAboutPage = containsAnyTerm(
    pageContent,
    [
      "hakkimizda",
      "about",
      "kurumsal",
      "ekibimiz",
      "team",
    ]
  );

  const hasContactPage = containsAnyTerm(
    pageContent,
    [
      "iletisim",
      "contact",
      "sube",
      "location",
      "konum",
    ]
  );

  const hasTrustContent = containsAnyTerm(
    pageContent,
    [
      "referans",
      "yorum",
      "testimonial",
      "basari",
      "vaka",
      "case-study",
      "sertifika",
    ]
  );

  const hasComparisonContent =
    containsAnyTerm(
      pageContent,
      [
        "karsilastir",
        "comparison",
        "versus",
        "alternatif",
      ]
    );

  const opportunities: Opportunity[] = [];

  if (
    !hasServicePage ||
    foundServiceSignals.length < 2
  ) {
    const examples =
      missingServiceSignals
        .slice(0, 3)
        .map((signal) => signal.keyword)
        .join(", ");

    opportunities.push({
      title:
        "Hizmet veya ürün sayfalarını güçlendirin",
      evidence: `${pageScope} hizmetleri ayrıntılı açıklayan belirgin bir içerik yapısı sınırlı görünüyor.`,
      action: examples
        ? `${examples} gibi önemli konular için ayrı, açıklayıcı sayfalar hazırlayın.`
        : "Her ana hizmet veya ürün için açıklayıcı ve özgün bir sayfa hazırlayın.",
      priority: "Yüksek",
    });
  }

  if (!hasFaqPage) {
    opportunities.push({
      title:
        "Sık sorulan sorular bölümü oluşturun",
      evidence: `${pageScope} kullanıcıların temel sorularını toplu şekilde cevaplayan belirgin bir bölüm bulunamadı.`,
      action:
        "Fiyat, kullanım, teslimat, süreç, seçim ve güven konularındaki gerçek müşteri sorularını kısa cevaplarla açıklayın.",
      priority: "Yüksek",
    });
  }

  if (
    foundTrustSignals.length < 2 ||
    !hasTrustContent
  ) {
    const missingTrustExamples =
      trustSignals
        .filter(
          (signal) => !signal.found
        )
        .slice(0, 3)
        .map((signal) => signal.keyword)
        .join(", ");

    opportunities.push({
      title:
        "Güven kanıtlarını görünür hale getirin",
      evidence: `${pageScope} müşteri güvenini destekleyen kanıtlar sınırlı görünüyor.`,
      action: missingTrustExamples
        ? `${missingTrustExamples} gibi güven unsurlarını gerçek ve doğrulanabilir bilgilerle açıklayın.`
        : "Müşteri yorumları, referanslar, uzmanlık bilgileri ve sertifikaları görünür hale getirin.",
      priority: "Yüksek",
    });
  }

  if (!hasGuidePage) {
    opportunities.push({
      title:
        "Rehber ve bilgilendirici içerikler hazırlayın",
      evidence: `${pageScope} araştırma yapan kullanıcılara yönelik belirgin bir rehber veya bilgi içeriği bulunamadı.`,
      action:
        "Müşterilerin seçim yapmadan önce sorduğu soruları ayrı rehber içeriklerde ayrıntılı olarak cevaplayın.",
      priority: "Orta",
    });
  }

  if (
    !hasAboutPage ||
    !hasContactPage
  ) {
    opportunities.push({
      title:
        "Kurumsal bilgileri tamamlayın",
      evidence: `${pageScope} hakkımızda veya iletişim içeriği yeterince belirgin değil.`,
      action:
        "Markanın kim olduğunu, uzmanlığını, iletişim kanallarını ve varsa fiziksel konumlarını açıkça gösterin.",
      priority: "Orta",
    });
  }

  if (!hasComparisonContent) {
    opportunities.push({
      title:
        "Karşılaştırma içerikleri ekleyin",
      evidence: `${pageScope} müşterinin alternatifler arasında seçim yapmasına yardımcı olan belirgin bir içerik bulunamadı.`,
      action:
        "Ürün, hizmet veya çözüm seçeneklerini tarafsız ölçütlerle karşılaştıran içerikler hazırlayın.",
      priority: "Orta",
    });
  }

  const priorityOrder = {
    Yüksek: 3,
    Orta: 2,
    Düşük: 1,
  };

  const selectedOpportunities =
    opportunities
      .sort(
        (first, second) =>
          priorityOrder[second.priority] -
          priorityOrder[first.priority]
      )
      .slice(0, 5);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          İçerik fırsatları
        </CardTitle>

        <CardDescription>
          İncelenen sayfalara göre uygulanabilecek en önemli içerik önerileri.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {selectedOpportunities.length > 0 ? (
          <div className="space-y-3">
            {selectedOpportunities.map(
              (opportunity, index) => (
                <div
                  key={opportunity.title}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {index + 1}
                    </Badge>

                    <Badge
                      variant={getPriorityVariant(
                        opportunity.priority
                      )}
                    >
                      {opportunity.priority} öncelik
                    </Badge>
                  </div>

                  <p className="mt-3 font-medium">
                    {opportunity.title}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Neden:{" "}
                    </span>

                    {opportunity.evidence}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Yapılacak:{" "}
                    </span>

                    {opportunity.action}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            İncelenen sayfalarda belirgin bir içerik boşluğu tespit edilmedi.
          </p>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Öneriler yalnızca taranabilen sayfalara dayanır. Taranmayan bir içerik sitede mevcut olabilir.
        </p>
      </CardContent>
    </Card>
  );
}