import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchWithTimeout } from "@/lib/gemini/fetch-with-timeout";

import { createClient } from "@/lib/supabase/server";

const competitorSuggestionSchema = z.object({
  name: z.string().min(2),
  website_url: z.string().optional().default(""),
  description: z.string().min(5),
  competitor_type: z.enum([
    "local_direct",
    "national_chain",
    "independent_brand",
    "online_alternative",
    "category_leader",
  ]),
  reason: z.string().min(5),
  confidence: z.number().int().min(1).max(5),
});

const competitorSuggestionsResponseSchema = z.object({
  competitors: z.array(competitorSuggestionSchema).min(1).max(20),
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

type RouteContext = {
  params: Promise<{
    brandId: string;
  }>;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function getCompetitorCount(value: string) {
  const count = Number(value);

  if (!Number.isFinite(count)) {
    return 8;
  }

  return Math.min(Math.max(Math.trunc(count), 3), 12);
}

function normalizeForCompare(value: string) {
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

function safeWebsiteUrl(value: string | null | undefined) {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) return null;

  const withProtocol =
    trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")
      ? trimmedValue
      : `https://${trimmedValue}`;

  try {
    const url = new URL(withProtocol);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getCompetitorTypeLabel(value: string) {
  if (value === "local_direct") return "Yerel doğrudan rakip";
  if (value === "national_chain") return "Ulusal zincir";
  if (value === "independent_brand") return "Bağımsız / butik marka";
  if (value === "online_alternative") return "Online alternatif";
  if (value === "category_leader") return "Kategori oyuncusu";

  return "Rakip adayı";
}

function getGeminiPrompt(args: {
  competitorCount: number;
  brand: {
    name: string;
    website_url: string | null;
    industry: string | null;
    country: string | null;
    language: string | null;
    description: string | null;
    target_audience: string | null;
    primary_offer: string | null;
  };
  existingCompetitorNames: string[];
}) {
  const existingCompetitorList =
    args.existingCompetitorNames.length > 0
      ? args.existingCompetitorNames.map((name) => `- ${name}`).join("\n")
      : "- Yok";

  return `
Sen bir AI görünürlük ve pazar araştırması uzmanısın.

Görevin, verilen marka için gerçekçi rakip adayları üretmek.

KRİTİK KURALLAR:
- Sadece büyük zincirleri önerme.
- Gerçekten Google aramasında, harita sonuçlarında, sosyal medyada veya kullanıcı zihninde rakip olabilecek markalar/işletmeler öner.
- Yerel işletmeler, butik markalar, kategori oyuncuları, online alternatifler ve doğrudan rakipler olabilir.
- Ana marka adını rakip olarak önerme.
- Mevcut rakipleri tekrar önerme.
- Website adresini sadece emin olduğunda yaz. Emin değilsen boş string döndür.
- Uydurma kesin bilgi verme.
- Rakipler markanın sektörüne, ülkesine, hedef kitlesine ve ana teklifine uygun olmalı.
- Eğer konum bilgisi net değilse ülke/sektör bazlı genel ama gerçekçi adaylar üret.
- Cevap Türkçe olsun.
- Sadece JSON döndür. Açıklama yazma.

Marka:
- Ad: ${args.brand.name}
- Website: ${args.brand.website_url ?? "-"}
- Sektör: ${args.brand.industry ?? "-"}
- Ülke: ${args.brand.country ?? "TR"}
- Dil: ${args.brand.language ?? "tr"}
- Açıklama: ${args.brand.description ?? "-"}
- Hedef kitle: ${args.brand.target_audience ?? "-"}
- Ana teklif: ${args.brand.primary_offer ?? "-"}

Mevcut rakipler:
${existingCompetitorList}

${args.competitorCount} adet rakip adayı üret.

competitor_type sadece şunlardan biri olabilir:
- local_direct
- national_chain
- independent_brand
- online_alternative
- category_leader

Cevap formatı:
{
  "competitors": [
    {
      "name": "Rakip adı",
      "website_url": "",
      "description": "Bu rakip ne yapıyor?",
      "competitor_type": "local_direct",
      "reason": "Neden bu marka için rakip olabilir?",
      "confidence": 4
    }
  ]
}
`;
}

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
      `/dashboard/brands/${brandId}/competitors?error=${encodeURIComponent(
        "GEMINI_API_KEY eksik. .env.local içine Gemini key ekle."
      )}`,
      request.url
    );
  }

  const formData = await request.formData();
  const competitorCount = getCompetitorCount(
    getString(formData, "competitorCount")
  );

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select(
      "id, name, workspace_id, website_url, industry, country, language, description, target_audience, primary_offer"
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

  const { data: existingCompetitors, error: existingCompetitorsError } =
    await supabase
      .from("competitors")
      .select("id, name")
      .eq("brand_id", brand.id);

  if (existingCompetitorsError) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        existingCompetitorsError.message
      )}`,
      request.url
    );
  }

  const existingCompetitorNames =
    existingCompetitors?.map((competitor) => competitor.name) ?? [];

  const prompt = getGeminiPrompt({
    competitorCount,
    brand,
    existingCompetitorNames,
  });

    const {
    error: usageError,
  } = await supabase.rpc(
    "consume_gemini_usage",
    {
      p_workspace_id:
        brand.workspace_id,
      p_operation:
        "competitor_generation",
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
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.8,
            response_mime_type: "application/json",
            response_schema: {
              type: "OBJECT",
              properties: {
                competitors: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: {
                        type: "STRING",
                      },
                      website_url: {
                        type: "STRING",
                      },
                      description: {
                        type: "STRING",
                      },
                      competitor_type: {
                        type: "STRING",
                        enum: [
                          "local_direct",
                          "national_chain",
                          "independent_brand",
                          "online_alternative",
                          "category_leader",
                        ],
                      },
                      reason: {
                        type: "STRING",
                      },
                      confidence: {
                        type: "INTEGER",
                      },
                    },
                    required: [
                      "name",
                      "website_url",
                      "description",
                      "competitor_type",
                      "reason",
                      "confidence",
                    ],
                    propertyOrdering: [
                      "name",
                      "website_url",
                      "description",
                      "competitor_type",
                      "reason",
                      "confidence",
                    ],
                  },
                },
              },
              required: ["competitors"],
              propertyOrdering: ["competitors"],
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
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        message
      )}`,
      request.url
    );
  }

  let json: unknown;

  try {
    json = JSON.parse(outputText);
  } catch {
    return redirectTo(
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        "Gemini cevabı JSON olarak okunamadı."
      )}`,
      request.url
    );
  }

  const parsed = competitorSuggestionsResponseSchema.safeParse(json);

  if (!parsed.success) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        "Gemini rakip çıktısı beklenen formatta değil."
      )}`,
      request.url
    );
  }

  const existingNameSet = new Set(
    [
      brand.name,
      ...existingCompetitorNames,
    ].map((name) => normalizeForCompare(name))
  );

  const uniqueSuggestions = parsed.data.competitors.filter((competitor) => {
    const normalizedName = normalizeForCompare(competitor.name);

    if (!normalizedName) return false;

    if (existingNameSet.has(normalizedName)) {
      return false;
    }

    existingNameSet.add(normalizedName);

    return true;
  });

  if (uniqueSuggestions.length === 0) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        "AI yeni rakip adayı üretemedi. Mevcut rakipler zaten benzer olabilir."
      )}`,
      request.url
    );
  }

  const { error: insertError } = await supabase.from("competitors").insert(
    uniqueSuggestions.map((competitor) => ({
      brand_id: brand.id,
      name: competitor.name,
      website_url: safeWebsiteUrl(competitor.website_url),
      description: [
        competitor.description,
        "",
        `AI öneri tipi: ${getCompetitorTypeLabel(
          competitor.competitor_type
        )}`,
        `AI öneri nedeni: ${competitor.reason}`,
        `Güven skoru: ${competitor.confidence}/5`,
      ].join("\n"),
    }))
  );

  if (insertError) {
    return redirectTo(
      `/dashboard/brands/${brand.id}/competitors?error=${encodeURIComponent(
        insertError.message
      )}`,
      request.url
    );
  }

  return redirectTo(
    `/dashboard/brands/${brand.id}/competitors?message=${encodeURIComponent(
      `${uniqueSuggestions.length} rakip adayı eklendi. Website adreslerini manuel kontrol etmen önerilir.`
    )}`,
    request.url
  );
}