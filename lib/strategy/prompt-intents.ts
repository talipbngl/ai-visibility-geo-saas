export const promptIntents = [
  "buying_intent",
  "comparison",
  "local_recommendation",
  "problem_solution",
  "alternative_search",
  "budget_friendly",
  "premium_choice",
  "trust_reputation",
] as const;

export type PromptIntent = (typeof promptIntents)[number];

const turkishLocations = [
  "adana",
  "adiyaman",
  "afyonkarahisar",
  "agri",
  "amasya",
  "ankara",
  "antalya",
  "artvin",
  "aydin",
  "balikesir",
  "bilecik",
  "bingol",
  "bitlis",
  "bolu",
  "burdur",
  "bursa",
  "canakkale",
  "cankiri",
  "corum",
  "denizli",
  "diyarbakir",
  "edirne",
  "elazig",
  "erzincan",
  "erzurum",
  "eskisehir",
  "gaziantep",
  "giresun",
  "gumushane",
  "hakkari",
  "hatay",
  "isparta",
  "mersin",
  "istanbul",
  "izmir",
  "kars",
  "kastamonu",
  "kayseri",
  "kirklareli",
  "kirsehir",
  "kocaeli",
  "konya",
  "kutahya",
  "malatya",
  "manisa",
  "kahramanmaras",
  "mardin",
  "mugla",
  "mus",
  "nevsehir",
  "nigde",
  "ordu",
  "rize",
  "sakarya",
  "samsun",
  "siirt",
  "sinop",
  "sivas",
  "tekirdag",
  "tokat",
  "trabzon",
  "tunceli",
  "sanliurfa",
  "usak",
  "van",
  "yozgat",
  "zonguldak",
  "aksaray",
  "bayburt",
  "karaman",
  "kirikkale",
  "batman",
  "sirnak",
  "bartin",
  "ardahan",
  "igdir",
  "yalova",
  "karabuk",
  "kilis",
  "osmaniye",
  "duzce",
] as const;

export function normalizeStrategyText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("û", "u")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) =>
    matchesNormalizedPattern(value, term)
  );
}

function matchesNormalizedPattern(value: string, pattern: string) {
  const valueTokens = normalizeStrategyText(value)
    .split(" ")
    .filter(Boolean);
  const patternParts = pattern
    .trim()
    .split(/\s+/)
    .map((part) => {
      const prefix = part.endsWith("*");
      const normalizedPart = normalizeStrategyText(
        prefix ? part.slice(0, -1) : part
      );

      return {
        value: normalizedPart,
        prefix: prefix && normalizedPart.length >= 4,
      };
    })
    .filter((part) => part.value.length > 0);

  if (valueTokens.length === 0 || patternParts.length === 0) {
    return false;
  }

  for (
    let startIndex = 0;
    startIndex <= valueTokens.length - patternParts.length;
    startIndex += 1
  ) {
    const matches = patternParts.every((part, partIndex) => {
      const token = valueTokens[startIndex + partIndex];

      return part.prefix
        ? token.startsWith(part.value)
        : token === part.value;
    });

    if (matches) return true;
  }

  return false;
}

export function findTurkishLocation(value: string) {
  return (
    turkishLocations.find((location) =>
      matchesNormalizedPattern(value, location)
    ) ?? null
  );
}

const storedIntentAliases: Record<string, PromptIntent> = {
  "satin alma": "buying_intent",
  "satin alma niyeti": "buying_intent",
  "buying intent": "buying_intent",
  karsilastirma: "comparison",
  comparison: "comparison",
  "yerel oneri": "local_recommendation",
  "local recommendation": "local_recommendation",
  "sorun ve cozum": "problem_solution",
  "problem solution": "problem_solution",
  "alternatif arama": "alternative_search",
  "alternative search": "alternative_search",
  "butce dostu": "budget_friendly",
  "budget friendly": "budget_friendly",
  "premium secim": "premium_choice",
  "premium choice": "premium_choice",
  "guven ve itibar": "trust_reputation",
  "trust reputation": "trust_reputation",
};

function resolveStoredPromptIntent(
  storedIntent: string | null | undefined
): PromptIntent | null {
  const trimmedIntent = storedIntent?.trim();

  if (
    trimmedIntent &&
    promptIntents.includes(trimmedIntent as PromptIntent)
  ) {
    return trimmedIntent as PromptIntent;
  }

  const normalizedIntent = normalizeStrategyText(
    storedIntent ?? ""
  );

  return storedIntentAliases[normalizedIntent] ?? null;
}

export function resolvePromptIntent(
  promptText: string,
  storedIntent: string | null | undefined
): PromptIntent | null {
  /*
   * Veritabanındaki geçerli niyet kullanıcı veya soru üretim sistemi
   * tarafından bilinçli olarak seçilmiştir. Önce onu koruruz. Böylece
   * problem_solution değerinin normalizasyon sırasında "problem solution"
   * olup kaybolması ve soruların "Diğer" altında toplanması önlenir.
   */
  const resolvedStoredIntent =
    resolveStoredPromptIntent(storedIntent);

  if (resolvedStoredIntent) {
    return resolvedStoredIntent;
  }

  const normalizedPrompt = normalizeStrategyText(promptText);

  if (
    includesAny(normalizedPrompt, [
      "uygun fiyat*",
      "en ucuz",
      "ekonomik",
      "butce",
      "fiyat performans",
      "hesapli",
      "dusuk maliyet*",
    ])
  ) {
    return "budget_friendly";
  }

  if (
    includesAny(normalizedPrompt, [
      "karsilastir",
      "karsilastirma",
      "arasindaki fark",
      "arasindaki farki",
      "arasindaki farklar",
      "arasindaki farklari",
      "farki nedir",
      "hangisi daha",
      "hangisini sec",
      "versus",
      "vs",
    ])
  ) {
    return "comparison";
  }

  if (
    includesAny(normalizedPrompt, [
      "satin al",
      "almak icin",
      "almak istiyorum",
      "hangisini almaliyim",
      "siparis",
      "urun sec",
      "hizmet sec",
      "paket sec",
      "abonelik",
      "fiyat teklifi",
      "secerken hangi",
      "hangi teknik ozellik*",
    ])
  ) {
    return "buying_intent";
  }

  if (
    findTurkishLocation(normalizedPrompt) ||
    includesAny(normalizedPrompt, [
      "yakinimda",
      "yakinlarda",
      "cevremde",
      "bulundugum bolgede",
      "hangi semt",
      "hangi sehir",
      "hangi ilce",
      "sube",
      "magaza",
      "yerel",
    ])
  ) {
    return "local_recommendation";
  }

  if (
    includesAny(normalizedPrompt, [
      "guvenilir",
      "guvenli",
      "itibar",
      "yorumlari",
      "sikayet",
      "sertifika*",
      "lisansli",
      "yetkili",
      "yetkinlik",
      "uzmanlig* nasil dogrulan*",
      "uzmanlik nasil dogrulan*",
      "dogrulanabilir",
    ])
  ) {
    return "trust_reputation";
  }

  if (
    includesAny(normalizedPrompt, [
      "premium",
      "ust segment",
      "en kaliteli",
      "ozel uretim",
      "profesyonel seviye",
    ])
  ) {
    return "premium_choice";
  }
    /*
   * "Çözüm sağlayıcıları hangileridir?" gibi sorulardaki "çözüm"
   * kelimesi bir problemin nasıl giderileceğini değil, seçenek veya
   * tedarikçi listesini ifade eder. Bu kontrol problem_solution
   * kontrolünden önce çalışarak sağlayıcı aramalarının yanlış
   * sınıflandırılmasını önler.
   */
  if (
    includesAny(normalizedPrompt, [
      "cozum saglayici*",
      "urun saglayici*",
      "hizmet saglayici*",
      "teknoloji saglayici*",
      "hangi saglayici*",
      "hangi tedarikci*",
      "hangi firma*",
      "hangi sirket*",
      "hangi marka*",
      "onerilen saglayici*",
      "one cikan firma*",
    ])
  ) {
    return "alternative_search";
  }

  if (
    includesAny(normalizedPrompt, [
      "nasil cozulur",
      "nasil cozerim",
      "sorun",
      "problem",
      "ariza",
      "plansiz durus",
      "onceden tespit",
      "neden olmuyor",
      "ne yapmaliyim",
      "cozum*",
      "nasil giderilir",
    ])
  ) {
    return "problem_solution";
  }

  if (
    includesAny(normalizedPrompt, [
      "alternatif",
      "hangi markalar",
      "hangi sirketler",
      "hangi hizmetler",
      "hangi urunler",
      "hangileridir",
      "hangileri",
      "onerir misin",
      "onerirsin",
      "onerileri",
      "en iyi",
    ])
  ) {
    return "alternative_search";
  }

  return null;
}