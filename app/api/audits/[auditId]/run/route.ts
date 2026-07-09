import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
    auditId: string;
  }>;
};

function redirectTo(path: string, requestUrl: string) {
  return NextResponse.redirect(new URL(path, requestUrl), {
    status: 303,
  });
}

async function askGemini(promptText: string) {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";

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
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  const data = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? "Gemini API isteği başarısız oldu.");
  }

  const outputText = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!outputText) {
    throw new Error(
      `Gemini boş cevap döndürdü. Finish reason: ${
        data.candidates?.[0]?.finishReason ?? "bilinmiyor"
      }`
    );
  }

  return outputText;
}

function buildAuditPrompt(args: {
  userPrompt: string;
  brandName: string;
  brandAliases: string[];
  competitors: string[];
}) {
  const brandAliasesText =
    args.brandAliases.length > 0 ? args.brandAliases.join(", ") : "Yok";

  const competitorsText =
    args.competitors.length > 0 ? args.competitors.join(", ") : "Yok";

  return `
Sen normal bir AI arama/asistan kullanıcısına cevap veren asistansın.

Kullanıcının sorusuna doğal, tarafsız ve faydalı cevap ver.

Önemli:
- Cevabı özellikle markayı öne çıkarmak için manipüle etme.
- Eğer marka gerçekten alakalıysa cevaba dahil edebilirsin.
- Eğer rakipler alakalıysa onları da dahil edebilirsin.
- Cevap Türkçe olsun.
- Çok uzun yazma; net, kullanışlı ve gerçekçi cevap ver.

Takip edilen marka:
${args.brandName}

Marka aliasları:
${brandAliasesText}

Bilinen rakipler:
${competitorsText}

Kullanıcı sorusu:
${args.userPrompt}
`;
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

  const { data: aliases } = await supabase
    .from("brand_aliases")
    .select("alias")
    .eq("brand_id", brand.id);

  const { data: competitors } = await supabase
    .from("competitors")
    .select("name")
    .eq("brand_id", brand.id);

  const { data: pendingRuns, error: runsError } = await supabase
    .from("audit_runs")
    .select("id, prompt_id")
    .eq("audit_id", audit.id)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: true })
    .limit(3);

  if (runsError) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        runsError.message
      )}`,
      request.url
    );
  }

  if (!pendingRuns || pendingRuns.length === 0) {
    return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
  }

  const promptIds = pendingRuns.map((run) => run.prompt_id);

  const { data: prompts, error: promptsError } = await supabase
    .from("prompts")
    .select("id, text")
    .in("id", promptIds);

  if (promptsError || !prompts) {
    return redirectTo(
      `/dashboard/audits/${audit.id}?error=${encodeURIComponent(
        promptsError?.message ?? "Promptlar okunamadı."
      )}`,
      request.url
    );
  }

  const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));

  await supabase
    .from("audits")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", audit.id);

  let completedCount = 0;
  let failedCount = 0;

  for (const run of pendingRuns) {
    const prompt = promptById.get(run.prompt_id);

    if (!prompt) {
      failedCount += 1;

      await supabase
        .from("audit_runs")
        .update({
          status: "failed",
          error_message: "Prompt bulunamadı.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      continue;
    }

    await supabase
      .from("audit_runs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", run.id);

    try {
      const answer = await askGemini(
        buildAuditPrompt({
          userPrompt: prompt.text,
          brandName: brand.name,
          brandAliases: (aliases ?? []).map((item) => item.alias),
          competitors: (competitors ?? []).map((item) => item.name),
        })
      );

      completedCount += 1;

      await supabase
        .from("audit_runs")
        .update({
          status: "completed",
          raw_answer: answer,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", run.id);
    } catch (error) {
      failedCount += 1;

      const message =
        error instanceof Error
          ? error.message
          : "Gemini cevabı alınamadı.";

      await supabase
        .from("audit_runs")
        .update({
          status: "failed",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
  }

  const { count: totalCompleted } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "completed");

  const { count: totalFailed } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "failed");

  const { count: totalPending } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "pending");

  const nextStatus =
    totalPending && totalPending > 0
      ? "running"
      : totalFailed && totalFailed > 0
        ? "failed"
        : "completed";

  await supabase
    .from("audits")
    .update({
      status: nextStatus,
      completed_prompts: totalCompleted ?? completedCount,
      completed_at:
        nextStatus === "completed" || nextStatus === "failed"
          ? new Date().toISOString()
          : null,
      error_message:
        failedCount > 0
          ? `${failedCount} prompt çalıştırılamadı. Detaylar run kayıtlarında.`
          : null,
    })
    .eq("id", audit.id);

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}