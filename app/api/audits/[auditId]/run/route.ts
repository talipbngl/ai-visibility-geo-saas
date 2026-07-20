import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type GeminiGroundingChunk = {
  web?: {
    uri?: string;
    title?: string;
  };
};

type GeminiGroundingSupport = {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
};

type GeminiGroundingMetadata = {
  webSearchQueries?: string[];
  groundingChunks?: GeminiGroundingChunk[];
  groundingSupports?: GeminiGroundingSupport[];
  searchEntryPoint?: unknown;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    finishReason?: string;
    groundingMetadata?: GeminiGroundingMetadata;
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

type AnswerResult = {
  answer: string;
  rawResponse: GeminiGenerateContentResponse;
  citations: {
    webSearchQueries: string[];
    sources: Array<{
      uri: string;
      title: string;
    }>;
    sourceCount: number;
    groundingSupports: GeminiGroundingSupport[];
    groundingEnabled: boolean;
  };
};

type RouteContext = {
  params: Promise<{
    auditId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

function isGroundingEnabled() {
  return process.env.ENABLE_GEMINI_GROUNDING === "true";
}

function buildPrompt(promptText: string, groundingEnabled: boolean) {
  if (groundingEnabled) {
    return `
Sen Google Search ile desteklenen, güncel web sonuçlarını kullanabilen bağımsız bir AI asistansın.

Aşağıdaki kullanıcı sorusuna gerçek bir kullanıcıya cevap verir gibi yanıt ver.

KRİTİK KURALLAR:
- Cevabı güncel web sonuçlarına dayandır.
- Kullanıcı öneri istiyorsa gerçekten önerilebilecek marka, işletme veya alternatifleri doğal şekilde belirt.
- Cevabı sadece takip edilen marka/rakip listesine göre sınırlama.
- Marka isimlerini zorla öne çıkarma.
- Reklam metni gibi yazma.
- Eğer konu yerel/konum bağımlıysa "güncel şube, fiyat ve çalışma saati kontrol edilmeli" gibi kısa bir not ekleyebilirsin.
- Cevap Türkçe olsun.
- 4-7 cümle arasında net bir cevap ver.
- JSON döndürme. Sadece kullanıcıya verilecek cevabı yaz.

Kullanıcı sorusu:
${promptText}
`;
  }

  return `
Sen normal bir kullanıcıya cevap veren bağımsız bir AI asistansın.

Aşağıdaki kullanıcı sorusuna gerçek bir kullanıcıya cevap verir gibi yanıt ver.

KRİTİK KURALLAR:
- Cevabı sadece takip edilen marka/rakip listesine göre sınırlama.
- Kullanıcı öneri istiyorsa gerçekten önerilebilecek marka, işletme veya alternatifleri doğal şekilde belirt.
- Marka isimlerini zorla öne çıkarma.
- Reklam metni gibi yazma.
- Güncel web araması kullanmadığın için kesin şube, fiyat veya saat bilgisi verme.
- Eğer konu yerel/konum bağımlıysa "güncel şube, fiyat ve çalışma saati kontrol edilmeli" gibi kısa bir not ekleyebilirsin.
- Cevap Türkçe olsun.
- 4-7 cümle arasında net bir cevap ver.
- JSON döndürme. Sadece kullanıcıya verilecek cevabı yaz.

Kullanıcı sorusu:
${promptText}
`;
}

function extractText(data: GeminiGenerateContentResponse) {
  return data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

function extractCitations(
  data: GeminiGenerateContentResponse,
  groundingEnabled: boolean
) {
  const groundingMetadata = data.candidates?.[0]?.groundingMetadata;

  const sources =
    groundingMetadata?.groundingChunks
      ?.map((chunk) => ({
        uri: chunk.web?.uri ?? "",
        title: chunk.web?.title ?? "",
      }))
      .filter((source) => source.uri) ?? [];

  return {
    webSearchQueries: groundingMetadata?.webSearchQueries ?? [],
    sources,
    sourceCount: sources.length,
    groundingSupports: groundingMetadata?.groundingSupports ?? [],
    groundingEnabled,
  };
}

function getGeminiErrorMessage(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "Gemini cevabı alınamadı.";

  const normalizedMessage = rawMessage.toLocaleLowerCase("tr-TR");

  if (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("rate limit")
  ) {
    return "Gemini kotası doldu veya billing aktif değil. Grounding açıksa ENABLE_GEMINI_GROUNDING=false yapıp tekrar deneyebilirsin.";
  }

  return rawMessage;
}

async function askGemini(promptText: string): Promise<AnswerResult> {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";
  const groundingEnabled = isGroundingEnabled();

  const response = await fetch(
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
                text: buildPrompt(promptText, groundingEnabled),
              },
            ],
          },
        ],
        ...(groundingEnabled
          ? {
              tools: [
                {
                  google_search: {},
                },
              ],
            }
          : {}),
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 1600,
        },
      }),
    }
  );

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini API isteği başarısız oldu.");
  }

  const answer = extractText(data);

  if (!answer) {
    throw new Error(
      `Gemini boş cevap döndürdü. Finish reason: ${
        data.candidates?.[0]?.finishReason ?? "bilinmiyor"
      }`
    );
  }

  return {
    answer,
    rawResponse: data,
    citations: extractCitations(data, groundingEnabled),
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { auditId } = await context.params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo("/login", request.url);
  }

  if (!process.env.GEMINI_API_KEY) {
    return redirectTo(
      `/dashboard/audits/${auditId}?error=${encodeURIComponent(
        "GEMINI_API_KEY eksik. .env.local içine Gemini key ekle."
      )}`,
      request.url
    );
  }

  const { data: audit, error: auditError } = await supabase
    .from("audits")
    .select("id, brand_id, status")
    .eq("id", auditId)
    .maybeSingle();

  if (auditError || !audit) {
    return redirectTo(
      `/dashboard/audits?error=${encodeURIComponent(
        auditError?.message ?? "Audit bulunamadı."
      )}`,
      request.url
    );
  }

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name")
    .eq("id", audit.brand_id)
    .maybeSingle();

  if (brandError || !brand) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        brandError?.message ?? "Marka bulunamadı."
      )}`,
      request.url
    );
  }

  const runLimit = isGroundingEnabled() ? 1 : 5;

  const { data: runs, error: runsError } = await supabase
    .from("audit_runs")
    .select(
      `
      id,
      prompt_id,
      prompt_text_snapshot,
      prompts (
        id,
        text
      )
    `
    )
    .eq("audit_id", audit.id)
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(runLimit);

  if (runsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        runsError.message
      )}`,
      request.url
    );
  }

  if (!runs || runs.length === 0) {
    return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
  }

  const promptsToRun = runs
    .map((run) => {
      const prompt = Array.isArray(run.prompts) ? run.prompts[0] : run.prompts;
      const text = run.prompt_text_snapshot || prompt?.text;

      if (!text) {
        return null;
      }

      return {
        runId: run.id,
        text,
      };
    })
    .filter((item): item is { runId: string; text: string } => item !== null);

  if (promptsToRun.length === 0) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        "Çalıştırılacak prompt metni bulunamadı."
      )}`,
      request.url
    );
  }

  await supabase
    .from("audits")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", audit.id);

  await supabase
    .from("audit_runs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .in(
      "id",
      promptsToRun.map((prompt) => prompt.runId)
    );

  for (const prompt of promptsToRun) {
    try {
      const result = await askGemini(prompt.text);

      await supabase
        .from("audit_runs")
        .update({
          status: "completed",
          raw_answer: result.answer,
          raw_response_json: result.rawResponse,
          citations_json: result.citations,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", prompt.runId);
    } catch (error) {
      const message = getGeminiErrorMessage(error);

      await supabase
        .from("audit_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: null,
        })
        .eq("id", prompt.runId);
    }
  }

  const { count: totalCompleted } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "completed");

  const { count: totalPending } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "pending");

  const { count: totalFailed } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "failed");

  const pendingCount = totalPending ?? 0;
  const failedCount = totalFailed ?? 0;
  const completedCount = totalCompleted ?? 0;

  const nextStatus =
    failedCount > 0
      ? "failed"
      : pendingCount > 0
        ? "running"
        : "completed";

  await supabase
    .from("audits")
    .update({
      status: nextStatus,
      completed_prompts: completedCount,
      completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
      error_message:
        failedCount > 0
          ? `${failedCount} prompt çalıştırılırken hata aldı. Detay için başarısız kayıtları kontrol et.`
          : pendingCount > 0
            ? `${pendingCount} prompt henüz çalıştırılmadı. Audit'i tekrar çalıştır.`
            : null,
    })
    .eq("id", audit.id);

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}