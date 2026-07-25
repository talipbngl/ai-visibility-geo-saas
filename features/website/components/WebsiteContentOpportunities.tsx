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

type ContentPageType =
  | "service"
  | "about"
  | "contact"
  | "faq"
  | "guide"
  | "comparison"
  | "pricing"
  | "other";

type Opportunity = {
  title: string;
  evidence: string;
  action: string;
  priority: "Yüksek" | "Orta";
};

const validContentTypes = new Set<ContentPageType>([
  "service",
  "about",
  "contact",
  "faq",
  "guide",
  "comparison",
  "pricing",
  "other",
]);

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

      const record =
        item as Record<string, unknown>;

      const keyword = String(
        record.keyword ?? ""
      ).trim();

      if (!keyword) return null;

      return {
        keyword,
        found: Boolean(record.found),
      };
    })
    .filter(
      (item): item is Signal =>
        item !== null
    );
}

function toContentTypes(
  value: unknown
): ContentPageType[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is ContentPageType =>
      typeof item === "string" &&
      validContentTypes.has(
        item as ContentPageType
      )
  );
}

function getPriorityVariant(
  priority: Opportunity["priority"]
) {
  return priority === "Yüksek"
    ? ("destructive" as const)
    : ("secondary" as const);
}

export function WebsiteContentOpportunities({
  technicalSignalsValue,
  serviceSignalsValue,
  trustSignalsValue,
}: WebsiteContentOpportunitiesProps) {
  const technicalSignals = toRecord(
    technicalSignalsValue
  );

  const contentTypes = new Set(
    toContentTypes(
      technicalSignals.contentTypesFound
    )
  );

  if (technicalSignals.hasAboutLink) {
    contentTypes.add("about");
  }

  if (technicalSignals.hasContactLink) {
    contentTypes.add("contact");
  }

  const serviceSignals = toSignals(
    serviceSignalsValue
  );

  const trustSignals = toSignals(
    trustSignalsValue
  );

  const foundServiceSignals =
    serviceSignals.filter(
      (signal) => signal.found
    );

  const foundTrustSignals =
    trustSignals.filter(
      (signal) => signal.found
    );

  const missingServiceExamples =
    serviceSignals
      .filter((signal) => !signal.found)
      .slice(0, 3)
      .map((signal) => signal.keyword)
      .join(", ");

  const missingTrustExamples =
    trustSignals
      .filter((signal) => !signal.found)
      .slice(0, 3)
      .map((signal) => signal.keyword)
      .join(", ");

  const opportunities: Opportunity[] = [];

  if (
    !contentTypes.has("service") ||
    foundServiceSignals.length < 2
  ) {
    opportunities.push({
      title:
        "Ürün veya hizmet içeriklerini güçlendirin",
      evidence:
        "İncelenen sayfalarda ürün ve hizmetleri ayrıntılı açıklayan içerik kapsamı sınırlı görünüyor.",
      action: missingServiceExamples
        ? `${missingServiceExamples} konuları için ayrı ve açıklayıcı sayfalar hazırlayın.`
        : "Her önemli ürün veya hizmet için özgün bir açıklama sayfası hazırlayın.",
      priority: "Yüksek",
    });
  }

  if (!contentTypes.has("faq")) {
    opportunities.push({
      title:
        "Sık sorulan sorular içeriği hazırlayın",
      evidence:
        "İncelenen sayfalarda kullanıcı sorularını toplu olarak cevaplayan belirgin bir içerik bulunamadı.",
      action:
        "Fiyat, kullanım, teslimat, süreç ve seçim konularındaki gerçek müşteri sorularını kısa cevaplarla açıklayın.",
      priority: "Yüksek",
    });
  }

  if (foundTrustSignals.length < 2) {
    opportunities.push({
      title:
        "Güven kanıtlarını görünür hale getirin",
      evidence:
        "İncelenen içeriklerde markanın güvenilirliğini destekleyen kanıtlar sınırlı görünüyor.",
      action: missingTrustExamples
        ? `${missingTrustExamples} gibi güven unsurlarını gerçek ve doğrulanabilir bilgilerle açıklayın.`
        : "Referans, müşteri yorumu, uzmanlık ve sertifika bilgilerini görünür hale getirin.",
      priority: "Yüksek",
    });
  }

  if (!contentTypes.has("guide")) {
    opportunities.push({
      title:
        "Rehber içerikler oluşturun",
      evidence:
        "İncelenen sayfalarda araştırma yapan kullanıcıları bilgilendiren belirgin bir rehber içeriği bulunamadı.",
      action:
        "Müşterilerin karar vermeden önce sorduğu soruları ayrı rehber yazılarda ayrıntılı biçimde cevaplayın.",
      priority: "Orta",
    });
  }

  if (!contentTypes.has("comparison")) {
    opportunities.push({
      title:
        "Karşılaştırma içerikleri ekleyin",
      evidence:
        "İncelenen sayfalarda seçenekler arasında karar vermeyi kolaylaştıran karşılaştırma içeriği bulunamadı.",
      action:
        "Ürün veya hizmet seçeneklerini kullanım amacı, özellik ve hedef kitle gibi tarafsız ölçütlerle karşılaştırın.",
      priority: "Orta",
    });
  }

  if (
    !contentTypes.has("about") ||
    !contentTypes.has("contact")
  ) {
    opportunities.push({
      title:
        "Kurumsal bilgileri tamamlayın",
      evidence:
        "Hakkımızda veya iletişim bilgilerinden en az biri yeterince görünür değil.",
      action:
        "Markanın kimliğini, uzmanlığını, iletişim kanallarını ve fiziksel konumlarını açıkça gösterin.",
      priority: "Orta",
    });
  }

  const priorityOrder = {
    Yüksek: 2,
    Orta: 1,
  };

  const selectedOpportunities =
    opportunities
      .sort(
        (first, second) =>
          priorityOrder[second.priority] -
          priorityOrder[first.priority]
      )
      .slice(0, 3);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>
          Öncelikli içerik fırsatları
        </CardTitle>

        <CardDescription>
          İncelenen sayfalara göre uygulanabilecek en önemli üç öneri.
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
            İncelenen sayfalarda önemli bir içerik boşluğu tespit edilmedi.
          </p>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Sonuçlar yalnızca taranabilen sayfalara dayanır.
        </p>
      </CardContent>
    </Card>
  );
}