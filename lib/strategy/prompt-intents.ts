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
  return terms.some((term) => value.includes(term));
}

export function findTurkishLocation(value: string) {
  const normalizedValue = normalizeStrategyText(value);

  return (
    turkishLocations.find((location) =>
      normalizedValue.includes(location)
    ) ?? null
  );
}

export function resolvePromptIntent(
  promptText: string,
  storedIntent: string | null | undefined
): PromptIntent | null {
  const normalizedPrompt = normalizeStrategyText(promptText);

  if (
    includesAny(normalizedPrompt, [
      "uygun fiyat",
      "en ucuz",
      "ekonomik",
      "butce",
      "fiyat performans",
      "hesapli",
    ])
  ) {
    return "budget_friendly";
  }

  if (
    includesAny(normalizedPrompt, [
      "karsilastir",
      "karsilastirma",
      "arasindaki fark",
      "farki nedir",
      "hangisi daha",
      "hangisini sec",
      "versus",
      " vs ",
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
      "sertifika",
      "lisansli",
      "yetkili",
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

  if (
    includesAny(normalizedPrompt, [
      "nasil cozulur",
      "nasil cozerim",
      "sorun",
      "neden olmuyor",
      "ne yapmaliyim",
      "cozumu",
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

  const normalizedStoredIntent = normalizeStrategyText(
    storedIntent ?? ""
  );

  return promptIntents.includes(
    normalizedStoredIntent as PromptIntent
  )
    ? (normalizedStoredIntent as PromptIntent)
    : null;
}