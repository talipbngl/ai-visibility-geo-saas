import type { BrandStrategyContext } from "@/lib/strategy/business-archetypes";
import { buildContentActionBlueprint } from "@/lib/strategy/content-action-blueprints";
import { resolvePromptIntent } from "@/lib/strategy/prompt-intents";

export { resolvePromptIntent as resolveReportIntent } from "@/lib/strategy/prompt-intents";

export type ClientReportCompetitorMention = {
  name: string;
  mentioned: boolean;
  rank: number | null;
};

export type ClientReportRun = {
  id: string;
  promptText: string;
  promptIntent: string | null;
  promptPriority: number | null;
  brandMentioned: boolean;
  brandRank: number | null;
  brandSentiment: string | null;
  rawAnswer: string;
  engine: string | null;
  model: string | null;
  competitors: ClientReportCompetitorMention[];
};

export type ClientEvidenceItem = {
  id: string;
  promptText: string;
  promptIntent: string | null;
  status: "missing" | "visible" | "low_rank";
  brandRank: number | null;
  mentionedCompetitors: string[];
  answerExcerpt: string;
  engineLabel: string;
};

export type ClientActionBrief = {
  id: string;
  week: number;
  priority: "Yüksek" | "Orta";
  title: string;
  reason: string;
  targetPrompt: string;
  deliverable: string;
  suggestedPath: string;
  requiredSections: string[];
  successMetric: string;
};

type AnalyzedPage = {
  url: string;
  title: string;
  h1Count: number | null;
  indexable: boolean | null;
  metaDescription: string | null;
  metaDescriptionChecked: boolean;
  canonicalUrl: string | null;
  canonicalChecked: boolean;
  schemaTypes: string[];
  schemaChecked: boolean;
};

export type ClientReportBriefs = {
  evidenceItems: ClientEvidenceItem[];
  actionBriefs: ClientActionBrief[];
};

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

const genericOfferKeywords = new Set([
  "hizmet",
  "ürün",
  "çözüm",
  "paket",
  "fiyat",
  "kampanya",
  "randevu",
  "online",
  "destek",
  "başvuru",
  "iletişim",
]);

function normalizeKeyword(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function getFoundKeywordSignals(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const foundKeywords = value
    .map((rawSignal) => {
      const signal = toRecord(rawSignal);
      const keyword = String(signal.keyword ?? "").trim();
      const found =
        signal.found === true || Number(signal.count ?? 0) > 0;

      return found && keyword ? keyword : null;
    })
    .filter((keyword): keyword is string => keyword !== null);

  const sectorSpecificKeywords = foundKeywords.filter(
    (keyword) =>
      !genericOfferKeywords.has(normalizeKeyword(keyword))
  );

  /*
   * Genel tarama kelimeleri preset dizisinin başında yer alır. En az bir
   * sektörel sinyal bulunduğunda "hizmet, ürün, çözüm" gibi yüzeysel
   * kelimeleri rapora taşımak yerine doğrudan sektörel sinyalleri kullanırız.
   * Bilinmeyen sektörlerde ise genel kelimeler güvenli geri dönüş olarak kalır.
   */
  return sectorSpecificKeywords.length > 0
    ? sectorSpecificKeywords
    : foundKeywords;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getAnalyzedPages(value: unknown): AnalyzedPage[] {
  const technicalSignals = toRecord(value);
  const rawPages = technicalSignals.analyzedPages;

  if (!Array.isArray(rawPages)) {
    return [];
  }

  return rawPages
    .map((rawPage) => {
      const page = toRecord(rawPage);
      const url = String(page.url ?? "").trim();

      if (!url) return null;

      const metaDescriptionChecked =
        Object.prototype.hasOwnProperty.call(
          page,
          "metaDescription"
        );

      const canonicalChecked =
        Object.prototype.hasOwnProperty.call(
          page,
          "canonicalUrl"
        );

      const schemaChecked =
        Object.prototype.hasOwnProperty.call(
          page,
          "schemaTypes"
        );

      const schemaTypes = Array.isArray(page.schemaTypes)
        ? page.schemaTypes
            .filter(
              (item): item is string =>
                typeof item === "string"
            )
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      return {
        url,
        title: String(page.title ?? "").trim() || url,
        h1Count: toNullableNumber(page.h1Count),
        indexable:
          typeof page.indexable === "boolean"
            ? page.indexable
            : null,
        metaDescription:
          typeof page.metaDescription === "string" &&
          page.metaDescription.trim()
            ? page.metaDescription.trim()
            : null,
        metaDescriptionChecked,
        canonicalUrl:
          typeof page.canonicalUrl === "string" &&
          page.canonicalUrl.trim()
            ? page.canonicalUrl.trim()
            : null,
        canonicalChecked,
        schemaTypes,
        schemaChecked,
      };
    })
    .filter(
      (page): page is AnalyzedPage => page !== null
    );
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getAnswerExcerpt({
  answer,
  terms,
  maximumLength = 360,
}: {
  answer: string;
  terms: string[];
  maximumLength?: number;
}) {
  const normalizedAnswer = normalizeWhitespace(answer);

  if (!normalizedAnswer) {
    return "AI cevabı kaydedilmedi.";
  }

  const lowerAnswer = normalizedAnswer.toLocaleLowerCase("tr-TR");
  const firstIndex = terms
    .map((term) =>
      lowerAnswer.indexOf(
        term.toLocaleLowerCase("tr-TR")
      )
    )
    .filter((index) => index >= 0)
    .sort((first, second) => first - second)[0];

  const start =
    firstIndex === undefined
      ? 0
      : Math.max(0, firstIndex - 90);
  const wordSafeStart =
    start > 0
      ? Math.max(
          0,
          normalizedAnswer.lastIndexOf(" ", start) + 1
        )
      : 0;
  const rawEnd = Math.min(
    normalizedAnswer.length,
    wordSafeStart + maximumLength
  );
  const minimumNaturalEnd =
    wordSafeStart + Math.floor(maximumLength * 0.65);
  const excerptWindow = normalizedAnswer.slice(
    wordSafeStart,
    rawEnd
  );
  const sentenceEnd = Math.max(
    excerptWindow.lastIndexOf(". "),
    excerptWindow.lastIndexOf("? "),
    excerptWindow.lastIndexOf("! ")
  );
  const sentenceSafeEnd =
    sentenceEnd >= minimumNaturalEnd - wordSafeStart
      ? wordSafeStart + sentenceEnd + 1
      : null;
  const lastWhitespace = normalizedAnswer.lastIndexOf(
    " ",
    rawEnd
  );
  const wordSafeEnd =
    rawEnd < normalizedAnswer.length &&
    lastWhitespace >= minimumNaturalEnd
      ? lastWhitespace
      : rawEnd;
  const end = sentenceSafeEnd ?? wordSafeEnd;
  const excerpt = normalizedAnswer
    .slice(wordSafeStart, end)
    .trim();

  return `${wordSafeStart > 0 ? "…" : ""}${excerpt}${
    end < normalizedAnswer.length ? "…" : ""
  }`;
}

function getEngineLabel(run: ClientReportRun) {
  const engine = run.engine?.trim() || "Gemini";
  const model = run.model?.trim();

  return model ? `${engine} · ${model}` : engine;
}

function getEvidenceStatus(run: ClientReportRun) {
  if (!run.brandMentioned) return "missing" as const;
  if (run.brandRank !== null && run.brandRank > 2) {
    return "low_rank" as const;
  }

  return "visible" as const;
}

function buildEvidenceItems({
  brandName,
  runs,
}: {
  brandName: string;
  runs: ClientReportRun[];
}) {
  const sortedRuns = [...runs].sort((first, second) => {
    if (first.brandMentioned !== second.brandMentioned) {
      return first.brandMentioned ? 1 : -1;
    }

    const firstRank = first.brandRank ?? 999;
    const secondRank = second.brandRank ?? 999;

    if (firstRank !== secondRank) {
      return secondRank - firstRank;
    }

    return (
      (second.promptPriority ?? 0) -
      (first.promptPriority ?? 0)
    );
  });

  const selectedRuns: ClientReportRun[] = [];
  const missingRuns = sortedRuns.filter(
    (run) => !run.brandMentioned
  );
  const visibleRuns = sortedRuns.filter(
    (run) => run.brandMentioned
  );

  selectedRuns.push(...missingRuns.slice(0, 3));

  if (selectedRuns.length < 4) {
    selectedRuns.push(
      ...visibleRuns.slice(0, 4 - selectedRuns.length)
    );
  }

  return selectedRuns.map((run): ClientEvidenceItem => {
    const mentionedCompetitors = run.competitors
      .filter((competitor) => competitor.mentioned)
      .sort(
        (first, second) =>
          (first.rank ?? 999) - (second.rank ?? 999)
      )
      .map((competitor) => competitor.name);

    return {
      id: run.id,
      promptText: run.promptText,
      promptIntent: resolvePromptIntent(
        run.promptText,
        run.promptIntent
      ),
      status: getEvidenceStatus(run),
      brandRank: run.brandRank,
      mentionedCompetitors,
      answerExcerpt: getAnswerExcerpt({
        answer: run.rawAnswer,
        terms: [brandName, ...mentionedCompetitors],
        maximumLength: 240,
      }),
      engineLabel: getEngineLabel(run),
    };
  });
}

function buildPromptActions({
  brandName,
  brandContext,
  runs,
  detectedServiceKeywords,
}: {
  brandName: string;
  brandContext: BrandStrategyContext;
  runs: ClientReportRun[];
  detectedServiceKeywords: string[];
}) {
  const invisibleRuns = runs
    .filter((run) => !run.brandMentioned)
    .sort(
      (first, second) =>
        (second.promptPriority ?? 0) -
        (first.promptPriority ?? 0)
    );

  const lowRankRuns = runs
    .filter(
      (run) =>
        run.brandMentioned &&
        run.brandRank !== null &&
        run.brandRank > 2
    )
    .sort(
      (first, second) =>
        (second.brandRank ?? 0) -
        (first.brandRank ?? 0)
    );

  const targetRuns =
    invisibleRuns.length > 0
      ? invisibleRuns.slice(0, 2)
      : lowRankRuns.slice(0, 1);

  return targetRuns.map(
    (run, index): ClientActionBrief => {
      const strongestCompetitor = run.competitors
        .filter((competitor) => competitor.mentioned)
        .sort(
          (first, second) =>
            (first.rank ?? 999) - (second.rank ?? 999)
        )[0];
      const blueprint = buildContentActionBlueprint({
        brandName,
        brandContext,
        promptText: run.promptText,
        intent: resolvePromptIntent(
          run.promptText,
          run.promptIntent
        ),
        strongestCompetitorName:
          strongestCompetitor?.name ?? null,
        detectedServiceKeywords,
      });
      const mentionedCompetitors = run.competitors
        .filter((competitor) => competitor.mentioned)
        .map((competitor) => competitor.name);

      return {
          id: `prompt-${run.id}`,
          week: index + 1,
          priority: "Yüksek",
          title: `"${run.promptText}" sorusu için ilgili sayfayı güçlendir`,
          reason: run.brandMentioned
            ? `${brandName}, bu sorunun cevabında ${
                run.brandRank ?? "alt"
              }. sırada yer aldı. İlgili mevcut sayfa; karar kriterleri, teknik kanıtlar ve doğrudan cevap bölümüyle güçlendirilmelidir.`
            : mentionedCompetitors.length > 0
              ? `${brandName} cevapta görünmezken ${mentionedCompetitors
                  .slice(0, 3)
                  .join(
                    ", "
                  )} görünür durumda. Önce bu soruyla ilişkili mevcut marka sayfası kontrol edilmeli; yeterli değilse güçlendirilmeli, ilgili sayfa bulunmuyorsa önerilen adreste yeni bir karar sayfası hazırlanmalıdır.`
              : `${brandName} bu sorunun cevabında görünmedi. Önce mevcut ürün, hizmet ve rehber sayfalarının soruyu doğrudan karşılayıp karşılamadığı doğrulanmalı; uygun sayfa varsa güncellenmeli, yoksa önerilen yapıda yeni bir sayfa oluşturulmalıdır.`,
          targetPrompt: run.promptText,
          deliverable: blueprint.deliverable,
          suggestedPath: blueprint.suggestedPath,
          requiredSections: [
            "Önce aynı konuya hizmet eden mevcut ürün, hizmet veya rehber sayfasını kontrol et",
            ...blueprint.requiredSections,
          ],
          successMetric: `Aynı ölçüm koşullarıyla yapılacak yeniden testte ${brandName} adının cevapta görünmesi${
            run.brandMentioned
              ? " ve ilk iki öneri arasına yükselmesi"
              : ""
          }.`,
        };
    }
  );
}

function buildWebsiteAction({
  technicalSignalsValue,
}: {
  technicalSignalsValue: unknown;
}): ClientActionBrief | null {
  const analyzedPages = getAnalyzedPages(
    technicalSignalsValue
  );

  const nonIndexablePage = analyzedPages.find(
    (page) => page.indexable === false
  );

  if (nonIndexablePage) {
    return {
      id: `website-index-${nonIndexablePage.url}`,
      week: 1,
      priority: "Yüksek",
      title: `${nonIndexablePage.title} sayfasındaki indeksleme engelini kaldır`,
      reason: `${nonIndexablePage.url} taramada indekslenemez olarak tespit edildi. AI arama sistemlerinin bu sayfayı kaynak olarak değerlendirebilmesi için önce erişim ve indeksleme engeli çözülmeli.`,
      targetPrompt: "Teknik erişilebilirlik",
      deliverable: "İndeksleme düzeltmesi",
      suggestedPath: nonIndexablePage.url,
      requiredSections: [
        "Meta robots ve X-Robots-Tag değerlerini kontrol et",
        "Canonical adresin sayfanın doğru URL’sini gösterdiğini doğrula",
        "robots.txt engeli bulunmadığını kontrol et",
        "Sayfayı sitemap.xml içine ekle",
        "Düzeltme sonrası URL’yi yeniden analiz et",
      ],
      successMetric:
        "Yeniden analizde sayfanın `indexable: true` olarak görünmesi.",
    };
  }

  const invalidHeadingPages = analyzedPages.filter(
  (page) =>
    page.h1Count !== null && page.h1Count !== 1
);

if (invalidHeadingPages.length > 0) {
  const affectedPageLabels = invalidHeadingPages
    .slice(0, 4)
    .map(
      (page) =>
        `${page.title} (${page.h1Count} H1)`
    )
    .join(", ");

  const affectedUrls = invalidHeadingPages
    .slice(0, 3)
    .map((page) => page.url);

  return {
    id: "website-heading-structure",
    week: 1,
    priority: "Yüksek",
    title: `${invalidHeadingPages.length}/${analyzedPages.length} taranan sayfada H1 yapısını düzelt`,
    reason: `Tek H1 kuralını karşılamayan sayfalar: ${affectedPageLabels}. Her sayfanın ana konusu kullanıcıya ve arama sistemlerine tek bir açıklayıcı H1 ile aktarılmalıdır.`,
    targetPrompt: "Sayfa konusu ve içerik hiyerarşisi",
    deliverable: `${invalidHeadingPages.length} sayfada başlık hiyerarşisi düzenlemesi`,
    suggestedPath:
      affectedUrls.length > 0
        ? affectedUrls.join(", ")
        : "Taranan sayfalar",
    requiredSections: [
      "Her sorunlu sayfada yalnızca bir açıklayıcı H1 kullan",
      "Görsel sloganları veya tekrar eden başlıkları H2 ya da normal metin seviyesine taşı",
      "H2 başlıklarını sayfanın ana bölümleri için kullan",
      "H3 başlıklarını yalnızca ilgili H2 bölümünün alt detaylarında kullan",
      "Düzeltme sonrasında tüm sorunlu URL’leri yeniden tara",
    ],
    successMetric: `Yeniden analizde ${invalidHeadingPages.length} sorunlu sayfanın tamamında H1 sayısının 1 görünmesi.`,
  };
}

  const missingDescriptionPage = analyzedPages.find(
  (page) =>
    page.metaDescriptionChecked &&
    !page.metaDescription
);

  if (missingDescriptionPage) {
    return {
      id: `website-meta-${missingDescriptionPage.url}`,
      week: 2,
      priority: "Orta",
      title: `${missingDescriptionPage.title} sayfasına özgün açıklama ekle`,
      reason: `${missingDescriptionPage.url} için meta açıklama tespit edilmedi. Sayfanın konusu ve sunduğu değer arama ve AI sistemlerine kısa biçimde açıklanmalı.`,
      targetPrompt: "Sayfa bağlamı",
      deliverable: "Meta açıklama",
      suggestedPath: missingDescriptionPage.url,
      requiredSections: [
        "Sayfanın ana konusunu ilk 70 karakter içinde açıkla",
        "Kullanıcıya sunulan somut değeri belirt",
        "Marka adını doğal biçimde bir kez kullan",
        "Başka sayfalardaki açıklamayı kopyalama",
        "Yaklaşık 140-160 karakterlik özgün metin kullan",
      ],
      successMetric:
        "Yeniden analizde sayfanın meta açıklamasının dolu ve benzersiz görünmesi.",
    };
  }
const missingCanonicalPages = analyzedPages.filter(
  (page) =>
    page.canonicalChecked &&
    !page.canonicalUrl
);

const firstMissingCanonicalPage =
  missingCanonicalPages[0];

if (firstMissingCanonicalPage) {
  const visibleCanonicalPages =
  missingCanonicalPages.slice(0, 4);

const hiddenCanonicalPageCount =
  missingCanonicalPages.length -
  visibleCanonicalPages.length;

const affectedPageLabels = visibleCanonicalPages
  .map((page) => page.title)
  .join(", ");

const affectedPageSummary =
  hiddenCanonicalPageCount > 0
    ? `${affectedPageLabels} ve ${hiddenCanonicalPageCount} sayfa daha`
    : affectedPageLabels;

  return {
    id: "website-canonical-coverage",
    week: 3,
    priority: "Orta",
    title: `${missingCanonicalPages.length}/${analyzedPages.length} taranan sayfada canonical adresi tanımla`,
    reason: `Canonical alanı ölçülen ancak değeri bulunmayan sayfalar: ${affectedPageSummary}. Her sayfa, tercih edilen tek ve nihai URL’sini açıkça belirtmelidir.`,
    targetPrompt: "Tercih edilen sayfa adresi",
    deliverable: `${missingCanonicalPages.length} sayfada canonical düzenlemesi`,
    suggestedPath: firstMissingCanonicalPage.url,
    requiredSections: [
      "Her sayfanın head alanına kendisini gösteren canonical etiketi ekle",
      "Canonical adreslerde nihai HTTPS URL’sini kullan",
      "www, www olmayan ve yönlendirilmiş URL sürümlerini tek adreste birleştir",
      "Parametreli veya yinelenen sayfalarda tercih edilen ana URL’yi belirt",
      "Değişiklikten sonra etkilenen URL’leri yeniden analiz et",
    ],
    successMetric: `Yeniden analizde canonical alanı ölçülen ${missingCanonicalPages.length} sayfanın tamamında canonicalUrl değerinin dolu görünmesi.`,
  };
}
 const pageWithoutSchema = analyzedPages.find(
  (page) =>
    page.schemaChecked &&
    page.schemaTypes.length === 0
);
  if (pageWithoutSchema) {
    return {
      id: `website-schema-${pageWithoutSchema.url}`,
      week: 3,
      priority: "Orta",
      title: `${pageWithoutSchema.title} sayfasına uygun yapısal veri ekle`,
      reason: `${pageWithoutSchema.url} üzerinde JSON-LD yapısal veri türü tespit edilmedi. Sayfa türü ve marka ilişkisi makine tarafından okunabilir biçimde açıklanmalı.`,
      targetPrompt: "Varlık ve sayfa türü açıklığı",
      deliverable: "JSON-LD yapısal veri",
      suggestedPath: pageWithoutSchema.url,
      requiredSections: [
        "Ana sayfada Organization ve WebSite şemalarını doğrula",
        "İç sayfalarda BreadcrumbList kullan",
        "Yalnızca sayfada gerçekten görünen içerik için ek şema tanımla",
        "name, url, logo ve sameAs değerlerini gerçek bilgilerle doldur",
        "Google Rich Results Test ve Schema Validator ile kontrol et",
      ],
      successMetric:
        "Yeniden analizde sayfada en az bir geçerli schema türünün görünmesi.",
    };
  }

  return null;
}

export function buildClientReportBriefs({
  brandName,
  brandContext,
  runs,
  serviceSignalsValue,
  technicalSignalsValue,
}: {
  brandName: string;
  brandContext: BrandStrategyContext;
  runs: ClientReportRun[];
  serviceSignalsValue: unknown;
  technicalSignalsValue: unknown;
}): ClientReportBriefs {
  const promptActions = buildPromptActions({
    brandName,
    brandContext,
    runs,
    detectedServiceKeywords: getFoundKeywordSignals(
      serviceSignalsValue
    ),
  });
  const websiteAction = buildWebsiteAction({
    technicalSignalsValue,
  });
  const actionBriefs = [
    ...promptActions,
    ...(websiteAction ? [websiteAction] : []),
  ]
    .slice(0, 3)
    .map((action, index) => ({
      ...action,
      week: index + 1,
    }));

  return {
    evidenceItems: buildEvidenceItems({
      brandName,
      runs,
    }),
    actionBriefs,
  };
}