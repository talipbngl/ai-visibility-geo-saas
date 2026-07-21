import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWithTimeout } from "@/lib/gemini/fetch-with-timeout";
import { createClient } from "@/lib/supabase/server";

const generatedPromptSchema = z.object({
  text: z.string().min(5),
  intent: z.enum([
    "buying_intent",
    "comparison",
    "local_recommendation",
    "problem_solution",
    "alternative_search",
    "budget_friendly",
    "premium_choice",
    "trust_reputation",
  ]),
  priority: z.number().int().min(1).max(5),
  reason: z.string().min(5),
});

const generatedPromptsResponseSchema = z.object({
  prompts: z.array(generatedPromptSchema).min(1).max(50),
});

type GeneratedPrompt = z.infer<typeof generatedPromptSchema>;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function getPromptCount(value: string) {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return 10;
  }

  return Math.min(Math.max(Math.trunc(count), 5), 30);
}

function normalizeForCheck(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBrandCheckTerms({
  brandName,
  aliases,
}: {
  brandName: string;
  aliases: string[];
}) {
  const normalizedBrandName = normalizeForCheck(brandName);

  const terms = new Set<string>();

  if (normalizedBrandName) {
    terms.add(normalizedBrandName);
  }

  aliases.forEach((alias) => {
    const normalizedAlias = normalizeForCheck(alias);

    if (normalizedAlias.length >= 3) {
      terms.add(normalizedAlias);
    }
  });

  const countrySuffixes = [
    " turkiye",
    " turkey",
    " tr",
    " turkiye a s",
    " turkey a s",
  ];

  countrySuffixes.forEach((suffix) => {
    if (normalizedBrandName.endsWith(suffix)) {
      const withoutSuffix = normalizedBrandName.slice(0, -suffix.length).trim();

      if (withoutSuffix.length >= 3) {
        terms.add(withoutSuffix);
      }
    }
  });

  return Array.from(terms).filter((term) => term.length >= 3);
}

function includesAnyBrandTerm(promptText: string, brandTerms: string[]) {
  const normalizedPrompt = normalizeForCheck(promptText);

  return brandTerms.some((term) => normalizedPrompt.includes(term));
}

function isNavigationOrDirectBrandPrompt(
  promptText: string,
  brandTerms: string[]
) {
  const normalizedPrompt = normalizeForCheck(promptText);

  if (!brandTerms.some((term) => normalizedPrompt.includes(term))) {
    return false;
  }

  const bannedPatterns = [
    "nerede",
    "en yakin",
    "konum",
    "adres",
    "telefon",
    "iletisim",
    "saat kaca",
    "saat kacta",
    "kaca kadar acik",
    "kacta aciliyor",
    "kacta kapaniyor",
    "calisma saat",
    "sube nerede",
    "hangi sube",
    "menu fiyati",
    "fiyatlari nedir",
    "neden tercih edilmeli",
    "neden tercih etmeliyim",
  ];

  return bannedPatterns.some((pattern) => normalizedPrompt.includes(pattern));
}

function deduplicatePrompts(prompts: GeneratedPrompt[]) {
  const seenPromptTexts = new Set<string>();

  return prompts.filter((prompt) => {
    const normalizedText = normalizeForCheck(prompt.text);

    if (seenPromptTexts.has(normalizedText)) {
      return false;
    }

    seenPromptTexts.add(normalizedText);

    return true;
  });
}

function limitBrandMentionedPrompts({
  prompts,
  brandTerms,
  promptCount,
}: {
  prompts: GeneratedPrompt[];
  brandTerms: string[];
  promptCount: number;
}) {
  const maxBrandMentionedCount = Math.max(1, Math.floor(promptCount * 0.3));

  let brandMentionedCount = 0;

  return prompts
    .filter((prompt) => {
      if (isNavigationOrDirectBrandPrompt(prompt.text, brandTerms)) {
        return false;
      }

      const hasBrandName = includesAnyBrandTerm(prompt.text, brandTerms);

      if (!hasBrandName) return true;

      const isAllowedBrandIntent =
        prompt.intent === "comparison" ||
        prompt.intent === "alternative_search" ||
        prompt.intent === "trust_reputation";

      if (!isAllowedBrandIntent) return false;

      if (brandMentionedCount >= maxBrandMentionedCount) return false;

      brandMentionedCount += 1;

      return true;
    })
    .slice(0, promptCount);
}

type RouteContext = {
  params: Promise<{
    brandId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { brandId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  if (!process.env.GEMINI_API_KEY) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        "GEMINI_API_KEY eksik. .env.local içine Gemini key ekle."
      )}`,
      request.url
    );
  }

  const formData = await request.formData();
  const promptCount = getPromptCount(getString(formData, "promptCount"));

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select(
      `
      id,
      name,
      workspace_id,
      website_url,
      industry,
      country,
      language,
      description,
      target_audience,
      primary_offer,
      brand_aliases (
        alias
      )
    `
    )
    .eq("id", brandId)
    .maybeSingle();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/brands?error=${encodeURIComponent(
        brandError?.message ?? "Marka bulunamadı."
      )}`,
      request.url
    );
  }

  const { data: competitors, error: competitorsError } = await supabase
    .from("competitors")
    .select(
      `
      id,
      name,
      website_url,
      description,
      competitor_aliases (
        alias
      )
    `
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  if (competitorsError) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        competitorsError.message
      )}`,
      request.url
    );
  }

  const brandAliases =
    brand.brand_aliases && brand.brand_aliases.length > 0
      ? brand.brand_aliases
          .map((item) => String(item.alias ?? "").trim())
          .filter(Boolean)
      : [];

  const brandTerms = getBrandCheckTerms({
    brandName: brand.name,
    aliases: brandAliases,
  });

  const neutralPromptCount = Math.ceil(promptCount * 0.7);
  const maxBrandMentionedPromptCount = promptCount - neutralPromptCount;

  const systemPrompt = `
Sen bir AI visibility / GEO uzmanısın.
Görevin, bir markanın AI cevaplarında organik olarak görünüp görünmediğini test edecek tarafsız kullanıcı promptları üretmek.

KRİTİK AMAÇ:
Bu promptlar markayı doğrudan sordurmak için değildir.
Bu promptlar, gerçek bir kullanıcının markayı bilmeden AI'a sorabileceği kategori, ihtiyaç, lokasyon, alternatif ve karşılaştırma sorularıdır.
Ölçmek istediğimiz şey şudur: Kullanıcı markayı özellikle sormasa bile AI cevabında marka kendiliğinden geçiyor mu?

Kesin kurallar:
- Promptların çoğunda ana marka adı geçmemeli.
- En az ${neutralPromptCount} prompt ana marka adı geçmeden yazılmalı.
- En fazla ${maxBrandMentionedPromptCount} prompt ana marka adını içerebilir.
- Ana marka adı sadece karşılaştırma, alternatif arama veya güven/itibar testi için kullanılabilir.
- "Marka nerede?", "Marka saat kaça kadar açık?", "Marka neden tercih edilmeli?", "Marka fiyatları nedir?" gibi doğrudan marka/navigasyon soruları üretme.
- Satın alma niyeti yüksek ama tarafsız sorular üret.
- Rakip karşılaştırması yapılabilecek doğal promptlar üret.
- Aynı anlama gelen tekrar promptlar üretme.
- Promptları markanın ülke ve dil bilgisine göre yaz.
- Her prompt için intent, priority ve reason üret.
- priority 1 ile 5 arasında olmalı.
- 5 = en önemli / satın alma niyeti en yüksek prompt.
- Sadece JSON üret. Açıklama metni yazma.

İyi prompt örnekleri:
- "İstanbul'da çalışmak için uygun kahve zincirleri hangileri?"
- "Türkiye'de kaliteli kahve içmek için hangi markaları önerirsin?"
- "Soğuk kahve çeşitleri güçlü olan kahve zincirleri hangileri?"
- "Kahve Dünyası alternatifi olarak hangi kahve zincirleri tercih edilebilir?"

Kötü prompt örnekleri:
- "Starbucks nerede ve saat kaça kadar açık?"
- "Starbucks neden tercih edilmeli?"
- "Starbucks'ta en uygun fiyatlı kahve nedir?"
`;

  const userPrompt = `
Marka:
- Ad: ${brand.name}
- Website: ${brand.website_url ?? "-"}
- Sektör: ${brand.industry ?? "-"}
- Ülke: ${brand.country ?? "TR"}
- Dil: ${brand.language ?? "tr"}
- Açıklama: ${brand.description ?? "-"}
- Hedef kitle: ${brand.target_audience ?? "-"}
- Ana teklif: ${brand.primary_offer ?? "-"}

Marka aliasları:
${
  brandAliases.length > 0
    ? brandAliases.map((alias) => `- ${alias}`).join("\n")
    : "- Yok"
}

Rakipler:
${
  competitors && competitors.length > 0
    ? competitors
        .map((competitor) => {
          const aliases =
            competitor.competitor_aliases &&
            competitor.competitor_aliases.length > 0
              ? competitor.competitor_aliases
                  .map((item) => item.alias)
                  .join(", ")
              : "alias yok";

          return `- ${competitor.name} | ${competitor.website_url ?? "-"} | ${
            competitor.description ?? "-"
          } | Aliaslar: ${aliases}`;
        })
        .join("\n")
    : "- Rakip yok"
}

${promptCount} adet AI görünürlük test promptu üret.

Zorunlu dağılım:
- En az ${neutralPromptCount} adet tarafsız kategori / ihtiyaç / lokasyon / öneri sorusu üret. Bu sorularda "${brand.name}" veya marka aliasları geçmesin.
- En fazla ${maxBrandMentionedPromptCount} adet promptta ana marka adı geçebilir.
- Marka adı geçen promptlar sadece rakip karşılaştırması, alternatif arama veya güven/itibar testi olabilir.
- Marka adı geçen promptlarda "nerede", "saat kaça kadar açık", "adres", "telefon", "menü fiyatı" gibi navigasyon soruları olmasın.

Intent seçenekleri sadece şunlar olabilir:
- buying_intent
- comparison
- local_recommendation
- problem_solution
- alternative_search
- budget_friendly
- premium_choice
- trust_reputation

Cevap formatı:
{
  "prompts": [
    {
      "text": "Prompt metni",
      "intent": "buying_intent",
      "priority": 5,
      "reason": "Bu prompt neden önemli?"
    }
  ]
}
`;
    const {
    error: usageError,
  } = await supabase.rpc(
    "consume_gemini_usage",
    {
      p_workspace_id:
        brand.workspace_id,
      p_operation:
        "prompt_generation",
      p_daily_limit:
        Number(
          process.env
            .DAILY_GEMINI_PROMPT_LIMIT ??
            50
        ) || 50,
    }
  );

  if (usageError) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        usageError.message
      )}`,
      request.url
    );
  }
  let outputText: string | undefined;

  try {
    const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

    const geminiResponse = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${systemPrompt}\n\n${userPrompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            response_schema: {
              type: "OBJECT",
              properties: {
                prompts: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      text: {
                        type: "STRING",
                      },
                      intent: {
                        type: "STRING",
                        enum: [
                          "buying_intent",
                          "comparison",
                          "local_recommendation",
                          "problem_solution",
                          "alternative_search",
                          "budget_friendly",
                          "premium_choice",
                          "trust_reputation",
                        ],
                      },
                      priority: {
                        type: "INTEGER",
                      },
                      reason: {
                        type: "STRING",
                      },
                    },
                    required: ["text", "intent", "priority", "reason"],
                    propertyOrdering: ["text", "intent", "priority", "reason"],
                  },
                },
              },
              required: ["prompts"],
              propertyOrdering: ["prompts"],
            },
          },
        }),
      }
    );

    const geminiData =
      (await geminiResponse.json()) as GeminiGenerateContentResponse;

    if (!geminiResponse.ok) {
      throw new Error(
        geminiData.error?.message ?? "Gemini API isteği başarısız oldu."
      );
    }

    outputText = geminiData.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!outputText) {
      console.error(
        "Gemini boş text döndürdü:",
        JSON.stringify(geminiData, null, 2)
      );

      throw new Error(
        `Gemini cevap verdi ama text alanı boş. Finish reason: ${
          geminiData.candidates?.[0]?.finishReason ?? "bilinmiyor"
        }`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gemini API isteği başarısız oldu.";

    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        message
      )}`,
      request.url
    );
  }

  if (!outputText) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        "Gemini boş cevap döndürdü."
      )}`,
      request.url
    );
  }

  let json: unknown;

  try {
    json = JSON.parse(outputText);
  } catch {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        "Gemini cevabı JSON olarak okunamadı."
      )}`,
      request.url
    );
  }

  const parsed = generatedPromptsResponseSchema.safeParse(json);

  if (!parsed.success) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        "Gemini çıktısı beklenen formatta değil."
      )}`,
      request.url
    );
  }

  const generatedPrompts = deduplicatePrompts(parsed.data.prompts);
  const filteredPrompts = limitBrandMentionedPrompts({
    prompts: generatedPrompts,
    brandTerms,
    promptCount,
  });

  if (filteredPrompts.length < 5) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        "AI çok fazla marka odaklı soru üretti. Lütfen tekrar prompt üretmeyi deneyin."
      )}`,
      request.url
    );
  }

  const { data: promptSet, error: promptSetError } = await supabase
    .from("prompt_sets")
    .insert({
      brand_id: brand.id,
      name: "AI Önerilen Promptlar",
      description:
        "Marka, rakip ve hedef kitle bilgilerine göre Gemini tarafından üretilen tarafsız görünürlük promptları.",
    })
    .select("id")
    .single();

  if (promptSetError || !promptSet) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        promptSetError?.message ?? "Prompt seti oluşturulamadı."
      )}`,
      request.url
    );
  }

  const { error: promptsError } = await supabase.from("prompts").insert(
    filteredPrompts.map((prompt) => ({
      prompt_set_id: promptSet.id,
      brand_id: brand.id,
      text: prompt.text,
      intent: prompt.intent,
      priority: prompt.priority,
      language: brand.language || "tr",
      country: brand.country || "TR",
      city: null,
      is_active: true,
    }))
  );

  if (promptsError) {
    return redirectTo(
      `/dashboard/brands/${brandId}/prompts?error=${encodeURIComponent(
        promptsError.message
      )}`,
      request.url
    );
  }

  return redirectTo(`/dashboard/brands/${brandId}/prompts`, request.url);
}