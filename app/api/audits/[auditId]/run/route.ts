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

type GeminiBatchAnswer = {
  runId: string;
  answer: string;
};

type GeminiBatchResponse = {
  answers: GeminiBatchAnswer[];
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

function buildBatchPrompt(args: {
  brandName: string;
  brandAliases: string[];
  competitors: string[];
  prompts: Array<{
    runId: string;
    text: string;
  }>;
}) {
  const aliases =
    args.brandAliases.length > 0 ? args.brandAliases.join(", ") : "Yok";

  const competitors =
    args.competitors.length > 0 ? args.competitors.join(", ") : "Yok";

  const promptList = args.prompts
    .map(
      (prompt, index) => `
${index + 1}. runId: ${prompt.runId}
Soru: ${prompt.text}`
    )
    .join("\n");

  return `
Sen normal bir AI arama/asistan kullanıcısına cevap veren asistansın.

Aşağıdaki kullanıcı sorularına ayrı ayrı cevap ver.

Kurallar:
- Cevaplar Türkçe olsun.
- Her cevap en fazla 4 cümle olsun.
- Markayı zorla öne çıkarma.
- Eğer takip edilen marka gerçekten alakalıysa cevaba dahil et.
- Rakipler alakalıysa onları da dahil edebilirsin.
- Sadece JSON döndür. Açıklama yazma.

Takip edilen marka:
${args.brandName}

Marka aliasları:
${aliases}

Bilinen rakipler:
${competitors}

Sorular:
${promptList}

Cevap formatı kesinlikle şöyle olmalı:

{
  "answers": [
    {
      "runId": "audit_run_id",
      "answer": "Bu soruya verilen cevap"
    }
  ]
}
`;
}

async function askGeminiBatch(args: {
  brandName: string;
  brandAliases: string[];
  competitors: string[];
  prompts: Array<{
    runId: string;
    text: string;
  }>;
}) {
  const model = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

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
                text: buildBatchPrompt(args),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1400,
          response_mime_type: "application/json",
          response_schema: {
            type: "OBJECT",
            properties: {
              answers: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    runId: {
                      type: "STRING",
                    },
                    answer: {
                      type: "STRING",
                    },
                  },
                  required: ["runId", "answer"],
                  propertyOrdering: ["runId", "answer"],
                },
              },
            },
            required: ["answers"],
            propertyOrdering: ["answers"],
          },
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

  const parsed = JSON.parse(outputText) as GeminiBatchResponse;

  if (!parsed.answers || !Array.isArray(parsed.answers)) {
    throw new Error("Gemini cevabı beklenen answers formatında değil.");
  }

  return parsed.answers;
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

  const { data: runs, error: runsError } = await supabase
    .from("audit_runs")
    .select(
      `
      id,
      prompt_id,
      prompts (
        id,
        text
      )
    `
    )
    .eq("audit_id", audit.id)
    .in("status", ["pending", "running", "failed"])
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

  if (!runs || runs.length === 0) {
    return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
  }

  const promptsToRun = runs
    .map((run) => {
      const prompt = Array.isArray(run.prompts)
        ? run.prompts[0]
        : run.prompts;

      if (!prompt?.text) {
        return null;
      }

      return {
        runId: run.id,
        text: prompt.text,
      };
    })
    .filter(
      (
        item
      ): item is {
        runId: string;
        text: string;
      } => item !== null
    );

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

  try {
    const answers = await askGeminiBatch({
      brandName: brand.name,
      brandAliases: (aliases ?? []).map((item) => item.alias),
      competitors: (competitors ?? []).map((item) => item.name),
      prompts: promptsToRun,
    });

    const answerByRunId = new Map(
      answers.map((answer) => [answer.runId, answer.answer])
    );

    for (const prompt of promptsToRun) {
      const answer = answerByRunId.get(prompt.runId);

      if (!answer) {
        await supabase
          .from("audit_runs")
          .update({
            status: "pending",
            error_message: "Gemini bu prompt için cevap döndürmedi.",
          })
          .eq("id", prompt.runId);

        continue;
      }

      await supabase
        .from("audit_runs")
        .update({
          status: "completed",
          raw_answer: answer,
          completed_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", prompt.runId);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gemini cevabı alınamadı.";

    await supabase
      .from("audit_runs")
      .update({
        status: "pending",
        error_message: message,
        completed_at: null,
      })
      .in(
        "id",
        promptsToRun.map((prompt) => prompt.runId)
      );

    await supabase
      .from("audits")
      .update({
        status: "running",
        error_message: `Gemini cevap veremedi: ${message}`,
      })
      .eq("id", audit.id);

    return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
  }

  const { count: totalCompleted } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .eq("status", "completed");

  const { count: totalRemaining } = await supabase
    .from("audit_runs")
    .select("id", { count: "exact", head: true })
    .eq("audit_id", audit.id)
    .in("status", ["pending", "running", "failed"]);

  await supabase
    .from("audits")
    .update({
      status: totalRemaining && totalRemaining > 0 ? "running" : "completed",
      completed_prompts: totalCompleted ?? 0,
      completed_at:
        totalRemaining && totalRemaining > 0 ? null : new Date().toISOString(),
      error_message:
        totalRemaining && totalRemaining > 0
          ? `${totalRemaining} prompt henüz çalıştırılmadı. Audit'i tekrar çalıştır.`
          : null,
    })
    .eq("id", audit.id);

  return redirectTo(`/dashboard/audits/${audit.id}`, request.url);
}