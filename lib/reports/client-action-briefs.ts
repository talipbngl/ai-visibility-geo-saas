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
  schemaTypes: string[];
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
        schemaTypes: Array.isArray(page.schemaTypes)
          ? page.schemaTypes
              .filter(
                (item): item is string =>
                  typeof item === "string"
              )
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
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
  const excerpt = normalizedAnswer.slice(
    start,
    start + maximumLength
  );

  return `${start > 0 ? "…" : ""}${excerpt}${
    start + maximumLength < normalizedAnswer.length ? "…" : ""
  }`;
}

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      promptIntent: run.promptIntent,
      status: getEvidenceStatus(run),
      brandRank: run.brandRank,
      mentionedCompetitors,
      answerExcerpt: getAnswerExcerpt({
        answer: run.rawAnswer,
        terms: [brandName, ...mentionedCompetitors],
      }),
      engineLabel: getEngineLabel(run),
    };
  });
}

function getIntentBrief({
  brandName,
  run,
}: {
  brandName: string;
  run: ClientReportRun;
}) {
  const brandSlug = slugify(brandName);
  const strongestCompetitor = run.competitors
    .filter((competitor) => competitor.mentioned)
    .sort(
      (first, second) =>
        (first.rank ?? 999) - (second.rank ?? 999)
    )[0];
  const competitorSlug = strongestCompetitor
    ? slugify(strongestCompetitor.name)
    : "alternatifler";

  switch (run.promptIntent) {
    case "comparison":
      return {
        deliverable: "Tarafsız karşılaştırma rehberi",
        suggestedPath: `/rehber/${brandSlug}-${competitorSlug}-karsilastirmasi`,
        requiredSections: [
          "Karşılaştırmanın kapsamı ve güncelleme tarihi",
          "Fiyat/değer, erişim, ürün çeşitliliği ve kullanım senaryosu tablosu",
          `${brandName} için güçlü yönler ve uygun olmadığı durumlar`,
          `${
            strongestCompetitor?.name ?? "Alternatif markalar"
          } ile temel farklar`,
          "Doğrulanabilir veriler, kaynak bağlantıları ve kısa sonuç bölümü",
        ],
      };
    case "local_recommendation":
      return {
        deliverable: "Şube bulma ve yerel hizmet sayfası",
        suggestedPath: "/magazalar/{sehir-veya-ilce}",
        requiredSections: [
          "Açık adres, harita bağlantısı ve güncel çalışma saatleri",
          "Wi-Fi, priz, oturma alanı ve çalışma ortamı bilgisi",
          "Sipariş, paket servis ve erişilebilirlik seçenekleri",
          "Bölgeye özel sık sorulan sorular",
          "LocalBusiness yapısal verisi ve son güncelleme tarihi",
        ],
      };
    case "buying_intent":
      return {
        deliverable: "Satın alma ve ürün seçme rehberi",
        suggestedPath: `/rehber/${brandSlug}-urun-secim-rehberi`,
        requiredSections: [
          "Kullanım amacına göre ürün veya hizmet seçenekleri",
          "Fiyat aralığı ve toplam değer karşılaştırması",
          "Kim için hangi seçeneğin uygun olduğu",
          "Teslimat, iade, üyelik veya satın alma adımları",
          "Kararı hızlandıran kısa karşılaştırma tablosu ve SSS",
        ],
      };
    case "budget_friendly":
      return {
        deliverable: "Fiyat ve değer açıklama sayfası",
        suggestedPath: "/fiyatlar-ve-paketler",
        requiredSections: [
          "Güncel başlangıç fiyatları ve paket içerikleri",
          "Fiyata dahil olan ve ayrıca ücretlenen unsurlar",
          "Bütçeye göre önerilen seçenekler",
          "Kampanya koşulları ve geçerlilik tarihi",
          "Rakiple fiyat iddiası yerine doğrulanabilir değer karşılaştırması",
        ],
      };
    case "trust_reputation":
      return {
        deliverable: "Güven ve kalite kanıtları sayfası",
        suggestedPath: "/hakkimizda/guven-ve-kalite",
        requiredSections: [
          "Şirketin açık unvanı, geçmişi ve faaliyet alanı",
          "Kalite standartları, sertifikalar ve doğrulama bağlantıları",
          "Müşteri destek kanalları ve yanıt süreleri",
          "İade, gizlilik ve tüketici güvencesi politikaları",
          "Tarihli müşteri kanıtları veya bağımsız değerlendirmeler",
        ],
      };
    case "problem_solution":
      return {
        deliverable: "Sorun çözme rehberi ve SSS",
        suggestedPath: `/rehber/${slugify(run.promptText).slice(0, 54)}`,
        requiredSections: [
          "Sorunun kısa ve doğrudan cevabı",
          "Olası nedenler ve hangi durumda hangisinin geçerli olduğu",
          "Adım adım çözüm seçenekleri",
          `${brandName} çözümünün sınırları ve uygun kullanım durumu`,
          "İlgili ürün/hizmet bağlantıları ve sık sorulan sorular",
        ],
      };
    default:
      return {
        deliverable: "Soru odaklı kategori rehberi",
        suggestedPath: `/rehber/${slugify(run.promptText).slice(0, 54)}`,
        requiredSections: [
          "Sorunun ilk paragrafta 40-60 kelimelik doğrudan cevabı",
          "Seçim kriterleri ve kullanım senaryoları",
          `${brandName} teklifinin somut ve doğrulanabilir farkları`,
          "Alternatiflerin tarafsız biçimde karşılaştırılması",
          "Kaynaklar, güncelleme tarihi ve ilgili sık sorulan sorular",
        ],
      };
  }
}

function buildPromptActions({
  brandName,
  runs,
}: {
  brandName: string;
  runs: ClientReportRun[];
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
      const blueprint = getIntentBrief({
        brandName,
        run,
      });
      const mentionedCompetitors = run.competitors
        .filter((competitor) => competitor.mentioned)
        .map((competitor) => competitor.name);

      return {
        id: `prompt-${run.id}`,
        week: index + 1,
        priority: "Yüksek",
        title: `"${run.promptText}" sorusu için içerik yayınla`,
        reason: run.brandMentioned
          ? `${brandName} cevapta ${run.brandRank}. sırada yer aldı. İlk iki öneri arasına girmek için bu soruya doğrudan cevap veren daha güçlü bir kaynak sayfa gerekiyor.`
          : mentionedCompetitors.length > 0
            ? `${brandName} cevapta görünmedi; ${mentionedCompetitors
                .slice(0, 3)
                .join(", ")} görünür durumda.`
            : `${brandName} bu sorunun cevabında görünmedi. Konuya doğrudan cevap veren marka kaynağı tespit edilemedi.`,
        targetPrompt: run.promptText,
        deliverable: blueprint.deliverable,
        suggestedPath: blueprint.suggestedPath,
        requiredSections: blueprint.requiredSections,
        successMetric: `Aynı soru setiyle yapılacak yeniden ölçümde ${brandName} adının cevapta görünmesi${
          run.brandMentioned ? " ve ilk iki sıraya yükselmesi" : ""
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

  const invalidHeadingPage = analyzedPages.find(
    (page) =>
      page.h1Count !== null && page.h1Count !== 1
  );

  if (invalidHeadingPage) {
    return {
      id: `website-heading-${invalidHeadingPage.url}`,
      week: 1,
      priority: "Yüksek",
      title: `${invalidHeadingPage.title} sayfasındaki ${invalidHeadingPage.h1Count} H1 başlığını düzelt`,
      reason: `${invalidHeadingPage.url} üzerinde ${invalidHeadingPage.h1Count} adet H1 tespit edildi. Sayfanın ana konusu tek bir H1 ile açık biçimde belirtilmeli.`,
      targetPrompt: "Sayfa konusu ve içerik yapısı",
      deliverable: "Başlık hiyerarşisi düzenlemesi",
      suggestedPath: invalidHeadingPage.url,
      requiredSections: [
        "Sayfanın ana konusunu anlatan yalnızca bir H1 bırak",
        "Diğer ana başlıkları H2 seviyesine taşı",
        "H2 altındaki detayları H3 ile sırala",
        "Başlık metinlerini görsel slogan yerine kullanıcı aramasını açıklayacak şekilde yaz",
        "Düzenleme sonrasında sayfayı tekrar tara",
      ],
      successMetric:
        "Yeniden analizde H1 sayısının 1 ve başlık sırasının geçerli görünmesi.",
    };
  }

  const missingDescriptionPage = analyzedPages.find(
    (page) => !page.metaDescription
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

  const pageWithoutSchema = analyzedPages.find(
    (page) => page.schemaTypes.length === 0
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
  runs,
  technicalSignalsValue,
}: {
  brandName: string;
  runs: ClientReportRun[];
  technicalSignalsValue: unknown;
}): ClientReportBriefs {
  const promptActions = buildPromptActions({
    brandName,
    runs,
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