import { NextResponse } from "next/server";
import { z } from "zod";

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

  const systemPrompt = `
Sen bir AI visibility / GEO uzmanısın.
Görevin, bir markanın ChatGPT, Gemini, Perplexity ve AI arama yüzeylerinde test edilebileceği kullanıcı promptları üretmek.

Kurallar:
- Promptlar gerçek kullanıcının soracağı doğal sorular gibi olmalı.
- Satın alma niyeti yüksek promptlara öncelik ver.
- Rakip karşılaştırması yapılabilecek promptlar üret.
- Aynı anlama gelen tekrar promptlar üretme.
- Promptları markanın ülke ve dil bilgisine göre yaz.
- Her prompt için intent, priority ve reason üret.
- priority 1 ile 5 arasında olmalı.
- 5 = en önemli / satın alma niyeti en yüksek prompt.
- Sadece JSON üret. Açıklama metni yazma.
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
  brand.brand_aliases && brand.brand_aliases.length > 0
    ? brand.brand_aliases.map((item) => `- ${item.alias}`).join("\n")
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

${promptCount} adet prompt üret.

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

  let outputText: string | undefined;

  try {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

  const geminiResponse = await fetch(
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
    console.error("Gemini boş text döndürdü:", JSON.stringify(geminiData, null, 2));

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

  const { data: promptSet, error: promptSetError } = await supabase
    .from("prompt_sets")
    .insert({
      brand_id: brand.id,
      name: "AI Önerilen Promptlar",
      description:
        "Marka, rakip ve hedef kitle bilgilerine göre Gemini tarafından üretilen promptlar.",
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
    parsed.data.prompts.map((prompt) => ({
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